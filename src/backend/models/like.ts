import mongoose, { mongo } from "mongoose";
const likeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Same user can't like the same post twice
likeSchema.index({ post: 1, user: 1 }, { unique: true });

const Like=mongoose.models.Like||
    mongoose.model("Like",likeSchema);

export default Like;