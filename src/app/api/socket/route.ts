import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (req: NextRequest) => {
  await Connect();

  const reqBody = await req.json();
  const { socketId, userId } = reqBody;
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { socketId } },
    { new: true }
  );

  return NextResponse.json({
    message: "Succesfully set socket id",
    status: 202,
    myProfileName: updatedUser?.username,
  });
});
