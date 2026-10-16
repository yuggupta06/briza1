import { NextRequest,NextResponse } from "next/server";
import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";

import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (request: NextRequest) => {
    await Connect();
        const reqBody=await request.text();
        const searchUser=await User.findOne({username:reqBody})
        if(searchUser){
            return NextResponse.json({
                message:"User Found.",
                searchUser,
                status:202
            })
        };
        return NextResponse.json({
            message:"User not found",
            status:404
        })
});