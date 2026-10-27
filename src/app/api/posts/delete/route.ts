import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Comment from "@/backend/models/comment";
import Like from "@/backend/models/like";
import Post from "@/backend/models/post";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

export const POST = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();
  const { postId } = await request.json();

  if (
    typeof postId !== "string" ||
    !mongoose.isValidObjectId(postId)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid post ID is required.",
      },
      { status: 400 }
    );
  }

  const session = await mongoose.startSession();

  try {
    let deleted = false;

    await session.withTransaction(async () => {
      const post = await Post.findOneAndDelete(
        {
          _id: postId,
          author: userId,
        },
        { session }
      );

      if (!post) return;

      await Promise.all([
        Comment.deleteMany(
          { post: post._id },
          { session }
        ),
        Like.deleteMany(
          { post: post._id },
          { session }
        ),
      ]);

      deleted = true;
    });

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Post not found or you are not authorized to delete it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Post, related comments, and likes deleted successfully.",
      postId,
    });
  } finally {
    await session.endSession();
  }
});