import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import {
  decodeCursor,
  encodeCursor,
} from "@/backend/lib/validations/cursor";
import {
  isValidObjectId,
  toObjectId,
} from "@/backend/lib/validations/objectId";
import Comment from "@/backend/models/comment";
import type { FilterQuery } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 4;

export const POST = withErrorHandler(async (request: NextRequest) => {
  const authUser = await getAuthUser();

  if (!authUser?.userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  await Connect();

  const { postId, cursor } = await request.json();

  if (!isValidObjectId(postId)) {
    return NextResponse.json(
      { success: false, message: "Invalid post ID" },
      { status: 400 }
    );
  }

  const postObjectId = toObjectId(postId);

  const filter: FilterQuery<InstanceType<typeof Comment>> = {
    post: postObjectId,
    parentCommentId: null,
  };

  if (cursor !== undefined && cursor !== null && cursor !== "") {
    if (typeof cursor !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid cursor" },
        { status: 400 }
      );
    }

    const cursorData = decodeCursor(cursor);

    if (!cursorData) {
      return NextResponse.json(
        { success: false, message: "Invalid cursor" },
        { status: 400 }
      );
    }

    filter.$or = [
      { createdAt: { $lt: cursorData.createdAt } },
      {
        createdAt: cursorData.createdAt,
        _id: { $lt: cursorData.id },
      },
    ];
  }

  const results = await Comment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1)
    .select("post text createdAt updatedAt repliesCount parentCommentId")
    .populate("author", "_id username imageUrl")
    .lean();

  const hasMore = results.length > PAGE_SIZE;
  const comments = hasMore ? results.slice(0, PAGE_SIZE) : results;
  const lastComment = comments[comments.length - 1];

  const nextCursor =
    hasMore && lastComment
      ? encodeCursor({
        id: toObjectId(String(lastComment._id)),
        createdAt: new Date(lastComment.createdAt),
      })
      : null;

  return NextResponse.json({
    success: true,
    comments,
    hasMore,
    nextCursor,
  });
});
