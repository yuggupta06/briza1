
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import { broadcastNotification } from "@/backend/lib/notifications/broadcastNotification";

import Comment from "@/backend/models/comment";
import Notification from "@/backend/models/notification";
import Post from "@/backend/models/post";

import { pusher } from "@/backend/lib/pusher";

export const POST = withErrorHandler(async (request: NextRequest) => {
  await Connect();

  const { userId } = await getAuthUser();

  // Parse request body.
  let body: { postId?: unknown; text?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { postId, text } = body;

  // Validate post ID.
  if (
    typeof postId !== "string" ||
    !mongoose.isValidObjectId(postId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid post ID" },
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

  // Validate comment text.
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { success: false, message: "Comment text is required" },
      { status: 400 }
    );
  }

  const trimmedText = text.trim();

  if (trimmedText.length > 500) {
    return NextResponse.json(
      {
        success: false,
        message: "Comment cannot exceed 500 characters",
      },
      { status: 400 }
    );
  }

  const postObjectId = new mongoose.Types.ObjectId(postId);
  const authorObjectId = new mongoose.Types.ObjectId(userId);

  // Fetch post and increment comment count.
  const post = (await Post.findOneAndUpdate(
    {
      _id: postObjectId,
      deleted: { $ne: true },
    },
    {
      $inc: { commentsCount: 1 },
    },
    { new: true }
  )
    .select("_id author")
    .lean()) as {
      _id: mongoose.Types.ObjectId;
      author: mongoose.Types.ObjectId;
    } | null;

  if (!post || !post.author) {
    return NextResponse.json(
      { success: false, message: "Post not found" },
      { status: 404 }
    );
  }

  const recipientId = post.author.toString();

  let comment;

  try {
    // Create and persist comment.
    comment = await Comment.create({
      post: postObjectId,
      author: authorObjectId,
      text: trimmedText,
    });
  } catch (error) {
    // Roll back comment count if comment creation fails.
    await Post.updateOne(
      { _id: postObjectId },
      { $inc: { commentsCount: -1 } }
    );

    throw error;
  }

  // Populate comment author for the client.
  const populatedComment = await Comment.findById(comment._id)
    .select("post author text createdAt updatedAt")
    .populate("author", "_id username imageUrl")
    .lean();

  // Publish the comment to users subscribed to this post.
  if (populatedComment) {
    try {
      await pusher.trigger(
        `private-post-${postId}`,
        "new-comment",
        {
          comment: populatedComment,
        }
      );
    } catch (error) {
      console.error(
        "[Pusher] Failed to publish new-comment:",
        error
      );
    }
  }

  // Create notification for the post author.
  // Don't notify users about their own comments.
  if (recipientId !== userId.toString()) {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          recipient: post.author,
          actor: authorObjectId,
          type: "comment",
          comment: comment._id,
        },
        {
          $set: {
            read: false,
            createdAt: new Date(),
          },
          $setOnInsert: {
            recipient: post.author,
            actor: authorObjectId,
            type: "comment",
            post: postObjectId,
            comment: comment._id,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      )
        .populate("actor", "_id username imageUrl")
        .lean();

      if (notification) {
        const notificationData = notification as unknown as {
          _id: mongoose.Types.ObjectId;
          recipient: mongoose.Types.ObjectId;
          actor: {
            _id: mongoose.Types.ObjectId;
            username: string;
            imageUrl: string;
          };
          post?: mongoose.Types.ObjectId | null;
          comment?: mongoose.Types.ObjectId | null;
          read: boolean;
          createdAt: Date;
        };

        if (notificationData.actor?._id) {
          await broadcastNotification({
            notification: {
              _id: notificationData._id.toString(),
              recipient: notificationData.recipient.toString(),
              actor: {
                _id: String(notificationData.actor._id),
                username: notificationData.actor.username,
                imageUrl: notificationData.actor.imageUrl,
              },
              type: "comment",
              post: String(notificationData.post) ,
              comment: String(notificationData.comment),
              read: notificationData.read,
              createdAt: notificationData.createdAt.toISOString(),
            },
          });
        }
      }
    } catch (error) {
      // Notification failure must not undo a successfully created comment.
      console.error("[Comment] Notification failed:", error);
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: "Comment posted successfully",
      comment: populatedComment ?? {
        _id: comment._id.toString(),
        post: postId,
        author: userId,
        text: trimmedText,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
});
