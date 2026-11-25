
import axios from "axios";

import type {
  ConversationsResponse,
  MessagesResponse,
  SendMessageResponse,
  MarkReadResponse,
  MessagingMessage,
  MessageContentType,
} from "@/types/messaging-ui";

const API_BASE = "/api/conversations";

const axiosConfig = {
  withCredentials: true,
};

// GET /api/conversations
export const fetchConversations = async (
  cursor?: string | null
): Promise<ConversationsResponse> => {
  const response = await axios.get<ConversationsResponse>(
    API_BASE,
    {
      ...axiosConfig,
      params: cursor ? { cursor } : {},
    }
  );

  return response.data;
};
export interface FetchMessagesOptions {
  around?: number;
  after?: number;
  latest?: boolean;
}

// GET /api/conversations/[conversationId]/messages
export const fetchMessages = async (
  conversationId: string,
  before?: number | null,
  limit = 30,
  options?: FetchMessagesOptions
): Promise<MessagesResponse> => {
  const response = await axios.get<MessagesResponse>(
    `${API_BASE}/${conversationId}/messages`,
    {
      ...axiosConfig,
      params: {
        ...(before != null ? { before } : {}),
        ...(options?.around !== undefined
          ? { around: options.around }
          : {}),
        ...(options?.after !== undefined
          ? { after: options.after }
          : {}),
        ...(options?.latest ? { latest: true } : {}),
        limit,
      },
    }
  );

  return response.data;
};

export interface SendMessagePayload {
  messageType: MessageContentType;
  content: string | null;
  attachments: MessagingMessage["attachments"];
}

// POST /api/conversations/[conversationId]/messages
export const sendMessage = async (
  conversationId: string,
  payload: SendMessagePayload
): Promise<SendMessageResponse> => {
  const response = await axios.post<SendMessageResponse>(
    `${API_BASE}/${conversationId}/messages`,
    payload,
    axiosConfig
  );

  return response.data;
};

// PATCH /api/conversations/[conversationId]/read
export const markConversationRead = async (
  conversationId: string,
  lastReadSeq: number
): Promise<MarkReadResponse> => {
  const response = await axios.patch<MarkReadResponse>(
    `${API_BASE}/${conversationId}/read`,
    { lastReadSeq },
    axiosConfig
  );

  return response.data;
};
