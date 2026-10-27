import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Notification from "@/backend/models/notification";
import User from "@/backend/models/user";
import Follow from "@/backend/models/follow";

export const POST = withErrorHandler(
  async (request: NextRequest) => {
    const authUser = await getAuthUser();

    if (!authUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: { targetUserId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { targetUserId } = body;

    if (
      typeof targetUserId !== "string" ||
      !mongoose.isValidObjectId(targetUserId) ||
      !mongoose.isValidObjectId(authUser.userId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const followerId = new mongoose.Types.ObjectId(authUser.userId);
    const followingId = new mongoose.Types.ObjectId(targetUserId);

    if (followerId.equals(followingId)) {
      return NextResponse.json(
        { success: false, message: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    await Connect();

    const session = await mongoose.startSession();

    try {
      let result:
        | {
            isFollowing: boolean;
            followers: number;
            following: number;
          }
        | undefined;

      let notificationId: mongoose.Types.ObjectId | undefined;

      await session.withTransaction(async () => {
        const [currentUser, targetUser] = await Promise.all([
          User.findById(followerId)
            .select("_id followers following")
            .session(session),

          User.findById(followingId)
            .select("_id followers following")
            .session(session),
        ]);

        if (!currentUser || !targetUser) {
          throw new Error("FOLLOW_USER_NOT_FOUND");
        }

        const existing = await Follow.findOne({
          follower: followerId,
          following: followingId,
        }).session(session);

        if (existing) {
          // Unfollow
          const deleted = await Follow.deleteOne(
            { _id: existing._id },
            { session }
          );

          if (deleted.deletedCount !== 1) {
            throw new Error("FOLLOW_STATE_CHANGED");
          }

          await User.updateOne(
            {
              _id: followerId,
              following: { $gt: 0 },
            },
            { $inc: { following: -1 } },
            { session }
          );

          await User.updateOne(
            {
              _id: followingId,
              followers: { $gt: 0 },
            },
            { $inc: { followers: -1 } },
            { session }
          );

          result = {
            isFollowing: false,
            followers: Math.max(0, targetUser.followers - 1),
            following: Math.max(0, currentUser.following - 1),
          };
        } else {
          // Follow
          await Follow.create(
            [
              {
                follower: followerId,
                following: followingId,
              },
            ],
            { session }
          );

          await User.updateOne(
            { _id: followerId },
            { $inc: { following: 1 } },
            { session }
          );

          await User.updateOne(
            { _id: followingId },
            { $inc: { followers: 1 } },
            { session }
          );

          // Create the follow notification only once.
          const notificationResult = await Notification.updateOne(
            {
              recipient: followingId,
              actor: followerId,
              type: "follow",
            },
            {
              $setOnInsert: {
                read: false,
              },
            },
            {
              upsert: true,
              session,
            }
          );

          // Emit a real-time event only for a newly inserted notification.
          if (
            notificationResult.upsertedCount === 1 &&
            notificationResult.upsertedId
          ) {
            notificationId =
              notificationResult.upsertedId as mongoose.Types.ObjectId;
          }

          result = {
            isFollowing: true,
            followers: targetUser.followers + 1,
            following: currentUser.following + 1,
          };
        }
      });

      if (!result) {
        throw new Error("FOLLOW_OPERATION_FAILED");
      }

      // Emit the notification only after the transaction commits.
      if (result.isFollowing && notificationId) {
        const notification = await Notification.findById(
          notificationId
        ).populate("actor", "_id username imageUrl");

        if (notification) {
          const notificationData = {
            _id: notification._id.toString(),
            actor: notification.actor,
            type: notification.type,
            read: notification.read,
            createdAt: notification.createdAt,
          };

          // Send to the recipient's authenticated Socket.IO room.
          globalThis.brizaIO
            ?.to(`user:${followingId.toString()}`)
            .emit("notification:new", notificationData);
        }
      }

      return NextResponse.json({
        success: true,
        message: result.isFollowing
          ? "User followed successfully"
          : "User unfollowed successfully",
        ...result,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "FOLLOW_USER_NOT_FOUND"
      ) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }
);