
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import "@/backend/models/user";
import "@/backend/models/message";
import Conversation from "@/backend/models/conversation";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteContext) => {
    // 1. Authenticate the current user.
    const { userId } = await getAuthUser();

    if (!mongoose.isValidObjectId(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authenticated user",
        },
        { status: 401 }
      );
    }

    // 2. Get and validate conversation ID.
    const { conversationId } = await params;

    if (!mongoose.isValidObjectId(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid conversation ID",
        },
        { status: 400 }
      );
    }

    // 3. Connect to MongoDB.
    await Connect();

    const currentUserId = new mongoose.Types.ObjectId(userId);

    // 4. Fetch conversation only if current user is a participant.
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    })
      .select(
        "_id participants lastMessageId lastMessageAt lastMessageSeq memberStates"
      )
      .populate("participants", "_id username imageUrl")
      .populate({
        path: "lastMessageId",
        select:
          "_id senderId sequence messageType content attachments createdAt",
        populate: {
          path: "senderId",
          select: "_id username imageUrl",
        },
      })
      .lean();

    // 5. Handle missing conversation.
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversation not found",
        },
        { status: 404 }
      );
    }

    // 6. Find the other participant.
    const otherParticipant = conversation.participants.find(
      (participant) =>
        participant &&
        participant._id.toString() !== userId
    );

    // 7. Find current user's member state.
    const currentMemberState = conversation.memberStates.find(
      (state) => state.userId.toString() === userId
    );

    // 8. Find the other participant's member state.
    const otherParticipantMemberState =
      conversation.memberStates.find(
        (state) =>
          state.userId.toString() ===
          otherParticipant?._id.toString()
      );

    // 9. Return conversation details.
    return NextResponse.json(
      {
        success: true,
        conversation: {
          _id: conversation._id,
          otherParticipant: otherParticipant ?? null,
          lastMessage: conversation.lastMessageId ?? null,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageSeq: conversation.lastMessageSeq,
          unreadCount: currentMemberState?.unreadCount ?? 0,

          // Persisted read progress of the other participant.
          otherParticipantLastReadSeq:
            otherParticipantMemberState?.lastReadSeq ?? 0,
        },
      },
      { status: 200 }
    );
  }
);
