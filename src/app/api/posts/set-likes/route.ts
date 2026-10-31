import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";


import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (req: NextRequest) => {
    await Connect();
    const { userId } = await auth();
    

        const reqBody = await req.json();
        const { userClerkId, url } = reqBody;
        const updatedUser = await User.findOneAndUpdate(
            { clerkId: userClerkId }, // find the user
            [
                {
                    $set: {
                        posts: {
                            $map: {
                                input: "$posts",   // loop through each post
                                as: "post",        // alias for each post
                                in: {
                                    $cond: [
                                        { $eq: ["$$post.posturl", url] }, // find the matching post
                                        {
                                            $mergeObjects: [
                                                "$$post",
                                                {
                                                    likes: {
                                                        $cond: [
                                                            { $in: [userId, "$$post.likes"] },
                                                            { $setDifference: ["$$post.likes", [String(userId)]] },
                                                            { $concatArrays: ["$$post.likes", [String(userId)]] },
                                                        ],
                                                    },
                                                },
                                            ],
                                        },
                                        "$$post",
                                    ],
                                },
                            },
                        },
                    },
                }
            ],
            { new: true }
        );
        return NextResponse.json({
            user: updatedUser,
            url
        })
});
