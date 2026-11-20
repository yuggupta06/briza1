
import { ConversationType } from "@/types/conversation";
import mongoose, { Schema, model, models } from "mongoose";

const memberStateSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastReadMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastReadSeq: {
      type: Number,
      default: 0,
      min: 0,
    },

    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const conversationSchema = new Schema(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      required: true,
      validate: {
        validator: (participants: mongoose.Types.ObjectId[]) =>
          participants.length === 2 &&
          participants[0].toString() !==
            participants[1].toString(),
        message: "A conversation must have exactly two different participants.",
      },
    },

    // Deterministic key generated from sorted participant IDs.
    participantKey: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },

    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    // Sequence of the latest message in this conversation.
    lastMessageSeq: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Individual state for each participant.
    memberStates: {
      type: [memberStateSchema],
      required: true,
      validate: {
        validator: (states: { userId: mongoose.Types.ObjectId }[]) =>
          states.length === 2 &&
          states[0].userId.toString() !==
            states[1].userId.toString(),
        message: "A conversation must have read state for both participants.",
      },
    },
  },
  {
    timestamps: true,
  }
);
conversationSchema.index(
  { participantKey: 1 },
  { unique: true }
);
// Find a user's conversations, newest activity first.
conversationSchema.index({
  participants: 1,
  lastMessageAt: -1,
});

// Reuse existing model during Next.js hot reload.
const Conversation =
  (models.Conversation as mongoose.Model<ConversationType>) ||
  model<ConversationType>("Conversation", conversationSchema);
export default Conversation;
