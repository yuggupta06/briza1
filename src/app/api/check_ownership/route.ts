import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (req: NextRequest) => {
    await Connect();
        const res = await req.json();
        const { username, userId } = res
        const user = await User.findOne({ clerkId: userId })
        if (user.username === username) {
            return NextResponse.json({
                message: "This is your Profile.",
                success: true,
                status:202
            })

        };
        return NextResponse.json({
            message: "This is not your Profile.",
            success: false,
            status:504
        })
});