
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/backend/lib/auth/getAuthUser";
import { Connect } from "@/backend/lib/dbConnect";
import { withErrorHandler } from "@/backend/lib/errors/withErrorHandler";
import Comment from "@/backend/models/comment";
import Post from "@/backend/models/post";
import { CommentWithAuthor } from "@/types/comment";

export const POST = withErrorHandler(async (request: NextRequest) => {
    await Connect();

    const { userId } = await getAuthUser();

    if (!userId || !Types.ObjectId.isValid(userId)) {
        return NextResponse.json(
            { success: false, message: "Unauthorized." },
            { status: 401 }
        );
    }

    const { postId, parentCommentId, replyToCommentId, text } =
        await request.json();

    if (
        typeof postId !== "string" ||
        !Types.ObjectId.isValid(postId) ||
        typeof parentCommentId !== "string" ||
        !Types.ObjectId.isValid(parentCommentId) ||
        typeof replyToCommentId !== "string" ||
        !Types.ObjectId.isValid(replyToCommentId)
    ) {
        return NextResponse.json(
            { success: false, message: "Invalid post, parent, or reply target ID." },
            { status: 400 }
        );
    }

    if (typeof text !== "string" || !text.trim()) {
        return NextResponse.json(
            { success: false, message: "Reply text is required." },
            { status: 400 }
        );
    }

    if (text.trim().length > 500) {
        return NextResponse.json(
            { success: false, message: "Reply cannot exceed 500 characters." },
            { status: 400 }
        );
    }

    const postObjectId = new Types.ObjectId(postId);
    const rootCommentId = new Types.ObjectId(parentCommentId);
    const targetCommentId = new Types.ObjectId(replyToCommentId);

    const postExists = await Post.exists({ _id: postObjectId });

    if (!postExists) {
        return NextResponse.json(
            { success: false, message: "Post not found." },
            { status: 404 }
        );
    }
    
    const rootComment = await Comment.findOne({
        _id: rootCommentId,
        post: postObjectId,
        parentCommentId: null,
    })
        .select("_id")
        .lean();

    if (!rootComment) {
        return NextResponse.json(
            { success: false, message: "Root comment not found." },
            { status: 404 }
        );
    }
  
    // Target must be the root comment or one of its replies.
    const targetComment = (await Comment.findOne({
        _id: targetCommentId,
        post: postObjectId,
        $or: [
            { _id: rootCommentId, parentCommentId: null },
            { parentCommentId: rootCommentId },
        ],
    })
        .select("_id author")
        .lean()) as { _id: Types.ObjectId; author: Types.ObjectId } | null;

    if (!targetComment) {
        return NextResponse.json(
            { success: false, message: "Reply target not found." },
            { status: 404 }
        );
    }

    const reply = await Comment.create({
        post: postObjectId,
        author: new Types.ObjectId(userId),
        parentCommentId: rootCommentId,
        replyToCommentId: targetCommentId,
        replyToUserId: targetComment.author,
        text: text.trim(),
    });

    await Comment.updateOne(
        { _id: rootCommentId },
        { $inc: { repliesCount: 1 } }
    );

    const populatedReply = await Comment.findById(reply._id)
        .populate("author", "_id username imageUrl")
        .populate("replyToUserId", "_id username")
        .lean();

    if (!populatedReply) {
        return NextResponse.json(
            { success: false, message: "Could not fetch the created reply." },
            { status: 500 }
        );
    }

    const typedPopulatedReply = populatedReply as unknown as CommentWithAuthor;

    const author = typedPopulatedReply.author as unknown as {
        _id: Types.ObjectId;
        username: string;
        imageUrl?: string;
    };

    const recipient = typedPopulatedReply.replyToUserId as unknown as
        | { _id: Types.ObjectId; username: string }
        | null;

    return NextResponse.json(
        {
            success: true,
            message: "Reply added successfully.",
            reply: {
                _id: typedPopulatedReply._id.toString(),
                post: typedPopulatedReply.post.toString(),
                author: {
                    _id: author._id.toString(),
                    username: author.username,
                    imageUrl: author.imageUrl ?? "",
                },
                parentCommentId:
                    typedPopulatedReply.parentCommentId?.toString() ?? null,
                replyToCommentId:
                    typedPopulatedReply.replyToCommentId?.toString() ?? null,
                replyToUser: recipient
                    ? {
                        _id: recipient._id.toString(),
                        username: recipient.username,
                    }
                    : null,
                text: typedPopulatedReply.text,
                repliesCount: typedPopulatedReply.repliesCount ?? 0,
                createdAt: typedPopulatedReply.createdAt.toString(),
                updatedAt: typedPopulatedReply.updatedAt.toString(),
            },
        },
        { status: 201 }
    );
});
