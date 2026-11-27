
import mongoose, { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { pusher } from "@/backend/lib/pusher";
import Conversation from "@/backend/models/conversation";
import Message from "@/backend/models/message";
import { MessageType } from "@/types/message";

export const DELETE = withErrorHandler(
    async (request: NextRequest) => {
        // 1. Authenticate user.
        const auth = await getAuthUser();

        if (!auth?.userId || !Types.ObjectId.isValid(auth.userId)) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const currentUserId = new Types.ObjectId(auth.userId);
        const currentUserIdString = currentUserId.toString();

        // 2. Extract conversation ID.
        const match = request.nextUrl.pathname.match(
            /\/api\/conversations\/([^/]+)\/messages\/delete\/?$/
        );

        const conversationId = match?.[1];

        if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
            return NextResponse.json(
                { success: false, message: "Invalid conversation ID" },
                { status: 400 }
            );
        }

        const conversationObjectId = new Types.ObjectId(conversationId);

        // 3. Validate request body.
        let body: {
            messageIds?: string[];
            deleteFor?: "me" | "everyone";
        };

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, message: "Invalid request body" },
                { status: 400 }
            );
        }

        const { messageIds, deleteFor } = body;

        if (
            !Array.isArray(messageIds) ||
            messageIds.length === 0 ||
            messageIds.length > 100 ||
            !messageIds.every(
                (id) =>
                    typeof id === "string" &&
                    /^[a-f\d]{24}$/i.test(id)
            ) ||
            !["me", "everyone"].includes(deleteFor ?? "")
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid deletion request" },
                { status: 400 }
            );
        }

        const uniqueMessageIds = [...new Set(messageIds)];

        const messageObjectIds = uniqueMessageIds.map(
            (id) => new Types.ObjectId(id)
        );

        await Connect();

        const session = await mongoose.startSession();

        // Data required for realtime events after the transaction.
        let participantIds: string[] = [];
        let unreadCounts: Record<string, number> = {};

        let lastMessageChanged = false;

        let latestMessageId: string | null = null;
