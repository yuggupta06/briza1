import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";



export const POST = withErrorHandler(async (request: NextRequest) => {
    await Connect();

    const reqBody = await request.json();
    const { userPostClerkId, posturl } = reqBody;
    const allComments = await User.aggregate([
        { $match: { clerkId: userPostClerkId } },
        { $unwind: "$posts" },
        { $match: { "posts.posturl": posturl } },
        { $project: { comments: "$posts.comments", _id: 0 } }
    ]);
    return NextResponse.json({
        messgae: "All posts are fetched successfully",
        success: true,
        commentArray: allComments[0].comments
    })

});