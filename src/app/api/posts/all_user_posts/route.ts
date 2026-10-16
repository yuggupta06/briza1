import { Connect } from "@/backend/lib/dbConnect";
import { NextRequest, NextResponse } from "next/server";
import User from "@/backend/models/user";
// import { PostType } from "@/types/types";

import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (request: NextRequest) => {
    await Connect();
    const user_with_images=[];
    
        const reqBody=await request.json();
        const {images}=reqBody
        for (let index = 0; index < images.length; index++) {
            const url = images[index].secure_url;
            const user=await User.findOne(
                {"posts.posturl":url,"posts.deleted":false},
                { "clerkId": 1, "username": 1, "imageUrl": 1, posts:{$elemMatch:{posturl:url,deleted:false}} }
                )
                    
                    if(user && user.posts.length>0){
                        user_with_images.push({
                            user,
                        });
                    }
                }
        return NextResponse.json({
            message:"All users with their posts.",
            user_with_images
        });
});