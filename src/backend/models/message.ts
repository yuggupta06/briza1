
import { Schema, model, models } from "mongoose";
import { MessageType } from "@/types/message";

const MAX_ATTACHMENTS = 10;

const attachmentSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video", "file"],
      required: true,
    },

    size: {
      type: Number,
      required: true,
      min: 0,
    },

    name: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  }
);

// Tracks users who deleted a message for themselves.
const deletedForSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new Schema<MessageType>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sequence: {
      type: Number,
      required: true,
      min: 1,
    },

    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
      required: true,
    },

    content: {
      type: String,
      trim: true,
      default: null,
      maxlength: 5000,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: function (attachments) {
          return attachments.length <= MAX_ATTACHMENTS;
        },
        message: `A message cannot contain more than ${MAX_ATTACHMENTS} attachments.`,
      },
    },

    editedAt: {
      type: Date,
      default: null,
    },

    // References the original message being replied to.
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Users who have deleted this message for themselves.
    deletedFor: {
      type: [deletedForSchema],
      default: [],
    },

    // Marks a message as deleted for everyone.
    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },

    // Records who deleted the message for everyone.
    deletedForEveryoneBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Validate message type, content and attachment consistency.
messageSchema.pre("validate", function () {
  const content = this.content?.trim() || "";
  const attachments = this.attachments || [];

  // Text messages must contain non-empty text and no attachments.
  if (this.messageType === "text") {
    if (!content) {
      this.invalidate(
        "content",
        "Text messages cannot be empty."
      );
    }

    if (attachments.length > 0) {
      this.invalidate(
        "attachments",
        "Text messages cannot contain attachments."
      );
    }
  }

  // Image, video and file messages must contain
  // at least one matching attachment.
  if (["image", "video", "file"].includes(this.messageType)) {
    if (attachments.length === 0) {
      this.invalidate(
        "attachments",
        `${this.messageType} messages must contain at least one attachment.`
      );
    }

    const hasInvalidAttachment = attachments.some(
      (attachment) => attachment.mediaType !== this.messageType
    );

    if (hasInvalidAttachment) {
      this.invalidate(
        "attachments",
        `All attachments must have mediaType "${this.messageType}".`
      );
    }
  }
});

// Efficient chronological retrieval and cursor pagination.
// Guarantees unique sequence numbers per conversation.
messageSchema.index(
  {
    conversationId: 1,
    sequence: -1,
  },
  {
    unique: true,
  }
);

const Message =
  models.Message ||
  model<MessageType>("Message", messageSchema);

export default Message;
