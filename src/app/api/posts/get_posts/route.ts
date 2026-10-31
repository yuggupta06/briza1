import { Connect } from "@/backend/lib/dbConnect";
import { NextRequest, NextResponse } from "next/server";
import User from "@/backend/models/user";
// import { PostType } from "@/types/types";

import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (request: NextRequest) => {
    await Connect();
    
        const reqBody = await request.json();
        const { clerkId } = reqBody;

        const user = await User.aggregate([
            { $match: { clerkId } },
            {
                $project: {
                    posts: {
                        $map: {
                            input: "$posts",
                            as: "post",
                            in: {
                                $cond: [
                                    { $eq: ["$$post.deleted", false] },
                                    {
                                        posturl: "$$post.posturl",
                                        postType: "$$post.postType",
                                        // comments excluded
                                    },
                                    null // if deleted, return null
                                ]
                            }
                        }
                    }
                }
            },
            {
                // remove nulls left by deleted posts
                $set: {
                    posts: {
                        $filter: {
                            input: "$posts",
                            as: "p",
                            cond: { $ne: ["$$p", null] }
                        }
                    }
                }
            }
        ]);

        console.log(user[0].posts)
        return NextResponse.json({
            message: "Posts fetched Succesfully",
            posts: user[0].posts
        })
});
