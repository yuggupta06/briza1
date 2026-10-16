
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { getAuthUser } from "./getAuthUser";

export function withAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withErrorHandler(async (request: NextRequest) => {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(request);
  });
}
