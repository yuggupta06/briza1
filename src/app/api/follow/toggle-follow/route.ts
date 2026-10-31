
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { broadcastNotification } from "@/backend/lib/notifications/broadcastNotification";

import Follow from "@/backend/models/follow";
import Notification from "@/backend/models/notification";
import User from "@/backend/models/user";

export const POST = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();

  const body = await request.json();
  const { targetUserId } = body as { targetUserId?: unknown };

  // Validate target user ID.
  if (
    typeof targetUserId !== "string" ||
    !mongoose.isValidObjectId(targetUserId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid user ID" },
      { status: 400 }
    );
  }

  // Validate authenticated user ID.
  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json(
      { success: false, message: "Invalid authenticated user" },
      { status: 401 }
    );
  }

  const followerId = new mongoose.Types.ObjectId(userId);
  const followingId = new mongoose.Types.ObjectId(targetUserId);

  // Prevent following yourself.
  if (followerId.equals(followingId)) {
    return NextResponse.json(
      { success: false, message: "You cannot follow yourself" },
      { status: 400 }
    );
  }

  const session = await mongoose.startSession();

  let result:
    | {
      isFollowing: boolean;
      followers: number;
      following: number;
    }
    | undefined;

  let notificationId: mongoose.Types.ObjectId | undefined;

  try {
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

      const existingFollow = await Follow.findOne({
        follower: followerId,
        following: followingId,
      }).session(session);

      if (existingFollow) {
        // Unfollow.
        const deleted = await Follow.deleteOne(
          { _id: existingFollow._id },
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
        // Follow.
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

        // Create the notification only once.
        const notificationResult = await Notification.updateOne(
          {
            recipient: followingId,
            actor: followerId,
            type: "follow",
          },
          {
            $setOnInsert: {
              recipient: followingId,
              actor: followerId,
              type: "follow",
              post: null,
              comment: null,
              read: false,
            },
          },
          {
            upsert: true,
            session,
          }
        );

        // Save the ID only if a new notification was inserted.
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
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "FOLLOW_USER_NOT_FOUND"
    ) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Handle concurrent requests that attempt to create
    // the same follow relationship.
    const isDuplicateKey =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000;

    if (isDuplicateKey) {
      const [currentUser, targetUser, existingFollow] = await Promise.all([
        User.findById(followerId).select("following").lean(),
        User.findById(followingId).select("followers").lean(),
        Follow.exists({
          follower: followerId,
          following: followingId,
        }),
      ]);

      if (!currentUser || !targetUser) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }

      const targetFollowers = Array.isArray(targetUser)
        ? targetUser[0]?.followers
        : targetUser.followers;
      const currentFollowing = Array.isArray(currentUser)
        ? currentUser[0]?.following
        : currentUser.following;

      result = {
        isFollowing: Boolean(existingFollow),
        followers: targetFollowers ?? 0,
        following: currentFollowing ?? 0,
      };
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  if (!result) {
    throw new Error("FOLLOW_OPERATION_FAILED");
  }

  // Broadcast only after the transaction has committed.
  // Notification errors must not undo a successful follow.
  if (result.isFollowing && notificationId) {
    try {
      const notification = await Notification.findById(notificationId)
        .populate("actor", "_id username imageUrl")
        .lean();

      const notificationRecord = Array.isArray(notification)
        ? notification[0]
        : notification;

      if (notificationRecord) {
        const notificationData = notificationRecord as unknown as {
          _id: mongoose.Types.ObjectId;
          recipient: mongoose.Types.ObjectId;
          actor: {
            _id: mongoose.Types.ObjectId;
            username: string;
            imageUrl: string;
          };
          post?: mongoose.Types.ObjectId | null;
          comment?: mongoose.Types.ObjectId | null;
          type: string;
          read: boolean;
          createdAt: Date;
        };

        if (notificationData.actor?._id) {
          await broadcastNotification({
            notification: {
              _id: notificationData._id.toString(),
              recipient: notificationData.recipient.toString(),
              actor: {
                _id: notificationData.actor._id.toString(),
                username: notificationData.actor.username,
                imageUrl: notificationData.actor.imageUrl,
              },
              type: "follow",
              post: notificationData.post?.toString() ?? null,
              comment: notificationData.comment?.toString() ?? null,
              read: notificationData.read,
              createdAt: notificationData.createdAt.toISOString(),
            },
          });
        }
      }
    } catch (error) {
      console.error("Follow notification failed:", error);
    }
  }

  return NextResponse.json({
    success: true,
    message: result.isFollowing
      ? "User followed successfully"
      : "User unfollowed successfully",
    ...result,
  });
});
