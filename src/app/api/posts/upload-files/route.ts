import {NextRequest, NextResponse } from "next/server";
import {Connect} from "@/backend/lib/dbConnect"
import Post from "@/backend/models/post";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";

export const POST = withErrorHandler(async (request: NextRequest) => {
    const author = await getAuthUser();
    
    await Connect();
        const reqBody=await request.json();
        const {secure_url,resource_type}=reqBody;

        const post =await Post.create({
            author:author.userId,
            postUrl:secure_url,
            postType:resource_type,
        });

        await post.save();
        
        return NextResponse.json({
            message:"File upload successfully.",
            success:true,
            status:200,
            post
        })
});