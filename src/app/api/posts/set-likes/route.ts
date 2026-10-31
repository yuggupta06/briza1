
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import Like from "@/backend/models/like";
import Notification from "@/backend/models/notification";
import Post from "@/backend/models/post";

import { broadcastNotification } from "@/backend/lib/notifications/broadcastNotification";

export const POST = withErrorHandler(async (req: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();
  const body = await req.json();

  const { postId, liked } = body;

  if (
    typeof postId !== "string" ||
    !mongoose.isValidObjectId(postId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid post ID" },
      { status: 400 }
    );
  }

  if (typeof liked !== "boolean") {
    return NextResponse.json(
      { success: false, message: "liked must be a boolean" },
      { status: 400 }
    );
  }

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json(
      { success: false, message: "Invalid authenticated user" },
      { status: 401 }
    );
  }

  const postObjectId = new mongoose.Types.ObjectId(postId);
  const authorObjectId = new mongoose.Types.ObjectId(userId);

  // Fetch post and its author.
  const post = (await Post.findOne({
    _id: postObjectId,
    deleted: { $ne: true },
  })
    .select("author")
    .lean()) as { author?: mongoose.Types.ObjectId | null } | null;

  if (!post || !post.author) {
    return NextResponse.json(
      { success: false, message: "Post not found" },
      { status: 404 }
    );
  }

  const postAuthor = post.author;
  const recipientId = postAuthor.toString();

  const filter = {
    post: postObjectId,
    author: authorObjectId,
  };

  if (liked) {
    try {
      const result = await Like.updateOne(
        filter,
        { $setOnInsert: filter },
        { upsert: true }
      );

      // Only process a newly created Like.
      if (result.upsertedCount === 1) {
        await Post.updateOne(
          { _id: postObjectId },
          { $inc: { likesCount: 1 } }
        );

        // Don't notify users about their own likes.
        if (recipientId !== userId.toString()) {
          try {
            const notificationFilter = {
              recipient: postAuthor,
              actor: authorObjectId,
              type: "like",
              post: postObjectId,
            };

            const notificationResult = await Notification.updateOne(
              notificationFilter,
              {
                $setOnInsert: {
                  recipient: postAuthor,
                  actor: authorObjectId,
                  type: "like",
                  post: postObjectId,
                  comment: null,
                  read: false,
                },
              },
              {
                upsert: true,
                setDefaultsOnInsert: true,
              }
            );

            // Only broadcast if a new notification was inserted.
            if (notificationResult.upsertedCount === 1) {
              const notification = (await Notification.findById(
                notificationResult.upsertedId
              )
                .populate("actor", "username imageUrl")
                .lean()) as {
                  _id: mongoose.Types.ObjectId;
                  actor: {
                    _id: mongoose.Types.ObjectId;
                    username: string;
                    imageUrl?: string | null;
                  };
                  post?: mongoose.Types.ObjectId | null;
                  comment?: mongoose.Types.ObjectId | null;
                  read: boolean;
                  createdAt: Date;
                } | null;

              if (notification) {
                console.log(notification)
                await broadcastNotification({
                  notification: {
                    _id: notification._id.toString(),
                    recipient: recipientId,
                    actor: {
                      _id: notification.actor._id.toString(),
                      username: notification.actor.username,
                      imageUrl: notification.actor.imageUrl ?? "",
                    },
                    type: "like",
                    post: String(notification.post) ,
                    comment: String(notification.comment) ,
                    read: notification.read,
                    createdAt: notification.createdAt.toISOString(),
                  },
                });
              }
            }
          } catch (error) {
            // A notification failure should not undo a successful like.
            console.error("Like notification failed:", error);
          }
        }
      }
    } catch (error: unknown) {
      const isDuplicateKey =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000;

      // Another concurrent request may have inserted this Like.
      if (!isDuplicateKey) {
        throw error;
      }
    }
  } else {
    const result = await Like.deleteOne(filter);

    if (result.deletedCount === 1) {
      await Post.updateOne(
        { _id: postObjectId },
        { $inc: { likesCount: -1 } }
      );
    }
  }

  const [likeExists, updatedPost] = await Promise.all([
    Like.exists(filter),
    Post.findById(postObjectId)
      .select("likesCount")
      .lean(),
  ]);

  if (!updatedPost) {
    return NextResponse.json(
      { success: false, message: "Post not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    isLiked: Boolean(likeExists),
    likesCount: (updatedPost as { likesCount?: number }).likesCount ?? 0,
  });
});
