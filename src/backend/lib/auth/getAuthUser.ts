
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

function createAuthError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

export async function getAuthUser() {
  const token = (await cookies()).get("token")?.value;
  console.log("token", token);
  if (!token) {
    throw createAuthError("Authentication required", 401);
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    if (typeof payload.userId !== "string") {
      throw createAuthError("Invalid authentication token", 401);
    }

    return { userId: payload.userId };
  } catch (error) {
    // Preserve our intentional authentication errors.
    if (
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      throw error;
    }

    // Invalid signature, expired token, malformed token, etc.
    throw createAuthError("Invalid or expired token", 401);
  }
}
