
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import "@/backend/models/user";
import {
    decodeCursor,
    encodeCursor,
} from "@/backend/lib/validations/cursor";
import Notification from "@/backend/models/notification";
const PAGE_SIZE = 7;

export const GET = withErrorHandler(async (request: NextRequest) => {
    await Connect();

    const authUser = await getAuthUser();

    if (!authUser?.userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    const recipient = new mongoose.Types.ObjectId(authUser.userId);

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");

    const decodedCursor = cursor
        ? decodeCursor(cursor)
        : null;

    if (cursor && !decodedCursor) {
        return NextResponse.json(
            { success: false, message: "Invalid cursor" },
            { status: 400 }
        );
    }

    const filter: Record<string, unknown> = {
        recipient,
    };

    if (decodedCursor) {
        filter.$or = [
            { createdAt: { $lt: decodedCursor.createdAt } },
            {
                createdAt: decodedCursor.createdAt,
                _id: { $lt: decodedCursor.id },
            },
        ];
    }

    const [notifications, unreadCount] = await Promise.all([
        Notification.find(filter)
            .populate("actor", "_id username imageUrl")
            .sort({ createdAt: -1, _id: -1 })
            .limit(PAGE_SIZE + 1)
            .lean(),

        Notification.countDocuments({
            recipient,
            read: false,
        }),
    ]);

    const hasMore = notifications.length > PAGE_SIZE;

    if (hasMore) {
        notifications.pop();
    }

    const lastNotification = notifications.at(-1);

    const nextCursor =
        hasMore && lastNotification
            ? encodeCursor({
                createdAt: lastNotification.createdAt,
                id: lastNotification._id as mongoose.Types.ObjectId,
            })
            : null;

    return NextResponse.json({
        success: true,
        notifications,
        unreadCount,
        pagination: {
            hasMore,
            nextCursor,
        },
    });
});
