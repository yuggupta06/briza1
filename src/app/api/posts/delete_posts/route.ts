import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (request: NextRequest) => {
    await Connect();

    const reqBody = await request.json();
    const { username, currentPostUrl } = reqBody;
    const updatedUser = await User.findOneAndUpdate(
        { username: username, "posts.posturl": currentPostUrl },
        { $set: { "posts.$.deleted": true, "posts.$.deletedAt": new Date() } },
        { new: true }
    )
    return NextResponse.json({
        message: "The post is been deleted.",
        success: true,
        updatedUser
    })


});