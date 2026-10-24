
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import Like from "@/backend/models/like";
import Post from "@/backend/models/post";
import "@/backend/models/user";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

const PAGE_SIZE = 2;

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Authenticate and get the logged-in user's ID.
  const { userId } = await getAuthUser();

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid authenticated user",
      },
      { status: 401 }
    );
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  // Validate the cursor before querying MongoDB.
  if (cursor && !/^[a-fA-F0-9]{24}$/.test(cursor)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid pagination cursor",
      },
      { status: 400 }
    );
  }

  await Connect();

  // Fetch one extra post to determine whether another page exists.
  const fetchedPosts = await Post.find({
    deleted: false,
    ...(cursor && {
      _id: {
        $lt: new mongoose.Types.ObjectId(cursor),
      },
    }),
  })
    .sort({ _id: -1 })
    .limit(PAGE_SIZE + 1)
    .select(
      "_id author postUrl postType likesCount commentsCount caption createdAt"
    )
    .populate("author", "username imageUrl")
    .lean();

  const hasMore = fetchedPosts.length > PAGE_SIZE;
  const page = fetchedPosts.slice(0, PAGE_SIZE);

  // Find which posts the current user has liked.
  const postIds = page.map((post) => post._id);
  const currentUserObjectId = new mongoose.Types.ObjectId(userId);

  const userLikes = postIds.length
    ? await Like.find({
      post: { $in: postIds },
      author: currentUserObjectId,
    })
      .select("post")
      .lean()
    : [];

  const likedPostIds = new Set(
    userLikes.map((like) => like.post.toString())
  );

  // Add a user-specific isLiked property to every post.
  const posts = page.map((post) => ({
    ...post,
    isLiked: likedPostIds.has(String(post._id)),
  }));

  return NextResponse.json(
    {
      success: true,
      posts,
      nextCursor: hasMore
        ? String(page[page.length - 1]._id)
        : null,
      hasMore,
    },
    { status: 200 }
  );
});
