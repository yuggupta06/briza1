import type { FilterQuery } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

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
import Post from "@/backend/models/post";

const PAGE_SIZE = 10;

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await getAuthUser();

  if (!isValidObjectId(userId)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  await Connect();

  const body = await request.json();
  const { postId, parentCommentId, cursor } = body;

  if (
    !isValidObjectId(postId) ||
    !isValidObjectId(parentCommentId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid post or parent comment ID." },
      { status: 400 }
    );
  }

  const postObjectId = toObjectId(postId);
  const rootCommentId = toObjectId(parentCommentId);

  let decodedCursor = null;

  if (cursor !== undefined && cursor !== null && cursor !== "") {
    if (typeof cursor !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid cursor." },
        { status: 400 }
      );
    }

    decodedCursor = decodeCursor(cursor);

    if (!decodedCursor) {
      return NextResponse.json(
        { success: false, message: "Invalid cursor." },
        { status: 400 }
      );
    }
  }

  const postExists = await Post.exists({
    _id: postObjectId,
  });

  if (!postExists) {
    return NextResponse.json(
      { success: false, message: "Post not found." },
      { status: 404 }
    );
  }

  const rootComment = await Comment.findOne({
    _id: rootCommentId,
    post: postObjectId,
    $or: [
      { parentCommentId: null },
      { parentCommentId: { $exists: false } },
    ],
  })
    .select("_id")
    .lean();

  if (!rootComment) {
    return NextResponse.json(
      { success: false, message: "Root comment not found." },
      { status: 404 }
    );
  }

  const filter: FilterQuery<InstanceType<typeof Comment>> = {
    post: postObjectId,
    parentCommentId: rootCommentId,
  };

  if (decodedCursor) {
    filter.$or = [
      { createdAt: { $lt: decodedCursor.createdAt } },
      {
        createdAt: decodedCursor.createdAt,
        _id: { $lt: decodedCursor.id },
      },
    ];
  }

  const fetchedReplies = await Comment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1)
    .populate("author", "_id username imageUrl")
    .populate("replyToUserId", "_id username")
    .lean();

  const hasMore = fetchedReplies.length > PAGE_SIZE;
  const replies = hasMore
    ? fetchedReplies.slice(0, PAGE_SIZE)
    : fetchedReplies;

  const serializedReplies = replies.map((reply) => {
    const author = reply.author as unknown as {
      _id: import("mongoose").Types.ObjectId;
      username: string;
      imageUrl?: string;
    } | null;

    const replyToValue = reply.replyToUserId as unknown as
      | {
        _id: import("mongoose").Types.ObjectId;
        username: string;
      }
      | import("mongoose").Types.ObjectId
      | null;

    const replyToUser =
      replyToValue &&
        typeof replyToValue === "object" &&
        "username" in replyToValue &&
        "_id" in replyToValue
        ? {
          _id: replyToValue._id.toString(),
          username: replyToValue.username,
        }
        : null;

    return {
      _id: String(reply._id),
      post: reply.post.toString(),

      author: author
        ? {
          _id: author._id.toString(),
          username: author.username,
          imageUrl: author.imageUrl ?? "",
        }
        : null,

      parentCommentId: reply.parentCommentId?.toString() ?? null,
      replyToCommentId: reply.replyToCommentId?.toString() ?? null,
      replyToUser,

      text: reply.text,
      repliesCount: reply.repliesCount ?? 0,
      createdAt: new Date(reply.createdAt).toISOString(),
      updatedAt: new Date(reply.updatedAt).toISOString(),
    };
  });

  const lastReply = replies[replies.length - 1];

  const nextCursor =
    hasMore && lastReply
      ? encodeCursor({
        id: toObjectId(String(lastReply._id)),
        createdAt: new Date(lastReply.createdAt),
      })
      : null;

  return NextResponse.json(
    {
      success: true,
      replies: serializedReplies,
      hasMore,
      nextCursor,
    },
    { status: 200 }
  );
});
