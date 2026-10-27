
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import User from "@/backend/models/user";
import Follow from "@/backend/models/follow";

export const GET = withErrorHandler(
  async (request: NextRequest) => {
    await Connect();

    const authUser = await getAuthUser();

    if (!authUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const targetUserId =
      request.nextUrl.searchParams.get("targetUserId");

    if (
      !mongoose.isValidObjectId(authUser.userId) ||
      !targetUserId ||
      !mongoose.isValidObjectId(targetUserId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const currentUserId = new mongoose.Types.ObjectId(
      authUser.userId
    );

    const targetId = new mongoose.Types.ObjectId(targetUserId);

    const targetExists = await User.exists({ _id: targetId });

    if (!targetExists) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (currentUserId.equals(targetId)) {
      return NextResponse.json({
        success: true,
        isFollowing: false,
        isSelf: true,
      });
    }

    const relationship = await Follow.exists({
      follower: currentUserId,
      following: targetId,
    });

    return NextResponse.json({
      success: true,
      isFollowing: Boolean(relationship),
      isSelf: false,
    });
  }
);
