import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { Connect } from "@/backend/lib/dbConnect";
import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";

import User from "@/backend/models/user";
import Post from "@/backend/models/post";
import Comment from "@/backend/models/comment";
import Like from "@/backend/models/like";

export const DELETE = withErrorHandler(async () => {
  await Connect();

  // Identify the user from the authenticated HTTP-only cookie.
  const { userId } = await getAuthUser();

  const accountId = new mongoose.Types.ObjectId(userId);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // 1. Find every post owned by this user.
      const ownPosts = await Post.find({ author: accountId })
        .select("_id")
        .session(session)
        .lean();

      const ownPostIds = ownPosts.map((post) => post._id);

      // 2. Find likes this user gave to other people's posts.
      // Likes on their own posts don't need count adjustments because
      // those posts will be deleted.
      const externalLikeCounts = await Like.aggregate([
        {
          $match: {
            author: accountId,
            post: { $nin: ownPostIds },
          },
        },
        {
          $group: {
            _id: "$post",
            count: { $sum: 1 },
          },
        },
      ]).session(session);

      // 3. Keep likesCount accurate on posts that will remain.
      for (const item of externalLikeCounts) {
        await Post.updateOne(
          { _id: item._id },
          [
            {
              $set: {
                likesCount: {
                  $max: [
                    0,
                    {
                      $subtract: [
                        { $ifNull: ["$likesCount", 0] },
                        item.count,
                      ],
                    },
                  ],
                },
              },
            },
          ],
          { session }
        );
      }

      // 4. Delete likes created by this user and likes on their posts.
      await Like.deleteMany(
        {
          $or: [
            { author: accountId },
            { post: { $in: ownPostIds } },
          ],
        },
        { session }
      );

      
      // 5. Count replies authored by this user on root comments
      // that will remain after account deletion.
      const replyCounts = await Comment.aggregate([
        {
          $match: {
            author: accountId,
            parentCommentId: { $ne: null },
            post: { $nin: ownPostIds },
          },
        },
        {
          $group: {
            _id: "$parentCommentId",
            count: { $sum: 1 },
          },
        },
      ]).session(session);

      // Decrease repliesCount on each root comment.
      for (const item of replyCounts) {
        await Comment.updateOne(
          {
            _id: item._id,
            parentCommentId: null,
            post: { $nin: ownPostIds },
          },
          [
            {
              $set: {
                repliesCount: {
                  $max: [
                    0,
                    {
                      $subtract: [
                        { $ifNull: ["$repliesCount", 0] },
                        item.count,
                      ],
                    },
                  ],
                },
              },
            },
          ],
          { session }
        );
      }

      // Delete comments authored by this user and all comments
      // belonging to posts that will be deleted.
      await Comment.deleteMany(
        {
          $or: [
            { author: accountId },
            { post: { $in: ownPostIds } },
          ],
        },
        { session }
      );


      // 6. Delete all of the user's posts, including soft-deleted ones.
      await Post.deleteMany(
        { author: accountId },
        { session }
      );

      // 7. Finally, delete the account itself.
      const deletedUser = await User.deleteOne(
        { _id: accountId },
        { session }
      );

      if (deletedUser.deletedCount !== 1) {
        throw new Error("Account deletion failed.");
      }
    });

    // Only clear the cookie after the transaction succeeds.
    const response = NextResponse.json({
      success: true,
      message: "Account deleted successfully.",
    });

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } finally {
    await session.endSession();
  }
});