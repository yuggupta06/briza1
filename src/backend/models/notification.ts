
import { Schema, models, model } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["follow"],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({
  recipient: 1,
  createdAt: -1,
  _id: -1,
});
notificationSchema.index(
  {
    recipient: 1,
    sender: 1,
    type: 1,
  },
  { unique: true }
);

const Notification =
  models.Notification || model("Notification", notificationSchema);

export default Notification;