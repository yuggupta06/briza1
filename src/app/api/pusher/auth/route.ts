
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { pusher } from "@/backend/lib/pusher";

import Conversation from "@/backend/models/conversation";
import Post from "@/backend/models/post";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user.
    const { userId } = await getAuthUser();

    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid authenticated user." },
        { status: 401 }
      );
    }

    // 2. Read Pusher authorization request.
    const formData = await request.formData();

    const socketId = formData.get("socket_id");
    const channelName = formData.get("channel_name");

    if (
      typeof socketId !== "string" ||
      !/^\d+\.\d+$/.test(socketId) ||
      typeof channelName !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Pusher authorization request.",
        },
        { status: 400 }
      );
    }

    // 3. Allow the user to access their own private user channel.
    const allowedUserChannel = `private-user-${userId}`;

    if (channelName === allowedUserChannel) {
      return NextResponse.json(
        pusher.authorizeChannel(socketId, channelName)
      );
    }

    // Database connection is required for conversation and post checks.
    await Connect();

    // 4. Authorize conversation-specific private channels.
    const conversationMatch = channelName.match(
      /^private-conversation-([a-f\d]{24})$/i
    );

    if (conversationMatch) {
      const conversationId = conversationMatch[1];

      const conversation = await Conversation.exists({
        _id: conversationId,
        participants: new Types.ObjectId(userId),
      });

      if (!conversation) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not authorized to access this conversation.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        pusher.authorizeChannel(socketId, channelName)
      );
    }

    // 5. Authorize post-specific private channels.
    const postMatch = channelName.match(
      /^private-post-([a-f\d]{24})$/i
    );

    if (postMatch) {
      const postId = postMatch[1];

      const post = await Post.exists({
        _id: postId,
        deleted: false,
      });

      if (!post) {
        return NextResponse.json(
          {
            success: false,
            message: "Post not found or unavailable.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        pusher.authorizeChannel(socketId, channelName)
      );
    }

    // 6. Reject every unsupported channel.
    return NextResponse.json(
      {
        success: false,
        message: "Forbidden channel.",
      },
      { status: 403 }
    );

  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 401;

    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: statusCode }
      );
    }

    console.error("[Pusher Auth] Authorization failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Pusher authorization failed.",
      },
      { status: 500 }
    );
  }
}
