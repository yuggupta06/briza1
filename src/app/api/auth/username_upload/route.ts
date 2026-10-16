import { NextRequest, NextResponse } from "next/server";
import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(
  async (request: NextRequest) => {
    await Connect();

    const reqBody = await request.json();
    const { clerkId, username } = reqBody;

    const userFind = await User.findOne({ username });

    if (userFind) {
      return NextResponse.json(
        {
          message: "This username is already taken.",
        },
        { status: 409 }
      );
    }

    const currentUser = await User.findOneAndUpdate(
      { clerkId },
      { $set: { username } },
      { new: true }
    ).select("username");

    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Username updated successfully.",
        success: true,
        updatedUsername: currentUser.username,
      },
      { status: 200 }
    );
  }
);