import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import Like from "@/backend/models/like";
import Post from "@/backend/models/post";

export const POST = withErrorHandler(async (req: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();
  const body = await req.json();

  const { postId, liked } = body;

  if (
    typeof postId !== "string" ||
    !mongoose.isValidObjectId(postId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid post ID" },
      { status: 400 }
    );
  }

  if (typeof liked !== "boolean") {
    return NextResponse.json(
      { success: false, message: "liked must be a boolean" },
      { status: 400 }
    );
  }

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json(
      { success: false, message: "Invalid authenticated user" },
      { status: 401 }
    );
  }

  const postObjectId = new mongoose.Types.ObjectId(postId);
  const authorObjectId = new mongoose.Types.ObjectId(userId);

  const postExists = await Post.exists({
    _id: postObjectId,
    deleted: { $ne: true },
  });

  if (!postExists) {
    return NextResponse.json(
      { success: false, message: "Post not found" },
      { status: 404 }
    );
  }

  const filter = {
    post: postObjectId,
    author: authorObjectId,
  };

  if (liked) {
    try {
      const result = await Like.updateOne(
        filter,
        { $setOnInsert: filter },
        { upsert: true }
      );

      // Increase the counter only when a new Like was inserted.
      if (result.upsertedCount === 1) {
        await Post.updateOne(
          { _id: postObjectId },
          { $inc: { likesCount: 1 } }
        );
      }
    } catch (error: unknown) {
      const isDuplicateKey =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000;

      // Another concurrent request may have inserted this Like.
      if (!isDuplicateKey) {
        throw error;
      }
    }
  } else {
    const result = await Like.deleteOne(filter);

    // Decrease the counter only if a Like was actually deleted.
    if (result.deletedCount === 1) {
      await Post.updateOne(
        { _id: postObjectId },
        { $inc: { likesCount: -1 } }
      );
    }
  }

  const [likeExists, updatedPost] = await Promise.all([
    Like.exists(filter),
    Post.findById(postObjectId).select("likesCount").lean(),
  ]);

  if (!updatedPost) {
    return NextResponse.json(
      { success: false, message: "Post not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    isLiked: Boolean(likeExists),
    likesCount: (updatedPost as { likesCount?: number }).likesCount ?? 0,
  });
});
