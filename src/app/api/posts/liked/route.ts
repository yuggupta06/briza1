
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import Like from "@/backend/models/like";
import Post from "@/backend/models/post";

const PAGE_SIZE = 7;

export const GET = withErrorHandler(async (request: NextRequest) => {
    await Connect();

    const { userId } = await getAuthUser();

    const cursor = request.nextUrl.searchParams.get("cursor");

    if (cursor && !mongoose.isValidObjectId(cursor)) {
        return NextResponse.json(
            {
                success: false,
                message: "Invalid cursor.",
            },
            { status: 400 }
        );
    }

    // Get this user's likes, newest first.
    const likes = await Like.find({ author: userId })
        .sort({ _id: -1 })
        .select("_id post")
        .lean();

    // Keep only posts that still exist and aren't soft-deleted.
    const likedPostIds = likes.map((like) => like.post);

    const postFilter: Record<string, unknown> = {
        _id: { $in: likedPostIds },
        deleted: false,
    };

    if (cursor) {
        postFilter._id = {
            $in: likedPostIds,
            $lt: new mongoose.Types.ObjectId(cursor),
        };
    }

    const posts = await Post.find(postFilter)
        .sort({ _id: -1 })
        .limit(PAGE_SIZE + 1)
        .populate("author", "_id username imageUrl")
        .lean();

    const hasMore = posts.length > PAGE_SIZE;
    const pagePosts = posts.slice(0, PAGE_SIZE);

    // Build a set for reliable isLiked values.
    const likedPostIdSet = new Set(
        likedPostIds.map((id) => id.toString())
    );

    const formattedPosts = pagePosts.map((post) => ({
        ...post,
        isLiked: likedPostIdSet.has(String(post._id)),
    }));

    return NextResponse.json({
        success: true,
        posts: formattedPosts,
        pagination: {
            hasMore,
            nextCursor:
                hasMore && pagePosts.length > 0
                    ? String(pagePosts[pagePosts.length - 1]._id)
                    : null,
        },
    });
});
