
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { pusher } from "@/backend/lib/pusher";

import Conversation from "@/backend/models/conversation";
import Message from "@/backend/models/message";

type RouteContext = {
    params: Promise<{
        conversationId: string;
    }>;
};

type DeleteMode = "me" | "everyone";

const MAX_MESSAGES_PER_REQUEST = 100;

function createApiError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode });
}

function validateBody(body: unknown): {
    messageIds: string[];
    mode: DeleteMode;
} {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw createApiError("Invalid request body.", 400);
    }

    const data = body as Record<string, unknown>;

    if (!Array.isArray(data.messageIds) || data.messageIds.length === 0) {
        throw createApiError("Select at least one message.", 400);
    }

    if (data.messageIds.length > MAX_MESSAGES_PER_REQUEST) {
        throw createApiError(
            `You can delete at most ${MAX_MESSAGES_PER_REQUEST} messages at once.`,
            400
        );
    }

    const messageIds = data.messageIds;

    if (
        !messageIds.every(
            (id) => typeof id === "string" && mongoose.isValidObjectId(id)
        )
    ) {
        throw createApiError("One or more message IDs are invalid.", 400);
    }

    const uniqueMessageIds = [...new Set(messageIds)];

    if (uniqueMessageIds.length !== messageIds.length) {
        throw createApiError("Duplicate message IDs are not allowed.", 400);
    }

    if (data.mode !== "me" && data.mode !== "everyone") {
        throw createApiError("Invalid deletion mode.", 400);
    }

    return {
        messageIds,
        mode: data.mode,
    };
}

export const POST = withErrorHandler(
    async (req: NextRequest, { params }: RouteContext) => {
        // 1. Authenticate user
        const { userId } = await getAuthUser();

        if (!mongoose.isValidObjectId(userId)) {
            throw createApiError("Invalid authenticated user.", 401);
        }

        // 2. Validate conversation ID
        const { conversationId } = await params;

        if (!mongoose.isValidObjectId(conversationId)) {
            throw createApiError("Invalid conversation ID.", 400);
        }

        // 3. Parse request body
        let body: unknown;

        try {
            body = await req.json();
        } catch {
            throw createApiError("Invalid JSON request body.", 400);
        }

        const { messageIds, mode } = validateBody(body);

        // 4. Connect database
        await Connect();

        const session = await mongoose.startSession();

        let deletedMessageIds: string[] = [];

        try {
            await session.withTransaction(async () => {
                // 5. Verify conversation membership
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: userId,
                })
                    .select("_id participants")
                    .session(session)
                    .lean();

                if (!conversation) {
                    throw createApiError("Conversation not found.", 404);
                }

                const objectIds = messageIds.map(
                    (id) => new mongoose.Types.ObjectId(id)
                );

                // 6. Find selected messages belonging to this conversation
                const messages = await Message.find({
                    _id: { $in: objectIds },
                    conversationId,
                    deletedForEveryone: { $ne: true },
                })
                    .select("_id senderId")
                    .session(session)
                    .lean();

                if (messages.length !== messageIds.length) {
                    throw createApiError(
                        "Some selected messages are unavailable or already deleted.",
                        404
                    );
                }

                // 7. Validate ownership for Delete for everyone
                if (mode === "everyone") {
                    const hasUnauthorizedMessage = messages.some(
                        (message) =>
                            message.senderId.toString() !== userId
                    );

                    if (hasUnauthorizedMessage) {
                        throw createApiError(
                            "You can only delete your own messages for everyone.",
                            403
                        );
                    }
                }

                // 8. Perform deletion
                if (mode === "me") {
                    await Message.updateMany(
                        {
                            _id: { $in: objectIds },
                            conversationId,
                            deletedFor: { $ne: userId },
                            deletedForEveryone: { $ne: true },
                        },
                        {
                            $addToSet: {
                                deletedFor: new mongoose.Types.ObjectId(userId),
                            },
                        },
                        { session }
                    );
                } else {
                    await Message.updateMany(
                        {
                            _id: { $in: objectIds },
                            conversationId,
                            senderId: new mongoose.Types.ObjectId(userId),
                            deletedForEveryone: { $ne: true },
                        },
                        {
                            $set: {
                                deletedForEveryone: true,
                                deletedAt: new Date(),
                                content: null,
                                attachments: [],
                            },
                        },
                        { session }
                    );
                }

                deletedMessageIds = messageIds;
            });
        } finally {
            await session.endSession();
        }

        // 9. Publish deletion event after transaction commits
        const conversationChannel =
            `private-conversation-${conversationId}`;

        const recipientId = (await Conversation.findById(conversationId)
            .select("participants")
            .lean())?.participants.find(
                (participant) => participant.toString() !== userId
            )?.toString();

        const eventName =
            mode === "everyone"
                ? "messages-deleted-for-everyone"
                : "messages-deleted-for-me";

        const payload = {
            conversationId,
            messageIds: deletedMessageIds,
            mode,
            deletedBy: userId,
        };

        const events: Promise<unknown>[] = [
            pusher.trigger(
                conversationChannel,
                eventName,
                payload
            ),
        ];

        // Delete-for-me only affects the current user's chat.
        // Delete-for-everyone must notify the other participant too.
        if (mode === "everyone" && recipientId) {
            events.push(
                pusher.trigger(
                    `private-user-${recipientId}`,
                    eventName,
                    payload
                )
            );
        }

        const results = await Promise.allSettled(events);

        results.forEach((result) => {
            if (result.status === "rejected") {
                console.error(
                    "Message deletion Pusher event failed:",
                    result.reason
                );
            }
        });

        // 10. Return response
        return NextResponse.json(
            {
                success: true,
                message:
                    mode === "me"
                        ? "Messages deleted for you."
                        : "Messages deleted for everyone.",
                mode,
                deletedMessageIds,
            },
            { status: 200 }
        );
    }
);
