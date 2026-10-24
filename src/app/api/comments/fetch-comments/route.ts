
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Comment from "@/backend/models/comment";
import type { FilterQuery } from "mongoose";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 4;

export const POST = withErrorHandler(async (request: NextRequest) => {
  await getAuthUser();
  await Connect();

  const { postId, cursor } = await request.json();

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json(
      { success: false, message: "Invalid post ID" },
      { status: 400 }
    );
  }

  const postObjectId = new mongoose.Types.ObjectId(postId);

  const filter: FilterQuery<Comment> = {
    post: postObjectId,
    parentCommentId: null,
  };

  if (cursor) {
    if (!mongoose.Types.ObjectId.isValid(cursor)) {
      return NextResponse.json(
        { success: false, message: "Invalid cursor" },
        { status: 400 }
      );
    }

    const lastComment = (await Comment.findOne({
      _id: new mongoose.Types.ObjectId(cursor),
      post: postObjectId,
      parentCommentId: null,
    })
      .select("_id createdAt")
      .lean()) as { _id: mongoose.Types.ObjectId; createdAt: Date } | null;

    if (!lastComment) {
      return NextResponse.json(
        { success: false, message: "Invalid cursor for this post" },
        { status: 400 }
      );
    }

    filter.$or = [
      { createdAt: { $lt: lastComment.createdAt } },
      {
        createdAt: lastComment.createdAt,
        _id: { $lt: lastComment._id },
      },
    ];
  }

  const results = await Comment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1)
    .select("post text createdAt updatedAt repliesCount")
    .populate("author", "_id username imageUrl")
    .lean();

  const hasMore = results.length > PAGE_SIZE;
  const comments = hasMore ? results.slice(0, PAGE_SIZE) : results;

  return NextResponse.json({
    success: true,
    comments,
    hasMore,
    nextCursor:
      hasMore && comments.length > 0
        ? comments[comments.length - 1]._id
        : null,
  });
});
