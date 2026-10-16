import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { NextRequest, NextResponse } from "next/server";

import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (req: NextRequest) => {
    await Connect();
        const reqBody = await req.json();
        const { searchValue } = reqBody;
        const users = await User.find({
            username: { $regex:  `^${searchValue}`, $options: "i"}   //  i = case-insensitive
        });
        return NextResponse.json({
            message:"All search Users.",
            users
        })
});