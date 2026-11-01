
import { NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import User from "@/backend/models/user";
import Post from "@/backend/models/post";
import Follow from "@/backend/models/follow";

export const GET = withErrorHandler(async () => {
    await Connect();

    // Get the authenticated user's ID from the HTTP-only JWT cookie.
    const { userId } = await getAuthUser();

    // Fetch the current user's profile from MongoDB.
    const user = await User.findById(userId)
        .select("_id name username imageUrl email followers following")
        .lean();

    if (!user || Array.isArray(user)) {
        return NextResponse.json(
            {
                success: false,
                message: "User not found.",
            },
            { status: 404 }
        );
    }

    // Fetch post count and follow previews concurrently.
    const [totalPosts, followerPreviews, followingPreviews] =
        await Promise.all([
            // Total non-deleted posts.
            Post.countDocuments({
                author: user._id,
                deleted: false,
            }),

            // Latest 3 followers.
            Follow.find({ following: user._id })
                .sort({ createdAt: -1, _id: -1 })
                .limit(3)
                .populate({
                    path: "follower",
                    select: "_id username imageUrl",
                })
                .lean(),

            // Latest 3 users this account follows.
            Follow.find({ follower: user._id })
                .sort({ createdAt: -1, _id: -1 })
                .limit(3)
                .populate({
                    path: "following",
                    select: "_id username imageUrl",
                })
                .lean(),
        ]);

    return NextResponse.json(
        {
            success: true,
            user: {
                ...user,
                _id: String(user._id),
                totalPosts,
            },

            followerPreviews: followerPreviews
                .filter((item) => item.follower)
                .map((item) => ({
                    _id: String(item.follower._id),
                    username: item.follower.username,
                    imageUrl: item.follower.imageUrl,
                })),

            followingPreviews: followingPreviews
                .filter((item) => item.following)
                .map((item) => ({
                    _id: String(item.following._id),
                    username: item.following.username,
                    imageUrl: item.following.imageUrl,
                })),
        },
        {
            status: 200,
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        }
    );
});
