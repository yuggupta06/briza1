
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import User from "@/backend/models/user";
import Post from "@/backend/models/post";
import { NextRequest, NextResponse } from "next/server";

export const GET = withErrorHandler(
    async (
        request: NextRequest
    ) => {
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
        const user = Array.isArray(userResult) ? userResult[0] : userResult;

        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found." },
                { status: 404 }
            );
        }

        // Get the total number of non-deleted posts by this user.
        const totalPosts = await Post.countDocuments({
            author: user._id,
            deleted: false,
        });

        return NextResponse.json(
            {
                success: true,
                user: {
                    ...user,
                    _id: String(user._id),
                    totalPosts,
                },
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
