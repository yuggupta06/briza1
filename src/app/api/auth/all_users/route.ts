import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";

export const GET = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const authUser = await getAuthUser();
  const userId = authUser.userId;

  const users = await User.find(
    { _id: { $ne: userId } },
    "_id name username imageUrl socketId"
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