
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import "@/backend/models/message";
import User from "@/backend/models/user";
import Conversation from "@/backend/models/conversation";

export const POST = withErrorHandler(async (req: NextRequest) => {
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

  // 2. Parse and validate request body.
  const body = await req.json();
  const { recipientId } = body;

  if (
    typeof recipientId !== "string" ||
    !mongoose.isValidObjectId(recipientId)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid recipient ID",
      },
      { status: 400 }
    );
  }

  // 3. Prevent self-messaging.
  if (userId === recipientId) {
    return NextResponse.json(
      {
        success: false,
        message: "You cannot create a conversation with yourself",
      },
      { status: 400 }
    );
  }

  // 4. Connect to MongoDB.
  await Connect();

  // 5. Verify that both users exist.
  const users = await User.find({
    _id: {
      $in: [userId, recipientId],
    },
  })
    .select("_id username imageUrl")
    .lean();

  const currentUserExists = users.some(
    (user) => String(user._id) === userId
  );

  const recipientExists = users.some(
    (user) => String(user._id) === recipientId
  );

  if (!currentUserExists) {
    return NextResponse.json(
      {
        success: false,
        message: "Authenticated user no longer exists",
      },
      { status: 401 }
    );
  }

  if (!recipientExists) {
    return NextResponse.json(
      {
        success: false,
        message: "Recipient not found",
      },
      { status: 404 }
    );
  }

  // 6. Generate deterministic participant key.
  // Sorting ensures both users generate the same key.
  const participantIds = [userId, recipientId].sort();

  const participantKey = participantIds.join("_");

  // 7. Initialize read state for both participants.
  const memberStates = participantIds.map((id) => ({
    userId: new mongoose.Types.ObjectId(id),
    lastReadMessageId: null,
    lastReadSeq: 0,
    unreadCount: 0,
  }));

  // 8. Create or retrieve conversation atomically.
  let conversation;

  try {
    conversation = await Conversation.findOneAndUpdate(
      { participantKey },
      {
        $setOnInsert: {
          participants: participantIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
          participantKey,
          memberStates,
          lastMessageId: null,
          lastMessageAt: null,
          lastMessageSeq: 0,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    ).populate("participants", "_id username imageUrl");

  } catch (error: unknown) {
    // 9. Handle concurrent conversation creation.
    const isDuplicateKeyError =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000;

    if (!isDuplicateKeyError) {
      throw error;
    }

    // Another request may have created the conversation first.
    conversation = await Conversation.findOne({
      participantKey,
    }).populate("participants", "_id username imageUrl");

    if (!conversation) {
      throw error;
    }
  }

  // 10. Return the conversation.
  return NextResponse.json(
    {
      success: true,
      message: "Conversation retrieved successfully",
      conversation,
    },
    { status: 200 }
  );
});

const PAGE_SIZE = 20;

export const GET = withErrorHandler(async (req: NextRequest) => {
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

  // 2. Connect to MongoDB.
  await Connect();

  const currentUserId = new mongoose.Types.ObjectId(userId);

  // 3. Get and validate pagination cursor.
  const cursor = req.nextUrl.searchParams.get("cursor");

  if (cursor && !mongoose.isValidObjectId(cursor)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid pagination cursor",
      },
      { status: 400 }
    );
  }

  // 4. Base query: conversations where current user is a participant.
  const filter: Record<string, unknown> = {
    participants: currentUserId,
  };

  // 5. Apply cursor-based pagination.
  if (cursor) {
    // Find the conversation represented by the cursor.
    const cursorConversation = await Conversation.findOne({
      _id: cursor,
      participants: currentUserId,
    })
      .select("_id lastMessageAt")
      .lean();

    if (!cursorConversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid conversation cursor",
        },
        { status: 400 }
      );
    }

    const cursorId = new mongoose.Types.ObjectId(cursor);

    if (cursorConversation.lastMessageAt) {
      // Continue after the cursor in descending order.
      filter.$or = [
        {
          lastMessageAt: {
            $lt: cursorConversation.lastMessageAt,
          },
        },
        {
          lastMessageAt: cursorConversation.lastMessageAt,
          _id: {
            $lt: cursorId,
          },
        },
        {
          lastMessageAt: null,
        },
      ];
    } else {
      // Conversations without messages appear at the end.
      filter.lastMessageAt = null;
      filter._id = {
        $lt: cursorId,
      };
    }
  }

  // 6. Fetch one extra conversation to determine hasMore.
  const fetchedConversations = await Conversation.find(filter)
    .sort({
      lastMessageAt: -1,
      _id: -1,
    })
    .limit(PAGE_SIZE + 1)
    .select(
      "_id participants lastMessageId lastMessageAt memberStates"
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

  // 7. Determine whether another page exists.
  const hasMore = fetchedConversations.length > PAGE_SIZE;

  const page = fetchedConversations.slice(0, PAGE_SIZE);

  // 8. Transform conversations into inbox items.
  const conversations = page.map((conversation) => {
    // Find the other participant.
    const otherParticipant = conversation.participants.find(
      (participant) =>
        participant &&
        participant._id.toString() !== userId
    );

    // Find the current user's member state.
    const currentMemberState = conversation.memberStates.find(
      (state) => state.userId.toString() === userId
    );

    // Find the other participant's member state.
    const otherParticipantMemberState =
      conversation.memberStates.find(
        (state) =>
          state.userId.toString() ===
          otherParticipant?._id.toString()
      );

    return {
      _id: conversation._id,
      otherParticipant: otherParticipant ?? null,
      lastMessage: conversation.lastMessageId ?? null,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: currentMemberState?.unreadCount ?? 0,

      // Read progress of the other participant.
      otherParticipantLastReadSeq:
        otherParticipantMemberState?.lastReadSeq ?? 0,
    };
  });

  // 9. Return paginated inbox.
  return NextResponse.json(
    {
      success: true,
      conversations,
      nextCursor: hasMore
        ? String(page[page.length - 1]._id)
        : null,
      hasMore,
    },
    { status: 200 }
  );
});
