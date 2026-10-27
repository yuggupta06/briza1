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

import Like from "@/backend/models/like";
import Post from "@/backend/models/post";
import User from "@/backend/models/user";

const PAGE_SIZE = 7;

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await getAuthUser();

  if (!isValidObjectId(userId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid authenticated user",
      },
      { status: 401 }
    );
  }

  await Connect();

  const currentUserId = toObjectId(userId);
  const usernameParam = request.nextUrl.searchParams.get("username");

  // Default to the logged-in user's profile.
  let profileUserId = currentUserId;

  // If a username is supplied, fetch that user's profile posts.
  if (usernameParam !== null) {
    const username = usernameParam.trim().replace(/^@/, "").toLowerCase();

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required",
        },
        { status: 400 }
      );
    }

    const profileUser = await User.findOne({ username })
      .select("_id")
      .lean();

    if (!profileUser || Array.isArray(profileUser)) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    profileUserId = toObjectId(String(profileUser._id));
  }

  const cursor = request.nextUrl.searchParams.get("cursor");
  let decodedCursor = null;

  if (cursor) {
    decodedCursor = decodeCursor(cursor);

    if (!decodedCursor) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pagination cursor",
        },
        { status: 400 }
      );
    }
  }

  const filter: FilterQuery<InstanceType<typeof Post>> = {
    author: profileUserId,
    deleted: false,
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

  const fetchedPosts = await Post.find(filter)
    .select(
      "_id author postUrl postType caption likesCount commentsCount createdAt"
    )
    .populate("author", "_id username imageUrl")
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1)
    .lean();

  const hasMore = fetchedPosts.length > PAGE_SIZE;
  const page = hasMore ? fetchedPosts.slice(0, PAGE_SIZE) : fetchedPosts;

  // Calculate likes for the viewer, not the profile owner.
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
    userLikes.map((like) => String(like.post))
  );

  const posts = page.map((post) => ({
    ...post,
    isLiked: likedPostIds.has(String(post._id)),
  }));

  const lastPost = page[page.length - 1];

  const nextCursor =
    hasMore && lastPost
      ? encodeCursor({
        id: toObjectId(String(lastPost._id)),
        createdAt: new Date(lastPost.createdAt),
      })
      : null;

  return NextResponse.json(
    {
      success: true,
      posts,
      pagination: {
        hasMore,
        nextCursor,
      },
    },
    { status: 200 }
  );
});