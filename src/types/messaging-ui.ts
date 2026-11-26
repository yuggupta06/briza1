
import type {
  AttachmentType,
} from "./message";

export interface MessagingUser {
  _id: string;
  username: string;
  imageUrl: string;
}

export type MessageContentType =
  | "text"
  | "image"
  | "video"
  | "file";

// Original message information displayed inside a reply.
export interface MessagingReplyMessage {
  _id: string;

  senderId: MessagingUser | string;

  messageType: MessageContentType;

  content: string | null;

  attachments: AttachmentType[];

  createdAt: string;
}

// Tracks an individual user's deletion.
export interface MessagingDeletedFor {
  userId: string;
  deletedAt: string;
}

export interface MessagingMessage {
  _id: string;

  conversationId: string;

  senderId: MessagingUser | string;

  sequence: number;

  messageType: MessageContentType;

  content: string | null;

  attachments: AttachmentType[];

  editedAt: string | null;

  // ObjectId when not populated, object when populated.
  replyTo: string | MessagingReplyMessage | null;

  deletedFor: MessagingDeletedFor[];

  deletedForEveryoneAt: string | null;

  deletedForEveryoneBy: string | null;

  createdAt: string;

  updatedAt: string;
}

export interface ConversationInboxItem {
  _id: string;
  otherParticipant: MessagingUser | null;
  lastMessage: MessagingMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  lastReadSeq: number;
  otherParticipantLastReadSeq: number;
}

export interface CreateConversationResponse {
  success: boolean;
  message: string;
  conversation: {
    _id: string;
  };
}

export interface ConversationsResponse {
  success: boolean;
  conversations: ConversationInboxItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessagesResponse {
  success: boolean;
  messages: MessagingMessage[];
  nextCursor: number | null;
  hasMore: boolean;

  newerCursor?: number | null;
  hasNewer?: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  sentMessage: MessagingMessage;
}

export interface ReadState {
  lastReadMessageId: string | null;
  lastReadSeq: number;
  unreadCount: number;
}

export interface MarkReadResponse {
  success: boolean;
  readState: ReadState;
}
