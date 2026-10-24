import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Post from "@/backend/models/post";
import { NextRequest, NextResponse } from "next/server";

export const POST = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();

  const { postId } = await request.json();

  if (!postId) {
    return NextResponse.json(
      {
        success: false,
        message: "Post ID is required.",
      },
      { status: 400 }
    );
  }

  const deletedPost = await Post.findOneAndUpdate(
    {
      _id: postId,
      author: userId,
      deleted: false,
    },
    {
      $set: {
        deleted: true,
        deletedAt: new Date(),
      },
    },
    {
      new: true,
    }
  );

  if (!deletedPost) {
    return NextResponse.json(
      {
        success: false,
        message: "Post not found or you are not authorized to delete it.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Post deleted successfully.",
    postId: deletedPost._id,
  });
});