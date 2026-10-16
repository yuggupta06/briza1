import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest,NextResponse } from "next/server";


import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (request: NextRequest) => {
    await Connect();
    const { userId } = await auth();
        const reqBody=await request.json();
        const {comment,user,url}=reqBody;
        const currentUser=await User.findOne({clerkId:userId});
        const updatedUser=await User.findOneAndUpdate(
            {clerkId:user.clerkId,"posts.posturl":url},
            {$push:
                {
                    "posts.$.comments":{
                        $each:[{
                            username:currentUser.username,
                            imageUrl:currentUser.imageUrl,
                            text:comment
                        }],
                        $position:0
                    },
                }
            },
            {new:true}
        )
        const updatedPost=updatedUser.posts.find((p:{posturl:string})=>p.posturl===url)
        return NextResponse.json({
            message:"The comment is been posted.",
            success:true,
            commentArray:updatedPost?.comments ?? []
        })
});