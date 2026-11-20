

import { NextRequest, NextResponse } from "next/server";
import { errorHandler } from "./errorHandler";

export function withErrorHandler<TArgs extends unknown[]>(
  handler: (
    request: NextRequest,
    ...args: TArgs
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    ...args: TArgs
  ): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error: unknown) {
      return errorHandler(error);
    }
  };
}
