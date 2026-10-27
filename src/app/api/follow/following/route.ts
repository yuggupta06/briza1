
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import User from "@/backend/models/user";
import Follow from "@/backend/models/follow";

import {
  createFollowCursor,
  getFollowCursorQuery,
  parseFollowCursor,
} from "@/backend/lib/follow/followPagination";

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

    const params = request.nextUrl.searchParams;
    const username = params.get("username")?.trim().toLowerCase();
    const cursorParam = params.get("cursor");
    const limitParam = params.get("limit");

    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username is required" },
        { status: 400 }
      );
    }

    const limit = limitParam ? Number(limitParam) : 20;

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return NextResponse.json(
        { success: false, message: "Limit must be between 1 and 50" },
        { status: 400 }
      );
    }

    const cursor = parseFollowCursor(cursorParam);

    if (cursorParam && !cursor) {
      return NextResponse.json(
        { success: false, message: "Invalid cursor" },
        { status: 400 }
      );
    }

    const targetUser = await User.findOne({ username })
      .select("_id followers following")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const query = {
      follower: targetUser._id,
      ...getFollowCursorQuery(cursor),
    };

    const records = await Follow.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate({
        path: "following",
        select: "_id username name imageUrl",
      })
      .lean();

    const hasMore = records.length > limit;
    const page = records.slice(0, limit);

    const users = page
      .filter((record) => record.following != null)
      .map((record) => record.following);

    const lastRecord = page[page.length - 1];

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        hasMore,
        nextCursor:
          hasMore && lastRecord
            ? createFollowCursor(
                lastRecord.createdAt,
                lastRecord._id
              )
            : null,
      },
    });
  }
);
