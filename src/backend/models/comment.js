
import { Schema, model, models } from "mongoose";

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // null = top-level comment
    // root comment ID = reply in that comment's flat thread
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // Exact comment/reply being answered.
    // For a top-level comment, this is null.
    replyToCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // Mention target; this is separate from the reply text.
    replyToUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Meaningful for top-level comments; replies can omit it.
    repliesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Fetch top-level comments, newest first.
commentSchema.index({
  postId: 1,
  parentCommentId: 1,
  createdAt: -1,
  _id: -1,
});

// Fetch replies for one root comment, newest first.
commentSchema.index({
  parentCommentId: 1,
  createdAt: -1,
  _id: -1,
});

const Comment =
  models.Comment || model("Comment", commentSchema);

export default Comment;
