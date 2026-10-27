
import mongoose, { Schema } from "mongoose";

const FollowSchema = new Schema(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

FollowSchema.index(
  { follower: 1, following: 1 },
  { unique: true }
);

FollowSchema.index({ following: 1, createdAt: -1, _id: -1 });
FollowSchema.index({ follower: 1, createdAt: -1, _id: -1 });

export default mongoose.models.Follow ||
  mongoose.model("Follow", FollowSchema);
