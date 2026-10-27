import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate likes by the same user on the same post.
likeSchema.index({ post: 1, author: 1 }, { unique: true });

// Find all likes made by a particular user.
likeSchema.index({ author: 1 ,_id:-1});

const Like =
  mongoose.models.Like || mongoose.model("Like", likeSchema);

export default Like;