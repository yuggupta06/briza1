import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const GET = withErrorHandler(async (request:NextRequest) => {
  await Connect();

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { message: "Unauthorized", success: false },
      { status: 401 }
    );
  }

  const users = await User.find(
    { clerkId: { $ne: userId } },
    "clerkId name username imageUrl socketId"
  );

  return NextResponse.json(
    {
      message: "Users fetched successfully",
      success: true,
      users,
    },
    { status: 200 }
  );
});