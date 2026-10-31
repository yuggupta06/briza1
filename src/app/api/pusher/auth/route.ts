import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { pusher } from "@/backend/lib/pusher";


export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user using the HTTP-only JWT cookie.
    const { userId } = await getAuthUser();

    // 2. Read Pusher's authorization request.
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
          message: "Invalid Pusher authorization request",
        },
        { status: 400 }
      );
    }

    // 3. Allow the authenticated user to access their own channel.
    const allowedUserChannel = `private-user-${userId}`;

    if (channelName === allowedUserChannel) {
      return NextResponse.json(
        pusher.authorizeChannel(socketId, channelName)
      );
    }

    // 4. Recognize post-specific private channels.
    const postChannelMatch = channelName.match(
      /^private-post-([a-f\d]{24})$/i
    );

    if (!postChannelMatch) {
      return NextResponse.json(
        { success: false, message: "Forbidden channel" },
        { status: 403 }
      );
    }

    const postId = postChannelMatch[1];

    if (!Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, message: "Invalid post ID" },
        { status: 400 }
      );
    }

    // 5. Check that the post exists and has not been deleted.
    

    // 6. Generate the authorization signature on the server.
    const authResponse = pusher.authorizeChannel(
      socketId,
      channelName
    );

    return NextResponse.json(authResponse);
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
        { success: false, message: "Authentication required" },
        { status: statusCode }
      );
    }

    console.error("[Pusher Auth] Authorization failed:", error);

    return NextResponse.json(
      { success: false, message: "Pusher authorization failed" },
      { status: 500 }
    );
  }
}