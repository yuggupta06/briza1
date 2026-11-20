
import { Types } from "mongoose";
import mongoose from "mongoose";
export interface ConversationMemberState {
  userId: Types.ObjectId;
  lastReadMessageId: Types.ObjectId | null;
  lastReadSeq: number;
  unreadCount: number;
}

export interface ConversationType {
  participants: mongoose.Types.ObjectId[];
  participantKey: string;
  lastMessageId: mongoose.Types.ObjectId | null;
  lastMessageAt: Date | null;
  lastMessageSeq: number;
  memberStates: {
    userId: mongoose.Types.ObjectId;
    lastReadMessageId: mongoose.Types.ObjectId | null;
    lastReadSeq: number;
    unreadCount: number;
  }[];
}
