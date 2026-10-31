
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import Notification from "@/backend/models/notification";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { isValidObjectId } from "@/backend/lib/validations/objectId";

export const DELETE = withErrorHandler(
  async (request: NextRequest) => {
    const { userId } = await getAuthUser();

    const body = await request.json();
    const { notificationId } = body;

    if (!isValidObjectId(notificationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid notification ID",
        },
        { status: 400 }
      );
    }

    await Connect();

    // Delete only if the notification belongs to the
    // authenticated recipient.
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
    });
  }
);
