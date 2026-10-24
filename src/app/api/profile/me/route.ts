import { NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import User from "@/backend/models/user";

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

    return NextResponse.json(
        {
            success: true,
            user: {
                ...user,
                _id: String(user._id),
            },
        },
        {
            status: 200,
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        }
    );
});