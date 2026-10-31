
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
      enum: ["follow", "like", "comment"],
      required: true,
    },

    // The post associated with the notification.
    // Null for follow notifications.
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    // The specific comment associated with the notification.
    // Null for follow and like notifications.
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Notification pagination.
notificationSchema.index({
  recipient: 1,
  createdAt: -1,
  _id: -1,
});

// Unique follow notification per actor and recipient.
notificationSchema.index(
  {
    recipient: 1,
    actor: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: "follow",
    },
  }
);

// Unique like notification per actor, recipient and post.
notificationSchema.index(
  {
    recipient: 1,
    actor: 1,
    type: 1,
    post: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: "like",
    },
  }
);

// Unique comment notification per specific comment.
notificationSchema.index(
  {
    recipient: 1,
    actor: 1,
    type: 1,
    comment: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: "comment",
    },
  }
);

const Notification =
  models.Notification ||
  model("Notification", notificationSchema);

export default Notification;
