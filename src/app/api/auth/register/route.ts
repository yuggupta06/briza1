import { NextRequest, NextResponse } from "next/server";
import { Connect } from "@/backend/lib/dbConnect";
import User from "@/backend/models/user";
import { signupSchema } from "@/backend/lib/validations/auth";
import argon2 from "argon2";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async (request: NextRequest) => {
    const body: unknown = await request.json();

    // 1. Validate incoming data
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error.issues[0]?.message ?? "Invalid request",
        },
        { status: 400 }
      );
    }

    // 2. Use validated data
    const { name, username, email, password } = result.data;

    // 3. Connect to database
    await Connect();

    // 4. Check for an existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email or username already exists" },
        { status: 409 }
      );
    }

    // 5. Hash password before saving
     // Convert the original password into a bcrypt hash.
    const hashedPassword = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 19456, // 19 MiB
            timeCost: 2,
            parallelism: 1,
            });

    const user =await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      imageUrl: "https://res.cloudinary.com/dy8ibm7de/image/upload/v1792071457/m4ub6g8flwqhspgnyvua.avif", // Default image URL
      followers: 0,
      following: 0,
    });
    await user.save();

    return NextResponse.json(
      { success: true, message: "User created successfully" },
      { status: 200 }
    );
});