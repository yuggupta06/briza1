
import { Types, type FilterQuery } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Comment from "@/backend/models/comment";
import Post from "@/backend/models/post";

const PAGE_SIZE = 10;

export const POST = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  const body = await request.json();

  const { postId, parentCommentId, cursor } = body;

  if (
    typeof postId !== "string" ||
    !Types.ObjectId.isValid(postId) ||
    typeof parentCommentId !== "string" ||
    !Types.ObjectId.isValid(parentCommentId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid post or parent comment ID." },
      { status: 400 }
    );
  }

  if (
    cursor !== undefined &&
    cursor !== null &&
    cursor !== "" &&
    (typeof cursor !== "string" || !Types.ObjectId.isValid(cursor))
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid cursor." },
      { status: 400 }
    );
  }

  const postObjectId = new Types.ObjectId(postId);
  const rootCommentId = new Types.ObjectId(parentCommentId);

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

  // Fetch replies belonging to this root comment.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: FilterQuery<any> = {
    post: postObjectId,
    parentCommentId: rootCommentId,
  };

  if (cursor) {
    const cursorComment = (await Comment.findOne({
      _id: new Types.ObjectId(cursor),
      post: postObjectId,
      parentCommentId: rootCommentId,
    })
      .select("_id createdAt")
      .lean()) as unknown as {
        _id: Types.ObjectId;
        createdAt: Date;
      } | null;

    if (!cursorComment) {
      return NextResponse.json(
        { success: false, message: "Invalid comment cursor." },
        { status: 400 }
      );
    }

    // Continue after the last reply from the previous page.
    filter.$or = [
      {
        createdAt: { $lt: cursorComment.createdAt },
      },
      {
        createdAt: cursorComment.createdAt,
        _id: { $lt: cursorComment._id },
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
  const replies = fetchedReplies.slice(0, PAGE_SIZE);

  const serializedReplies = replies.map((reply) => {
    const author = reply.author as unknown as {
      _id: Types.ObjectId;
      username: string;
      imageUrl?: string;
    } | null;

    const replyToValue = reply.replyToUserId as unknown as
      | {
        _id: Types.ObjectId;
        username: string;
      }
      | Types.ObjectId
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
      _id: (reply._id as Types.ObjectId).toString(),
      post: reply.post.toString(),

      author: author
        ? {
          _id: author._id.toString(),
          username: author.username,
          imageUrl: author.imageUrl ?? "",
        }
        : null,

      parentCommentId:
        reply.parentCommentId?.toString() ?? null,

      replyToCommentId:
        reply.replyToCommentId?.toString() ?? null,

      replyToUser,

      text: reply.text,
      repliesCount: reply.repliesCount ?? 0,
      createdAt: new Date(reply.createdAt).toISOString(),
      updatedAt: new Date(reply.updatedAt).toISOString(),
    };
  });

  return NextResponse.json(
    {
      success: true,
      replies: serializedReplies,
      hasMore,
      nextCursor:
        hasMore && serializedReplies.length > 0
          ? serializedReplies[serializedReplies.length - 1]._id
          : null,
    },
    { status: 200 }
  );
});
