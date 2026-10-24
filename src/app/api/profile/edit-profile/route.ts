
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";

export const POST = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();
  const { username, imageUrl } = await request.json();

  if (!username?.trim()) {
    return NextResponse.json(
      { success: false, message: "Username is required." },
      { status: 400 }
    );
  }

  const normalizedUsername = username.trim().toLowerCase();

  const existingUser = await User.findOne({
    username: normalizedUsername,
    _id: { $ne: userId },
  })
    .select("_id")
    .lean();

  if (existingUser) {
    return NextResponse.json(
      { success: false, message: "This username is already taken." },
      { status: 409 }
    );
  }

  const updateFields: { username: string; imageUrl?: string } = {
    username: normalizedUsername,
  };

  if (imageUrl !== undefined) {
    updateFields.imageUrl = imageUrl;
  }

  const currentUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("username imageUrl");

  if (!currentUser) {
    return NextResponse.json(
      { success: false, message: "User not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Profile updated successfully.",
      user:currentUser,
    },
    { status: 200 }
  );
});
