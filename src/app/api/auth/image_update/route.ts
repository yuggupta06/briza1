import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Image update is not configured on this deployment." },
    { status: 501 },
  );
}
