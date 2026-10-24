import mongoose from "mongoose";
import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Comment from "@/backend/models/comment";
import Post from "@/backend/models/post";
import { NextRequest, NextResponse } from "next/server";

export const POST = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const authUser = await getAuthUser();
  const userId = authUser.userId;

  const { postId, text } = await request.json();

  // Validate post ID
  if (
    typeof postId !== "string" ||
    !mongoose.Types.ObjectId.isValid(postId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid post ID" },
      { status: 400 }
    );
  }

  // Validate comment text
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { success: false, message: "Comment text is required" },
      { status: 400 }
    );
  }

  const trimmedText = text.trim();

  if (trimmedText.length > 500) {
    return NextResponse.json(
      {
        success: false,
        message: "Comment cannot exceed 500 characters",
      },
      { status: 400 }
    );
  }

  const postObjectId = new mongoose.Types.ObjectId(postId);

  // Find the post and increment its comment count atomically.
  const post = await Post.findOneAndUpdate(
    { _id: postObjectId, deleted: false },
    { $inc: { commentsCount: 1 } },
    { new: true }
  )
    .select("_id")
    .lean();

  if (!post) {
    return NextResponse.json(
      { success: false, message: "Post not found" },
      { status: 404 }
    );
  }

  let comment;

  try {
    // Create and persist the comment.
    comment = await Comment.create({
      post: postObjectId,
      author: userId,
      text: trimmedText,
    });
  } catch (error) {
    // Roll back the counter if comment creation fails.
    await Post.updateOne(
      { _id: postObjectId },
      { $inc: { commentsCount: -1 } }
    );

    throw error;
  }

  // Return the comment with the author's public profile.
  const populatedComment = await Comment.findById(comment._id)
    .select("post author text createdAt updatedAt")
    .populate("author", "_id username imageUrl")
    .lean();

  return NextResponse.json(
    {
      success: true,
      message: "Comment posted successfully",
      comment: populatedComment,
    },
    { status: 201 }
  );
});