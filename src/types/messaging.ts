
import type { ConversationType } from "@/types/conversation";
import type {
  MessageType,
  AttachmentType,
  MessageContentType,
} from "@/types/messages";
import type { PopulatedUserType } from "@/types/user";

// ============================================
// 1. POPULATED MESSAGE
// ============================================

// Message whose senderId has been populated with user details.
export type PopulatedMessageType = Omit<
  MessageType,
  "senderId"
> & {
  senderId: PopulatedUserType;
};

// ============================================
// 2. POPULATED CONVERSATION
// ============================================

// Conversation whose participants and latest message
// have been populated.
export type PopulatedConversationType = Omit<
  ConversationType,
  "participants" | "lastMessageId"
> & {
  participants: PopulatedUserType[];
  lastMessageId: PopulatedMessageType | null;
};

// ============================================
// 3. CONVERSATION INBOX ITEM
// ============================================

// One conversation item returned by GET /api/conversations.
export interface ConversationInboxItemType {
  _id: ConversationType["_id"];

  otherUser: PopulatedUserType | null;

  lastMessage: Pick<
    MessageType,
    | "_id"
    | "senderId"
    | "content"
    | "messageType"
    | "sequence"
    | "createdAt"
  > | null;

  lastMessageAt: ConversationType["lastMessageAt"];

  unreadCount: number;

  // Whether the other participant has read our latest message.
  // null means the latest message wasn't sent by us or doesn't exist.
  lastMessageSeen: boolean | null;
}

// ============================================
// 4. MESSAGE PAGINATION
// ============================================

export interface MessagePaginationType {
  hasMore: boolean;
  nextCursor: number | null;
}

// ============================================
// 5. GET MESSAGES RESPONSE
// ============================================

export interface ConversationMessagesResponseType {
  success: boolean;
  messages: PopulatedMessageType[];
  pagination: MessagePaginationType;
  message?: string;
}

// ============================================
// 6. READ STATE
// ============================================

export interface ReadStateType {
  lastReadMessageId: MessageType["_id"] | null;
  lastReadSeq: number;
  unreadCount: number;
}

// ============================================
// 7. PATCH READ RESPONSE
// ============================================

export interface MarkConversationReadResponseType {
  success: boolean;
  message: string;
  readState: ReadStateType;
}

// ============================================
// 8. CREATE CONVERSATION RESPONSE
// ============================================

export interface CreateConversationResponseType {
  success: boolean;
  conversation: PopulatedConversationType;
  isNew: boolean;
  message?: string;
}

// ============================================
// 9. GET CONVERSATIONS RESPONSE
// ============================================

export interface ConversationsResponseType {
  success: boolean;
  conversations: ConversationInboxItemType[];
  message?: string;
}

// ============================================
// 10. SEND MESSAGE REQUEST
// ============================================

export interface SendMessageRequestType {
  messageType: MessageContentType;
  content: string | null;
  attachments: AttachmentType[];
}

// ============================================
// 11. SEND MESSAGE RESPONSE
// ============================================

export interface SendMessageResponseType {
  success: boolean;
  message: string;
  createdMessage: PopulatedMessageType;
}

// ============================================
// 12. MESSAGE REALTIME EVENTS
// ============================================

export interface NewMessageEventType {
  conversationId: string;
  message: PopulatedMessageType;
}

export interface MessagesReadEventType {
  conversationId: string;
  readerId: string;
  lastReadMessageId: string;
  lastReadSeq: number;
}
