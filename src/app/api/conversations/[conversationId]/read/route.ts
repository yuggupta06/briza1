
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { pusher } from "@/backend/lib/pusher";

import Conversation from "@/backend/models/conversation";
import Message from "@/backend/models/message";
import "@/backend/models/user";
import { MessageType } from "@/types/message";

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

function createApiError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteContext) => {
    // 1. Authenticate the current user
    const { userId } = await getAuthUser();

    if (!mongoose.isValidObjectId(userId)) {
      throw createApiError("Invalid authenticated user.", 401);
    }

    // 2. Get and validate conversation ID
    const { conversationId } = await params;

    if (!mongoose.isValidObjectId(conversationId)) {
      throw createApiError("Invalid conversation ID.", 400);
    }

    // 3. Parse request body
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      throw createApiError("Invalid JSON body.", 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      throw createApiError("Invalid request body.", 400);
    }

    const { lastReadSeq } = body as {
      lastReadSeq?: unknown;
    };

    if (
      typeof lastReadSeq !== "number" ||
      !Number.isSafeInteger(lastReadSeq) ||
      lastReadSeq < 0
    ) {
      throw createApiError(
        "lastReadSeq must be a non-negative integer.",
        400
      );
    }

    // 4. Connect to database
    await Connect();

    const session = await mongoose.startSession();

    let readState: {
      lastReadMessageId: mongoose.Types.ObjectId | null;
      lastReadSeq: number;
      unreadCount: number;
    } | null = null;

    // The other participant will receive the read notification.
    let otherParticipantId: string | null = null;

    try {
      // 5. Perform read-state update transactionally
      await session.withTransaction(async () => {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        })
          .select("_id participants lastMessageSeq memberStates")
          .session(session);

        if (!conversation) {
          throw createApiError("Conversation not found.", 404);
        }

        // Find the other participant.
        otherParticipantId = conversation.participants.find(
          (participantId) =>
            participantId.toString() !== userId
        )?.toString() ?? null;

        if (!otherParticipantId) {
          throw createApiError(
            "Other conversation participant not found.",
            404
          );
        }

        // Find current user's read state.
        const currentMemberState = conversation.memberStates.find(
          (state) => state.userId.toString() === userId
        );

        if (!currentMemberState) {
          throw createApiError(
            "Conversation member state not found.",
            404
          );
        }

        // A user cannot read beyond the latest message.
        if (lastReadSeq > conversation.lastMessageSeq) {
          throw createApiError("Invalid read sequence.", 400);
        }

        // Never allow read progress to move backwards.
        const effectiveReadSeq = Math.max(
          lastReadSeq,
          currentMemberState.lastReadSeq
        );

        let effectiveReadMessageId =
          currentMemberState.lastReadMessageId;

        // Find the message corresponding to the new read position.
        if (effectiveReadSeq > currentMemberState.lastReadSeq) {
          const readMessage = await Message.findOne({
            conversationId,
            sequence: effectiveReadSeq,
          })
            .select("_id")
            .session(session)
            .lean<MessageType>();

          if (!readMessage) {
            throw createApiError(
              "Message for the requested read sequence was not found.",
              400
            );
          }

          effectiveReadMessageId = readMessage._id;
        }

        // Recalculate unread messages sent by the other participant.
        const unreadCount = await Message.countDocuments({
          conversationId,
          sequence: { $gt: effectiveReadSeq },
          senderId: { $ne: userId },
        }).session(session);

        // Update only the current user's member state.
        const updateResult = await Conversation.updateOne(
          {
            _id: conversationId,
            participants: userId,
          },
          {
            $set: {
              "memberStates.$[member].lastReadMessageId":
                effectiveReadMessageId,
              "memberStates.$[member].lastReadSeq":
                effectiveReadSeq,
              "memberStates.$[member].unreadCount":
                unreadCount,
            },
          },
          {
            session,
            arrayFilters: [
              {
                "member.userId": new mongoose.Types.ObjectId(userId),
              },
            ],
          }
        );

        if (updateResult.matchedCount !== 1) {
          throw createApiError(
            "Failed to update read state.",
            500
          );
        }

        // Save result for use after transaction commits.
        readState = {
          lastReadMessageId: effectiveReadMessageId,
          lastReadSeq: effectiveReadSeq,
          unreadCount,
        };
      });
    } finally {
      await session.endSession();
    }

    // 6. Publish read receipts AFTER the transaction commits.
    const committedReadState = readState as {
      lastReadMessageId: mongoose.Types.ObjectId | null;
      lastReadSeq: number;
      unreadCount: number;
    } | null;

    if (committedReadState && otherParticipantId) {
      const payload = {
        conversationId,
        readerId: userId,
        lastReadMessageId:
          committedReadState.lastReadMessageId?.toString() ?? null,
        lastReadSeq: committedReadState.lastReadSeq,
      };

      const results = await Promise.allSettled([
        // Notify clients subscribed to this conversation.
        pusher.trigger(
          `private-conversation-${conversationId}`,
          "messages-read",
          payload
        ),

        // Notify the other participant wherever they are in the app.
        pusher.trigger(
          `private-user-${otherParticipantId}`,
          "messages-read-notification",
          payload
        ),
      ]);

      results.forEach((result) => {
        if (result.status === "rejected") {
          console.error(
            "[Pusher] Failed to publish read receipt:",
            result.reason
          );
        }
      });
    }

    // 7. Return updated read state.
    return NextResponse.json({
      success: true,
      message: "Messages marked as read.",
      readState,
    });
  }
);
