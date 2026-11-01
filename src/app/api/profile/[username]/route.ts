import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import User from "@/backend/models/user";
import Post from "@/backend/models/post";
import Follow from "@/backend/models/follow";
import { NextRequest, NextResponse } from "next/server";

export const GET = withErrorHandler(
    async (request: NextRequest) => {
        await Connect();

        const rawUsername = request.nextUrl.pathname.split("/").pop() ?? "";
        const username = decodeURIComponent(rawUsername)
            .trim()
            .replace(/^@/, "")
            .toLowerCase();

        if (!username) {
            return NextResponse.json(
                { success: false, message: "Username is required." },
                { status: 400 }
            );
        }

        const userResult = await User.findOne({ username })
            .select("_id name username imageUrl followers following")
            .lean();

        const user = Array.isArray(userResult)
            ? userResult[0]
            : userResult;

        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found." },
                { status: 404 }
            );
        }

        // Fetch post count and follow previews in parallel.
        const [totalPosts, followerPreviews, followingPreviews] =
            await Promise.all([
                Post.countDocuments({
                    author: user._id,
                    deleted: false,
                }),

                // Latest 3 followers of this user.
                Follow.find({ following: user._id })
                    .sort({ createdAt: -1, _id: -1 })
                    .limit(3)
                    .populate({
                        path: "follower",
                        select: "_id username imageUrl",
                    })
                    .lean(),

                // Latest 3 users this user follows.
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
                    "Cache-Control": "no-store",
                },
            }
        );
    }
);