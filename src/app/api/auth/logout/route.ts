
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";

export const POST = withErrorHandler(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_request: NextRequest) => {
    await getAuthUser(); // Ensure the user is authenticated before logging out
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 }
    );

    // Clear the JWT authentication cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  }
);
