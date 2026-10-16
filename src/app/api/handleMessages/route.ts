import { NextRequest, NextResponse } from "next/server";
import { Connect } from "@/backend/lib/dbConnect";
import UserChat from "@/models/chatModel"
import {Redis} from "@upstash/redis";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";


export const redis =new Redis({
    url:process.env.UPSTASH_REDIS_REST_URL,
    token:process.env.UPSTASH_REDIS_REST_TOKEN
});

export const POST = withErrorHandler(async (req: NextRequest) => {
    await Connect();
    
        const  reqBody=await req.json();
        const {username1,username2}=reqBody
        const combinedName=[username1,username2].sort().join('&')
        let messages=await redis.lrange(combinedName,-100,-1);
        return NextResponse.json({messages})
    
}
);