
"use client";

import { useMemo, useState } from "react";
import { Search, MessageCircle } from "lucide-react";

import {Avatar} from "@/app/components/ui/avatar";

import type { ConversationInboxItem } from "@/types/messaging-ui";

interface ConversationListProps {
  conversations: ConversationInboxItem[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;

  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const getLastMessagePreview = (
  conversation: ConversationInboxItem
) => {
  const message = conversation.lastMessage;

  if (!message) return "Start a conversation";

  if (message.content) return message.content;

  switch (message.messageType) {
    case "image":
      return "Photo";

    case "video":
      return "Video";

    case "file":
      return "File";

    default:
      return "Message";
  }
};

const formatConversationTime = (date: string | null) => {
  if (!date) return "";

  const messageDate = new Date(date);
  const now = new Date();

  const isToday =
    messageDate.toDateString() === now.toDateString();

  if (isToday) {
    return messageDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return messageDate.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
};

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return conversations;

    return conversations.filter((conversation) =>
      conversation.otherParticipant?.username
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, search]);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-outline-variant bg-surface">
      {/* Header */}
      <div className="border-b border-outline-variant p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-on-surface">
            Messages
          </h2>

          <MessageCircle
            size={21}
            className="text-on-surface-variant"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2">
          <Search
            size={18}
            className="shrink-0 text-on-surface-variant"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
          />
        </div>
      </div>

      {/* Conversation items */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-on-surface-variant">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <MessageCircle
              size={32}
              className="text-on-surface-variant"
            />

            <p className="text-sm font-medium text-on-surface">
              {search
                ? "No conversations found"
                : "No messages yet"}
            </p>

            <p className="text-xs text-on-surface-variant">
              {search
                ? "Try searching with another username."
                : "Start a conversation with someone."}
            </p>
          </div>
        ) : (
          <>
            {filteredConversations.map((conversation) => {
              const participant = conversation.otherParticipant;

              if (!participant) return null;

              const isSelected =
                selectedConversationId === conversation._id;

              const preview = getLastMessagePreview(conversation);

              const lastMessage = conversation.lastMessage;

              return (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() =>
                    onSelectConversation(conversation._id)
                  }
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container ${
                    isSelected ? "bg-surface-container" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    <Avatar
                      src={participant.imageUrl}
                      alt={participant.username}
                      size={48}
                    />
                  </div>

                  {/* Conversation information */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          conversation.unreadCount > 0
                            ? "font-semibold text-on-surface"
                            : "font-medium text-on-surface"
                        }`}
                      >
                        {participant.username}
                      </p>

                      <span className="shrink-0 text-[10px] text-on-surface-variant">
                        {formatConversationTime(
                          conversation.lastMessageAt
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-xs ${
                          conversation.unreadCount > 0
                            ? "font-medium text-on-surface"
                            : "text-on-surface-variant"
                        }`}
                      >
                        {lastMessage &&
                        lastMessage.senderId &&
                        typeof lastMessage.senderId !== "string" &&
                        lastMessage.senderId._id ===
                          participant._id
                          ? ""
                          : lastMessage
                            ? "You: "
                            : ""}
                        {preview}
                      </p>

                      {/* Unread count */}
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Load more */}
            {hasMore && !search && (
              <div className="p-3">
                <button
                  type="button"
                  disabled={isLoadingMore}
                  onClick={onLoadMore}
                  className="w-full rounded-lg py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-container disabled:opacity-50"
                >
                  {isLoadingMore
                    ? "Loading..."
                    : "Load older conversations"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
