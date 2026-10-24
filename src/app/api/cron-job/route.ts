import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { Connect } from "@/backend/lib/dbConnect";
import cloudinary from "@/backend/lib/cloudinary";
import User from "@/backend/models/user";

const getPublicIdFromUrl = (url: string) => {
  const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

async function deleteImage(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get("key");

  if (secret !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json(
      { message: "Unauthorized", success: false },
      { status: 401 }
    );
  }

  await Connect();

  try {
    const users = await User.find({ "posts.deleted": true });

    for (const user of users) {
      const remainingPosts: Array<{ deleted?: boolean; posturl?: string; [key: string]: unknown }> = [];

      for (const post of user.posts ?? []) {
        if (post.deleted === true) {
          const publicId = getPublicIdFromUrl(post.posturl);
          if (publicId) {
            await deleteImage(publicId);
          }
        } else {
          remainingPosts.push(post);
        }
      }

      user.posts = remainingPosts;
      await user.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : String(error), success: false },
      { status: 500 }
    );
  }
});

export const config = {
  runtime: "nodejs",
};
