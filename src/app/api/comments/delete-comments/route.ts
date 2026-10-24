
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import {Connect} from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Comment from "@/backend/models/comment";
import Post from "@/backend/models/post";

export const POST = withErrorHandler(
  async (request: NextRequest) => {
    await Connect();

    const { userId } = await getAuthUser();

    const { commentId } = await request.json();

    if (!mongoose.isValidObjectId(commentId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid comment ID",
        },
        { status: 400 }
      );
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found",
        },
        { status: 404 }
      );
    }

    // Only the comment's author can delete it.
    if (String(comment.author) !== String(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only delete your own comments",
        },
        { status: 403 }
      );
    }

    const isReply = Boolean(comment.parentCommentId);

    if (isReply) {
      // Delete this reply and decrement its parent's reply count.
      await Comment.deleteOne({ _id: comment._id });

      await Comment.updateOne(
        {
          _id: comment.parentCommentId,
          repliesCount: { $gt: 0 },
        },
        {
          $inc: { repliesCount: -1 },
        }
      );
    } else {
      // Find all replies belonging to this top-level comment.
      await Comment.deleteMany({
        parentCommentId: comment._id,
      });

      await Comment.deleteOne({ _id: comment._id });

      // Keep the post's top-level comment count in sync.
      await Post.updateOne(
        { _id: comment.post },
        { $inc: { commentsCount: -1 } }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
      commentId: String(comment._id),
    });
  }
);
