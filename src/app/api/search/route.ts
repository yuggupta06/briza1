import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";

export const POST = withErrorHandler(async (req: NextRequest) => {
    await getAuthUser()
  await Connect();
  const { searchValue } = await req.json();

  if (typeof searchValue !== "string") {
    return NextResponse.json(
      { message: "Search value must be a string.", users: [] },
      { status: 400 }
    );
  }

  const value = searchValue.trim();

  if (!value) {
    return NextResponse.json({
      message: "No search value provided.",
      users: [],
    });
  }

  if (value.length > 30) {
    return NextResponse.json(
      { message: "Search value is too long.", users: [] },
      { status: 400 }
    );
  }

  // Escape regex special characters so input is treated as plain text.
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const users = await User.find({
    username: {
      $regex: `^${escapedValue}`,
      $options: "i",
    },
  })
    .select("_id username imageUrl")
    .limit(10)
    .lean();

  return NextResponse.json({
    message: "Search completed successfully.",
    users,
  });
});