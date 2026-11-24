import mongoose from "mongoose";
import { pusher } from "@/backend/lib/pusher";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import Conversation from "@/backend/models/conversation";
import Message from "@/backend/models/message";
import "@/backend/models/user";
import { AttachmentType } from "@/types/message";

type RouteContext = {
    params: Promise<{
        conversationId: string;
    }>;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

export const GET = withErrorHandler(
    async (req: NextRequest, { params }: RouteContext) => {
        // 1. Authenticate the current user
        const { userId } = await getAuthUser();

        if (!mongoose.isValidObjectId(userId)) {
            return NextResponse.json(
                { success: false, message: "Invalid authenticated user." },
                { status: 401 }
            );
        }

        // 2. Get and validate the conversation ID
        const { conversationId } = await params;

        if (!mongoose.isValidObjectId(conversationId)) {
            return NextResponse.json(
                { success: false, message: "Invalid conversation ID." },
                { status: 400 }
            );
        }

        // 3. Read and validate pagination parameters
        const beforeParam = req.nextUrl.searchParams.get("before");
        const limitParam = req.nextUrl.searchParams.get("limit");

        let before: number | undefined;
        let limit = DEFAULT_LIMIT;

        if (beforeParam !== null) {
            before = Number(beforeParam);

            if (!Number.isSafeInteger(before) || before < 1) {
                return NextResponse.json(
                    { success: false, message: "Invalid message cursor." },
                    { status: 400 }
                );
            }
        }

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

        // 4. Connect to the database
        await Connect();

        // 5. Verify that the current user belongs to this conversation
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

        // 6. Build the message query
        const messageQuery: {
            conversationId: string;
            sequence?: { $lt: number };
        } = {
            conversationId,
        };

        // Fetch only messages older than the cursor when provided
        if (before !== undefined) {
            messageQuery.sequence = { $lt: before };
        }

        // 7. Fetch one extra message to determine whether more exist
        const fetchedMessages = await Message.find(messageQuery)
            .sort({ sequence: -1 })
            .limit(limit + 1)
            .populate("senderId", "_id username imageUrl")
            .lean();

        const hasMore = fetchedMessages.length > limit;

        // Remove the extra message used for pagination detection
        const pageMessages = fetchedMessages.slice(0, limit);

        // 8. Reverse to chronological order (oldest -> newest)
        pageMessages.reverse();

        // 9. Cursor for fetching the next batch of older messages
        const nextCursor =
            hasMore && pageMessages.length > 0
                ? pageMessages[0].sequence
                : null;

        // 10. Return the result
        return NextResponse.json(
            {
                success: true,
                messages: pageMessages,
                nextCursor,
                hasMore,
            },
            { status: 200 }
        );
    }
);



type MessageType = "text" | "image" | "video" | "file";


const MAX_CONTENT_LENGTH = 5000;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_NAME_LENGTH = 255;

function createApiError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode });
}

