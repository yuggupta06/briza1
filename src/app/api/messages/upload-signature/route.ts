import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

export const POST = withErrorHandler(async () => {
    const user = await getAuthUser();

    await Connect();

    const timestamp = Math.round(Date.now() / 1000);

    const folder = `briza/messages/${user.userId}`;

    const paramsToSign = {
        timestamp,
        folder,
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
        success: true,
        signature,
        timestamp,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
});