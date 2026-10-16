import { NextRequest, NextResponse } from "next/server";
import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { loginSchema } from "@/backend/lib/validations/auth";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import argon2 from "argon2";
import { SignJWT } from "jose";

export const POST = withErrorHandler(
  async (request: NextRequest) => {
    // 1. Parse request
    const body: unknown = await request.json();

    // 2. Validate input
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            result.error.issues[0]?.message ?? "Invalid request",
        },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // 3. Connect to MongoDB
    await Connect();

    // 4. Find user
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // 5. Verify password
    const isPasswordValid = await argon2.verify(
      user.password,
      password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // 6. Generate JWT
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const secretKey = new TextEncoder().encode(secret);

    const token = await new SignJWT({
      userId: user._id.toString(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

    // 7. Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          email: user.email,
          imageUrl: user.imageUrl,
        },
      },
      { status: 200 }
    );

    // 8. Store JWT in HTTP-only cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  }
);