function validateMessageBody(body: unknown): {
    messageType: MessageType;
    content: string | null;
    attachments: AttachmentType[];
} {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw createApiError("Invalid request body.", 400);
    }

    const data = body as Record<string, unknown>;

    const allowedTypes: MessageType[] = [
        "text",
        "image",
        "video",
        "file",
    ];

    if (
        typeof data.messageType !== "string" ||
        !allowedTypes.includes(data.messageType as MessageType)
    ) {
        throw createApiError("Invalid message type.", 400);
    }

    const messageType = data.messageType as MessageType;

    // Validate content
    let content: string | null = null;

    if (data.content !== undefined && data.content !== null) {
        if (typeof data.content !== "string") {
            throw createApiError("Message content must be a string.", 400);
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

    // Validate attachments
    const rawAttachments = data.attachments ?? [];

    if (!Array.isArray(rawAttachments)) {
        throw createApiError("Attachments must be an array.", 400);
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
                throw createApiError("Invalid attachment media type.", 400);
            }

            if (typeof attachment.url !== "string") {
                throw createApiError("Invalid attachment URL.", 400);
            }

            let parsedUrl: URL;

            try {
                parsedUrl = new URL(attachment.url);
            } catch {
                throw createApiError("Invalid attachment URL.", 400);
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
                throw createApiError("Invalid attachment size.", 400);
            }

            let name: string | null = null;

            if (attachment.name !== undefined && attachment.name !== null) {
                if (typeof attachment.name !== "string") {
                    throw createApiError("Invalid attachment name.", 400);
                }

                name = attachment.name.trim() || null;

                if (name && name.length > MAX_ATTACHMENT_NAME_LENGTH) {
                    throw createApiError("Attachment name is too long.", 400);
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

    // Validate message type against content and attachments
    if (messageType === "text") {
        if (!content) {
            throw createApiError("Text message cannot be empty.", 400);
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
    };
}

export const POST = withErrorHandler(
    async (req: NextRequest, { params }: RouteContext) => {
        // 1. Authenticate the sender
        const { userId } = await getAuthUser();

        if (!mongoose.isValidObjectId(userId)) {
            throw createApiError("Invalid authenticated user.", 401);
        }

        // 2. Validate conversation ID
        const { conversationId } = await params;

        if (!mongoose.isValidObjectId(conversationId)) {
            throw createApiError("Invalid conversation ID.", 400);
        }

        // 3. Parse and validate request body
        let body: unknown;


        try {
            body = await req.json();
        } catch {
            throw createApiError("Invalid JSON request body.", 400);
        }

        const { messageType, content, attachments } =
            validateMessageBody(body);

        // 4. Connect to MongoDB
        await Connect();

        // 5. Start a MongoDB transaction
        const session = await mongoose.startSession();

        let createdMessageId: mongoose.Types.ObjectId | null = null;
        let recipientUserId: string | null = null;
        try {
            await session.withTransaction(async () => {
                // 6. Verify membership and atomically allocate sequence
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
                    throw createApiError("Conversation not found.", 404);
                }

                // 7. Find the recipient
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

                // 8. Create the message
                const newMessage = new Message({
                    conversationId: conversation._id,
                    senderId: new mongoose.Types.ObjectId(userId),
                    sequence: conversation.lastMessageSeq,
                    messageType,
                    content,
                    attachments,
                });

                await newMessage.save({ session });

                // 9. Update conversation metadata and recipient unread count
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

                // Save the ID for retrieving the populated message after commit
                createdMessageId = newMessage._id;
            });
        } finally {
            await session.endSession();
        }

        // 10. Retrieve the created message with populated sender
        if (!createdMessageId) {
            throw new Error("Message creation failed.");
        }

        const sentMessage = await Message.findById(createdMessageId)
            .populate("senderId", "_id username imageUrl")
            .lean();

        if (!sentMessage) {
            throw new Error("Created message could not be retrieved.");
        }

        // 11. Validate recipient ID
        if (!recipientUserId) {
            throw new Error("Conversation recipient could not be identified.");
        }

        // 12. Get the recipient's updated unread count
        const updatedConversation = await Conversation.findById(conversationId)
            .select("memberStates")
            .lean();

        const recipientState = updatedConversation?.memberStates.find(
            (state) => state.userId.toString() === recipientUserId
        );

        const recipientUnreadCount = recipientState?.unreadCount ?? 0;

        // 13. Publish real-time events after the transaction commits
        const conversationChannel = `private-conversation-${conversationId}`;
        const recipientChannel = `private-user-${recipientUserId}`;

        const realtimePayload = {
            conversationId,
            message: sentMessage,
        };

        // Publish to both channels.
        // Pusher errors must not turn a successfully saved message into an API failure.
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
                    `Pusher event ${index === 0 ? "new-message" : "new-message-notification"} failed:`,
                    result.reason
                );
            }
        });

        // 14. Return the created message
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