let latestMessageAt: Date | null = null;
let lastMessageSeq = 0;

        try {
            await session.withTransaction(async () => {
                // 4. Verify conversation membership.
                const conversation = await Conversation.findOne({
                    _id: conversationObjectId,
                    participants: currentUserId,
                }).session(session);

                if (!conversation) {
                    const error = new Error("Conversation not found");
                    Object.assign(error, { statusCode: 404 });
                    throw error;
                }

                // 5. Find selected messages.
                const selectedMessages = await Message.find({
                    _id: { $in: messageObjectIds },
                    conversationId: conversationObjectId,
                })
                    .select("_id senderId sequence createdAt")
                    .session(session)
                    .lean();

                if (selectedMessages.length !== uniqueMessageIds.length) {
                    const error = new Error(
                        "One or more messages were not found"
                    );
                    Object.assign(error, { statusCode: 404 });
                    throw error;
                }

                // 6. Delete for me.
                // No Pusher events are sent for this operation.
                if (deleteFor === "me") {
                    await Message.updateMany(
                        {
                            _id: { $in: messageObjectIds },
                            conversationId: conversationObjectId,
                            "deletedFor.userId": {
                                $ne: currentUserId,
                            },
                        },
                        {
                            $push: {
                                deletedFor: {
                                    userId: currentUserId,
                                    deletedAt: new Date(),
                                },
                            },
                        },
                        { session }
                    );

                    return;
                }

                // 7. Delete for everyone: only own messages.
                const allMessagesAreOwn = selectedMessages.every(
                    (message) =>
                        message.senderId.toString() === currentUserIdString
                );

                if (!allMessagesAreOwn) {
                    const error = new Error(
                        "You can only delete your own messages for everyone"
                    );
                    Object.assign(error, { statusCode: 403 });
                    throw error;
                }

                // 8. Check whether the current inbox preview is being deleted.
                const previousLastMessageId =
                    conversation.lastMessageId?.toString() ?? null;

                lastMessageChanged =
                    previousLastMessageId !== null &&
                    uniqueMessageIds.includes(previousLastMessageId);

                // 9. Recalculate unread counts.
                // A member's unread count includes incoming messages
                // received after their last-read sequence.
                for (const memberState of conversation.memberStates) {
                    const memberId = memberState.userId.toString();

                    const lastReadSeq = Number(
                        memberState.lastReadSeq ?? 0
                    );

                    const deletedUnreadCount = selectedMessages.filter(
                        (message) =>
                            message.senderId.toString() !== memberId &&
                            message.sequence > lastReadSeq
                    ).length;

                    memberState.unreadCount = Math.max(
                        0,
                        memberState.unreadCount - deletedUnreadCount
                    );
                }

                // 10. Physically delete selected messages.
                await Message.deleteMany({
                    _id: { $in: messageObjectIds },
                    conversationId: conversationObjectId,
                }).session(session);

                // 11. Find the latest remaining message.
                const latestMessage = await Message.findOne({
                    conversationId: conversationObjectId,
                })
                    .sort({ sequence: -1 })
                    .select("_id createdAt sequence")
                    .session(session)
                    .lean<MessageType>();

                // 12. Update conversation preview metadata.
                conversation.lastMessageId = latestMessage?._id ?? null;
                conversation.lastMessageAt =
                    latestMessage?.createdAt ?? null;

                // Keep lastMessageSeq aligned with the latest existing message.
                // Do NOT modify nextMessageSeq: it is the monotonic sequence allocator.
                conversation.lastMessageSeq =
                    latestMessage?.sequence ?? 0;

                await conversation.save({ session });

                // 13. Capture participant IDs.
                participantIds = conversation.participants.map(
                    (id: Types.ObjectId) => id.toString()
                );

                // Capture each participant's updated unread count.
                unreadCounts = {};

                for (const memberState of conversation.memberStates) {
                    unreadCounts[memberState.userId.toString()] =
                        memberState.unreadCount;
                }

                // Capture latest-message metadata for the events.
                latestMessageId =
                    latestMessage?._id?.toString() ?? null;

                latestMessageAt =
                    latestMessage?.createdAt ?? null;

                lastMessageSeq  =
                    latestMessage?.sequence ?? 0;
            });
        } finally {
            await session.endSession();
        }

        // 14. Publish events only for delete-for-everyone.
        if (deleteFor === "everyone") {
            // Fetch the latest message with its sender populated.
            // This is used by inbox clients when the previous preview changed.
            const latestMessage = latestMessageId
                ? await Message.findById(latestMessageId)
                    .populate("senderId", "_id username imageUrl")
                    .lean()
                : null;

            // Active conversation synchronization.
            const conversationPayload = {
                conversationId,
                messageIds: uniqueMessageIds,
                deleteFor: "everyone" as const,
                deletedBy: currentUserIdString,
                unreadCounts,
            };

            const events: Promise<unknown>[] = [
                pusher.trigger(
                    `private-conversation-${conversationId}`,
                    "messages-deleted",
                    conversationPayload
                ),
            ];

            // Inbox synchronization for BOTH participants.
            for (const participantId of participantIds) {
                events.push(
                    pusher.trigger(
                        `private-user-${participantId}`,
                        "messages-deleted-inbox",
                        {
                            conversationId,
                            messageIds: uniqueMessageIds,
                            deleteFor: "everyone" as const,
                            deletedBy: currentUserIdString,

                            // Only replace the preview when the previous
                            // latest message was among the deleted messages.
                            previewChanged: lastMessageChanged,

                            lastMessage: lastMessageChanged
                                ? latestMessage
                                : undefined,

                            lastMessageAt: lastMessageChanged
                                ? latestMessageAt
                                : undefined,

                            lastMessageSeq,

                            // Each participant receives their own unread count.
                            unreadCount: unreadCounts[participantId] ?? 0,
                        }
                    )
                );
            }

            // The database transaction has already committed.
            // Pusher failures must not undo the deletion.
            const results = await Promise.allSettled(events);

            results.forEach((result, index) => {
                if (result.status === "rejected") {
                    console.error(
                        `Message deletion Pusher event ${index} failed:`,
                        result.reason
                    );
                }
            });
        }

        // 15. Return response.
        return NextResponse.json({
            success: true,
            message: "Messages deleted successfully",
            deletedMessageIds: uniqueMessageIds,
            deleteFor,
        });
    }
);
