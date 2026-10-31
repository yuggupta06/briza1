
import { NextRequest, NextResponse } from "next/server";


import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import {Connect} from "@/backend/lib/dbConnect";
import Notification from "@/backend/models/notification";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { isValidObjectId } from "@/backend/lib/validations/objectId";

export const PATCH = withErrorHandler(
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

    // Mark as read only if this notification belongs to the
    // authenticated recipient and is currently unread.
    const result = await Notification.updateOne(
      {
        _id: notificationId,
        recipient: userId,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({
        success: true,
        alreadyRead: false,
        message: "Notification marked as read",
      });
    }

    // Distinguish an already-read notification from a missing
    // notification or one belonging to another user.
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    })
      .select("_id read")
      .lean();

    if (!notification) {
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
      alreadyRead: true,
      message: "Notification is already read",
    });
  }
);
