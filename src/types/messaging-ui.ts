
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

export interface MessagingMessage {
  _id: string;
  conversationId: string;

  senderId: MessagingUser | string;

  sequence: number;
  messageType: MessageContentType;
  content: string | null;
  attachments: AttachmentType[];

  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationInboxItem {
  _id: string;
  otherParticipant: MessagingUser | null;
  lastMessage: MessagingMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
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
