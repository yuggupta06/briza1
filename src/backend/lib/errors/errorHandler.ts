import { NextResponse } from "next/server";

function isAppError(error: unknown): error is Error & { statusCode: number } {
  return (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}

export function errorHandler(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: error.statusCode,
      }
    );
  }

  // Log unexpected errors centrally
  console.error("[API ERROR]", error);

  return NextResponse.json(
    {
      success: false,
      message: "Internal server error",
    },
    {
      status: 500,
    }
  );
}