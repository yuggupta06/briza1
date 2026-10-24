import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import Like from "@/backend/models/like";
import Post from "@/backend/models/post";
import "@/backend/models/user";

const PAGE_SIZE = 12;

export const GET = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid authenticated user",
      },
      { status: 401 },
    );
  }

  const cursor = request.nextUrl.searchParams.get("cursor");

  if (cursor && !mongoose.isValidObjectId(cursor)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid pagination cursor",
      },
      { status: 400 },
    );
  }

  const currentUserId = new mongoose.Types.ObjectId(userId);

  const filter: Record<string, unknown> = {
    author: currentUserId,
    deleted: false,
  };

  if (cursor) {
    const cursorPost = (await Post.findOne({
      _id: cursor,
      author: currentUserId,
      deleted: false,
    })
      .select("_id createdAt")
      .lean()) as { _id: mongoose.Types.ObjectId; createdAt: Date } | null;

    if (!cursorPost) {
      return NextResponse.json(
        {
          success: false,
          error: "Cursor post not found",
        },
        { status: 400 },
      );
    }

    filter.$or = [
      { createdAt: { $lt: cursorPost.createdAt } },
      {
        createdAt: cursorPost.createdAt,
        _id: { $lt: cursorPost._id },
      },
    ];
  }

  const fetchedPosts = await Post.find(filter)
    .select(
      "_id author postUrl postType caption likesCount commentsCount createdAt",
    )
    .populate("author", "_id username imageUrl")
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1)
    .lean();

  const hasMore = fetchedPosts.length > PAGE_SIZE;
  const page = fetchedPosts.slice(0, PAGE_SIZE);

  const postIds = page.map((post) => post._id);

  const userLikes = postIds.length
    ? await Like.find({
      post: { $in: postIds },
      author: currentUserId,
    })
      .select("post")
      .lean()
    : [];

  const likedPostIds = new Set(
    userLikes.map((like) => String(like.post)),
  );

  const posts = page.map((post) => ({
    ...post,
    isLiked: likedPostIds.has(String(post._id)),
  }));

  return NextResponse.json(
    {
      success: true,
      posts,
      pagination: {
        hasMore,
        nextCursor:
          hasMore && page.length > 0
            ? String(page[page.length - 1]._id)
            : null,
      },
    },
    { status: 200 },
  );
});