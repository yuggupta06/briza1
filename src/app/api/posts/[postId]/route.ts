import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { Connect } from "@/backend/lib/dbConnect";
import Post from "@/backend/models/post";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const GET = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  // Extract postId from the URL
  const postId = request.nextUrl.pathname.split("/").pop();

  // Validate MongoDB ObjectId
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid post ID",
      },
      { status: 400 }
    );
  }

  const post = await Post.findOne({
    _id: postId,
    deleted: false,
  })
    .populate({
      path: "author",
      select: "username name imageUrl",
    })
    .lean();

  if (!post) {
    return NextResponse.json(
      {
        success: false,
        message: "Post not found",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      post,
    },
    { status: 200 }
  );
});