
import { NextRequest, NextResponse } from "next/server";
import { Connect } from "@/backend/lib/dbConnect";
import Post from "@/backend/models/post";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";

export const POST = withErrorHandler(async (request: NextRequest) => {
    const author = await getAuthUser();

    await Connect();

    const reqBody = await request.json();
    const { secure_url, resource_type, caption } = reqBody;

    const post = await Post.create({
        author: author.userId,
        postUrl: secure_url,
        postType: resource_type,
        caption: caption || "",
    });

    const populatedPost = await Post.findById(post._id)
        .populate("author", "username imageUrl");

    return NextResponse.json({
        message: "File uploaded successfully.",
        success: true,
        status: 200,
        post: populatedPost,
    });
});
