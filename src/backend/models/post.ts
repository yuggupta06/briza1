import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    postUrl: {
      type: String,
      required: true,
      trim: true,
    },

    postType: {
      type: String,
      required: true,
      enum: ["image", "video", "text"],
    },

    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Find a user's posts ordered by creation time, newest first.
postSchema.index({ author: 1, createdAt: -1, _id: -1 });

const Post =
  mongoose.models.Post ||
  mongoose.model("Post", postSchema);

export default Post;