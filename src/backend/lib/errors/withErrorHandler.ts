import { NextRequest, NextResponse } from "next/server";
import { errorHandler } from "./errorHandler";

type ApiHandler = (
  request: NextRequest
) => Promise<NextResponse>;

export function withErrorHandler(
  handler: ApiHandler
): ApiHandler {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error: unknown) {
      return errorHandler(error);
    }
  };
}