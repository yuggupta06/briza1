import { NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  // Only apply the ownership check to search profile routes.
  if (pathname==="/" || pathname.startsWith("/search") || pathname.startsWith("/profile") || pathname.startsWith("/upload") || pathname.startsWith("/messages")    ) {

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // let userId: string | undefined;

    // try {
    //   const secret = process.env.JWT_SECRET;

    //   if (!secret) {
    //     throw new Error("JWT_SECRET is not configured");
    //   }

    //   const { payload } = await jwtVerify(
    //     token,
    //     new TextEncoder().encode(secret)
    //   );

    //   if (typeof payload.userId !== "string") {
    //     return NextResponse.redirect(new URL("/login", request.url));
    //   }

    //   userId = payload.userId;
    // } catch {
    //   return NextResponse.redirect(new URL("/login", request.url));
    // }

    // const username = pathname.split("/")[2];

    try {
      // const response = await axios.post(
      //   `${origin}/api/check_ownership`,
      //   { username, userId },
      //   {
      //     headers: {
      //       Cookie: request.headers.get("cookie") ?? "",
      //     },
      //   }
      // );

      // if (response.data.success) {
      //   return NextResponse.redirect(new URL("/profile", request.url));
      // }
    } catch {
      // Let the ownership API handle its own errors.
      // Do not redirect on an API failure.
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
