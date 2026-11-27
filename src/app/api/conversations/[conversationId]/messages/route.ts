
import mongoose from "mongoose";
import { pusher } from "@/backend/lib/pusher";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import Conversation from "@/backend/models/conversation";
import Message from "@/backend/models/message";
import "@/backend/models/user";

import type { AttachmentType } from "@/types/message";

type RouteContext = {
    params: Promise<{
        conversationId: string;
    }>;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

type MessageContentType = "text" | "image" | "video" | "file";

const MAX_CONTENT_LENGTH = 5000;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_NAME_LENGTH = 255;

function createApiError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode });
}

// Shared population for sender and replied-to message.
const populateMessage = [
    {
        path: "senderId",
        select: "_id username imageUrl",
    },
    {
        path: "replyTo",
        select: "_id senderId messageType content attachments createdAt",
        populate: {
            path: "senderId",
            select: "_id username imageUrl",
        },
    },
];

// --------------------------------------------------
// GET: Fetch conversation messages
// --------------------------------------------------

export const GET = withErrorHandler(
    async (req: NextRequest, { params }: RouteContext) => {
        const { userId } = await getAuthUser();

        if (!mongoose.isValidObjectId(userId)) {
            return NextResponse.json(
                { success: false, message: "Invalid authenticated user." },
                { status: 401 }
            );
        }

        const { conversationId } = await params;

        if (!mongoose.isValidObjectId(conversationId)) {
            return NextResponse.json(
                { success: false, message: "Invalid conversation ID." },
                { status: 400 }
            );
        }

        const searchParams = req.nextUrl.searchParams;

        const beforeParam = searchParams.get("before");
        const aroundParam = searchParams.get("around");
        const afterParam = searchParams.get("after");
        const latestParam = searchParams.get("latest");
        const limitParam = searchParams.get("limit");

        let limit = DEFAULT_LIMIT;

        if (limitParam !== null) {
            limit = Number(limitParam);

            if (
                !Number.isInteger(limit) ||
                limit < 1 ||
                limit > MAX_LIMIT
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Limit must be between 1 and ${MAX_LIMIT}.`,
                    },
                    { status: 400 }
                );
            }
        }

        const parseCursor = (
            value: string | null,
            allowZero = false
        ) => {
            if (value === null) return undefined;

            const parsed = Number(value);

            if (
                !Number.isSafeInteger(parsed) ||
                parsed < (allowZero ? 0 : 1)
            ) {
                throw Object.assign(
                    new Error("Invalid message cursor."),
                    { statusCode: 400 }
                );
            }

            return parsed;
        };

        let before: number | undefined;
        let around: number | undefined;
        let after: number | undefined;

        try {
            before = parseCursor(beforeParam);
            around = parseCursor(aroundParam, true);
            after = parseCursor(afterParam);
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : "Invalid cursor.",
                },
                { status: 400 }
            );
        }

        const latest = latestParam === "true";

        const suppliedModes = [
            before !== undefined,
            around !== undefined,
            after !== undefined,
            latest,
        ].filter(Boolean).length;

        if (suppliedModes > 1) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Use only one pagination mode.",
                },
                { status: 400 }
            );
        }

        await Connect();

        const conversationExists = await Conversation.exists({
            _id: conversationId,
            participants: userId,
        });

        if (!conversationExists) {
            return NextResponse.json(
                { success: false, message: "Conversation not found." },
                { status: 404 }
            );
        }

        // Exclude messages deleted for the authenticated user.
        const baseQuery = {
            conversationId,
            "deletedFor.userId": {
                $ne: new mongoose.Types.ObjectId(userId),
            },
        };

        let messages = [];
        let nextCursor: number | null = null;
        let hasMore = false;
        let newerCursor: number | null = null;
        let hasNewer = false;

        if (around !== undefined) {
            const olderLimit = Math.floor(limit / 2);
            const newerLimit = limit - olderLimit;

            const [olderResults, newerResults] = await Promise.all([
                Message.find({
                    ...baseQuery,
                    sequence: { $lte: around },
                })
                    .sort({ sequence: -1 })
                    .limit(olderLimit + 1)
                    .populate(populateMessage)
                    .lean(),

                Message.find({
                    ...baseQuery,
                    sequence: { $gt: around },
                })
                    .sort({ sequence: 1 })
                    .limit(newerLimit + 1)
                    .populate(populateMessage)
                    .lean(),
            ]);

            hasMore = olderResults.length > olderLimit;
            hasNewer = newerResults.length > newerLimit;

            const olderMessages = olderResults.slice(0, olderLimit);
            const newerMessages = newerResults.slice(0, newerLimit);

            messages = [
                ...olderMessages,
                ...newerMessages,
            ].sort((a, b) => a.sequence - b.sequence);

            nextCursor =
                hasMore && messages.length > 0
                    ? messages[0].sequence
                    : null;

            newerCursor =
                hasNewer && messages.length > 0
                    ? messages[messages.length - 1].sequence
                    : null;

        } else if (after !== undefined) {
            const results = await Message.find({
                ...baseQuery,
                sequence: { $gt: after },
            })
                .sort({ sequence: 1 })
                .limit(limit + 1)
                .populate(populateMessage)
                .lean();

            hasNewer = results.length > limit;
            messages = results.slice(0, limit);

            newerCursor =
                hasNewer && messages.length > 0
                    ? messages[messages.length - 1].sequence
                    : null;

        } else {
            const query =
                before !== undefined
                    ? {
                        ...baseQuery,
                        sequence: { $lt: before },
                    }
                    : baseQuery;

            const results = await Message.find(query)
                .sort({ sequence: -1 })
                .limit(limit + 1)
                .populate(populateMessage)
                .lean();

            hasMore = results.length > limit;
            messages = results.slice(0, limit).reverse();

            nextCursor =
                hasMore && messages.length > 0
                    ? messages[0].sequence
                    : null;
        }

        return NextResponse.json(
            {
                success: true,
                messages,
                nextCursor,
                hasMore,
                newerCursor,
                hasNewer,
            },
            { status: 200 }
        );
    }
);

// --------------------------------------------------
// POST: Send a new message or reply
// --------------------------------------------------

function validateMessageBody(body: unknown): {
    messageType: MessageContentType;
    content: string | null;
    attachments: AttachmentType[];
    replyTo: string | null;
} {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw createApiError("Invalid request body.", 400);
    }

    const data = body as Record<string, unknown>;

    const allowedTypes: MessageContentType[] = [
        "text",
        "image",
        "video",
        "file",
    ];

    if (
        typeof data.messageType !== "string" ||
        !allowedTypes.includes(data.messageType as MessageContentType)
    ) {
        throw createApiError("Invalid message type.", 400);
    }

    const messageType = data.messageType as MessageContentType;

    // Validate content.
    let content: string | null = null;

    if (data.content !== undefined && data.content !== null) {
        if (typeof data.content !== "string") {
            throw createApiError(
                "Message content must be a string.",
                400
            );
        }

        content = data.content.trim();

        if (content.length > MAX_CONTENT_LENGTH) {
            throw createApiError(
                `Message content cannot exceed ${MAX_CONTENT_LENGTH} characters.`,
                400
            );
        }

        if (!content) {
            content = null;
        }
    }

    // Validate reply reference.
    let replyTo: string | null = null;

    if (data.replyTo !== undefined && data.replyTo !== null) {
        if (
            typeof data.replyTo !== "string" ||
            !mongoose.isValidObjectId(data.replyTo)
        ) {
            throw createApiError("Invalid reply message ID.", 400);
        }

        replyTo = data.replyTo;
    }

    // Validate attachments.
    const rawAttachments = data.attachments ?? [];

    if (!Array.isArray(rawAttachments)) {
        throw createApiError(
            "Attachments must be an array.",
            400
        );
    }

    if (rawAttachments.length > MAX_ATTACHMENTS) {
        throw createApiError(
            `A message cannot contain more than ${MAX_ATTACHMENTS} attachments.`,
            400
        );
    }

    const attachments: AttachmentType[] = rawAttachments.map(
        (item: unknown) => {
            if (
                !item ||
                typeof item !== "object" ||
                Array.isArray(item)
            ) {
                throw createApiError("Invalid attachment data.", 400);
            }

            const attachment = item as Record<string, unknown>;

            const allowedMediaTypes = ["image", "video", "file"];

            if (
                typeof attachment.mediaType !== "string" ||
                !allowedMediaTypes.includes(attachment.mediaType)
            ) {
                throw createApiError(
                    "Invalid attachment media type.",
                    400
                );
            }

            if (typeof attachment.url !== "string") {
                throw createApiError(
                    "Invalid attachment URL.",
                    400
                );
            }

            let parsedUrl: URL;

            try {
                parsedUrl = new URL(attachment.url);
            } catch {
                throw createApiError(
                    "Invalid attachment URL.",
                    400
                );
            }

            if (parsedUrl.protocol !== "https:") {
                throw createApiError(
                    "Only HTTPS attachment URLs are allowed.",
                    400
                );
            }

            if (
                typeof attachment.size !== "number" ||
                !Number.isFinite(attachment.size) ||
                attachment.size < 0
            ) {
                throw createApiError(
                    "Invalid attachment size.",
                    400
                );
            }

            let name: string | null = null;

            if (
                attachment.name !== undefined &&
                attachment.name !== null
            ) {
                if (typeof attachment.name !== "string") {
                    throw createApiError(
                        "Invalid attachment name.",
                        400
                    );
                }

                name = attachment.name.trim() || null;

                if (name && name.length > MAX_ATTACHMENT_NAME_LENGTH) {
                    throw createApiError(
                        "Attachment name is too long.",
                        400
                    );
                }
            }

            return {
                url: attachment.url,
                mediaType: attachment.mediaType as AttachmentType["mediaType"],
                size: attachment.size,
                name,
            };
        }
    );

    // Validate message type against content and attachments.
    if (messageType === "text") {
        if (!content) {
            throw createApiError(
                "Text message cannot be empty.",
                400
            );
        }

        if (attachments.length > 0) {
            throw createApiError(
                "Text messages cannot contain attachments.",
                400
            );
        }
    } else {
        if (attachments.length === 0) {
            throw createApiError(
                "Media messages must contain at least one attachment.",
                400
            );
        }

        const hasInvalidAttachment = attachments.some(
            (attachment) => attachment.mediaType !== messageType
        );

        if (hasInvalidAttachment) {
            throw createApiError(
                "Attachment type must match the message type.",
                400
            );
        }
    }

    return {
        messageType,
        content,
        attachments,
        replyTo,
    };
}

export const POST = withErrorHandler(
    async (req: NextRequest, { params }: RouteContext) => {
        // 1. Authenticate the sender.
        const { userId } = await getAuthUser();

        if (!mongoose.isValidObjectId(userId)) {
            throw createApiError(
                "Invalid authenticated user.",
                401
            );
        }

        // 2. Validate conversation ID.
        const { conversationId } = await params;

        if (!mongoose.isValidObjectId(conversationId)) {
            throw createApiError(
                "Invalid conversation ID.",
                400
            );
        }

        // 3. Parse and validate request body.
        let body: unknown;

        try {
            body = await req.json();
        } catch {
            throw createApiError(
                "Invalid JSON request body.",
                400
            );
        }

        const {
            messageType,
            content,
            attachments,
            replyTo,
        } = validateMessageBody(body);

        // 4. Connect to MongoDB.
        await Connect();

        // 5. Start MongoDB transaction.
        const session = await mongoose.startSession();

        let createdMessageId: mongoose.Types.ObjectId | null = null;
        let recipientUserId: string | null = null;

        try {
            await session.withTransaction(async () => {
                // 6. Verify membership and atomically allocate sequence.
                const conversation = await Conversation.findOneAndUpdate(
                    {
                        _id: conversationId,
                        participants: userId,
                    },
                    {
                        $inc: {
                            lastMessageSeq: 1,
                        },
                    },
                    {
                        new: true,
                        session,
                        runValidators: true,
                    }
                ).select("_id participants lastMessageSeq");

                if (!conversation) {
                    throw createApiError(
                        "Conversation not found.",
                        404
                    );
                }

                // 7. Find recipient.
                const recipientId = conversation.participants.find(
                    (participantId: mongoose.Types.ObjectId) =>
                        participantId.toString() !== userId
                );

                if (!recipientId) {
                    throw createApiError(
                        "Conversation recipient not found.",
                        404
                    );
                }

                recipientUserId = recipientId.toString();

                // 8. Validate original message if this is a reply.
                if (replyTo) {
                    const originalMessage = await Message.findOne({
                        _id: replyTo,
                        conversationId: conversation._id,
                        deletedForEveryoneAt: null,
                    })
                        .select("_id")
                        .session(session);

                    if (!originalMessage) {
                        throw createApiError(
                            "Original message not found or is no longer available.",
                            404
                        );
                    }
                }

                // 9. Create message.
                const newMessage = new Message({
                    conversationId: conversation._id,
                    senderId: new mongoose.Types.ObjectId(userId),
                    sequence: conversation.lastMessageSeq,
                    messageType,
                    content,
                    attachments,
                    replyTo: replyTo
                        ? new mongoose.Types.ObjectId(replyTo)
                        : null,
                });

                await newMessage.save({ session });

                // 10. Update conversation metadata and recipient unread count.
                const updateResult = await Conversation.updateOne(
                    {
                        _id: conversation._id,
                        participants: userId,
                    },
                    {
                        $set: {
                            lastMessageId: newMessage._id,
                            lastMessageAt: newMessage.createdAt,
                        },
                        $inc: {
                            "memberStates.$[recipient].unreadCount": 1,
                        },
                    },
                    {
                        session,
                        arrayFilters: [
                            {
                                "recipient.userId": recipientId,
                            },
                        ],
                    }
                );

                if (updateResult.modifiedCount !== 1) {
                    throw new Error(
                        "Failed to update conversation metadata."
                    );
                }

                // Save ID for retrieval after transaction commits.
                createdMessageId = newMessage._id;
            });
        } finally {
            await session.endSession();
        }

        // 11. Retrieve created message with populated sender and reply.
        if (!createdMessageId) {
            throw new Error("Message creation failed.");
        }

        const sentMessage = await Message.findById(createdMessageId)
            .populate(populateMessage)
            .lean();

        if (!sentMessage) {
            throw new Error(
                "Created message could not be retrieved."
            );
        }

        // 12. Validate recipient ID.
        if (!recipientUserId) {
            throw new Error(
                "Conversation recipient could not be identified."
            );
        }

        // 13. Get recipient's updated unread count.
        const updatedConversation = await Conversation.findById(conversationId)
            .select("memberStates")
            .lean();

        const recipientState = updatedConversation?.memberStates.find(
            (state) => state.userId.toString() === recipientUserId
        );

        const recipientUnreadCount = recipientState?.unreadCount ?? 0;

        // 14. Publish real-time events after transaction commits.
        const conversationChannel =
            `private-conversation-${conversationId}`;

        const recipientChannel =
            `private-user-${recipientUserId}`;

        const realtimePayload = {
            conversationId,
            message: sentMessage,
        };

        const pusherResults = await Promise.allSettled([
            pusher.trigger(
                conversationChannel,
                "new-message",
                realtimePayload
            ),

            pusher.trigger(
                recipientChannel,
                "new-message-notification",
                {
                    ...realtimePayload,
                    unreadCount: recipientUnreadCount,
                }
            ),
        ]);

        pusherResults.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error(
                    `Pusher event ${
                        index === 0
                            ? "new-message"
                            : "new-message-notification"
                    } failed:`,
                    result.reason
                );
            }
        });

        // 15. Return created message.
        return NextResponse.json(
            {
                success: true,
                message: "Message sent successfully.",
                sentMessage,
            },
            { status: 201 }
        );
    }
);
