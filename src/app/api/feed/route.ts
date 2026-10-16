
import { NextRequest, NextResponse } from "next/server";
import { Connect } from "@/backend/lib/dbConnect";
import "@/backend/models/user";
import Post from "@/backend/models/post";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";

export const GET = withErrorHandler(async (req: NextRequest) => {
  await getAuthUser();

  
    const cursor = req.nextUrl.searchParams.get("cursor");

    // Validate the cursor before querying MongoDB.
    if (cursor && !/^[a-fA-F0-9]{24}$/.test(cursor)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pagination cursor",
        },
        { status: 400 }
      );
    }

    // Connection errors are caught too.
    await Connect();

    const posts = await Post.find({
        deleted: false,
        ...(cursor && { _id: { $lt: cursor } }),
      })
        .sort({ _id: -1 })
        .limit(3)
        .select(
          " author postUrl postType likes  "
        )
        .populate("author", "username imageUrl")
        .lean();

    const hasMore = posts.length > 2;
    const page = posts.slice(0, 2);

    return NextResponse.json(
      {
        success: true,
        posts: page,
        nextCursor: hasMore
          ? String(page[page.length - 1]._id)
          : null,
        hasMore,
      },
      { status: 200 }
    );
});
