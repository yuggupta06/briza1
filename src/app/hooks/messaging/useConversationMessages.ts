
"use client";

import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import { fetchMessages } from "@/backend/lib/messaging/api";

import type {
  MessagesResponse,
  MessagingMessage,
} from "@/types/messaging-ui";

const PAGE_SIZE = 30;

type MessagesPageKey = [
  string,
  number | null,
];

export const getKey = (
  conversationId: string,
  pageIndex: number,
  previousPageData: MessagesResponse | null
): MessagesPageKey | null => {
  // Don't fetch messages without a conversation selected.
  if (!conversationId) {
    return null;
  }

  // First page fetches the latest messages.
  if (pageIndex === 0) {
    return [conversationId, null];
  }

  // Stop when there are no older messages.
  if (
    !previousPageData?.hasMore ||
    previousPageData.nextCursor === null
  ) {
    return null;
  }

  // Fetch messages older than the previous page's cursor.
  return [
    conversationId,
    previousPageData.nextCursor,
  ];
};

const fetcher = async (
  [conversationId, before]: MessagesPageKey
): Promise<MessagesResponse> => {
  return fetchMessages(
    conversationId,
    before,
    PAGE_SIZE
  );
};

export const useConversationMessages = (
  conversationId: string | null
) => {
  const {
    data,
    error,
    size,
    setSize,
    isLoading,
    isValidating,
    mutate,
  } = useSWRInfinite<MessagesResponse, Error>(
    (pageIndex, previousPageData) =>
      getKey(
        conversationId ?? "",
        pageIndex,
        previousPageData
      ),
    fetcher,
    {
    initialSize: 1,
    persistSize: false,

    revalidateFirstPage: true,
    revalidateOnMount: true,

    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,

    dedupingInterval: 2000,
}
  );

  // SWR stores pages newest-first.
  // Reverse the page order to display messages oldest-first.
  const messages = useMemo(() => {
    if (!data) return [];

    const uniqueMessages = new Map<
      string,
      MessagingMessage
    >();

    for (const page of [...data].reverse()) {
      for (const message of page.messages) {
        uniqueMessages.set(message._id, message);
      }
    }

    return Array.from(uniqueMessages.values()).sort(
      (a, b) => a.sequence - b.sequence
    );
  }, [data]);

  const hasMore =
    data?.[data.length - 1]?.hasMore ?? false;

  const isLoadingMore =
    size > (data?.length ?? 0);

  // Fetch older messages.
  const loadOlder = async () => {
    if (
      !hasMore ||
      isLoadingMore ||
      isValidating
    ) {
      return;
    }

    await setSize((currentSize) => currentSize + 1);
  };

  // Add a newly sent message to the first (latest) page.
  const addMessage = async (
    newMessage: MessagingMessage
  ) => {
    await mutate(
      (pages) => {
        if (!pages || pages.length === 0) {
          return pages;
        }

        const updatedPages = [...pages];

        const firstPage = updatedPages[0];

        if (!firstPage) {
          return pages;
        }

        // Prevent duplicate insertion.
        if (
          firstPage.messages.some(
            (message) => message._id === newMessage._id
          )
        ) {
          return pages;
        }

        updatedPages[0] = {
          ...firstPage,
          messages: [...firstPage.messages, newMessage].sort(
            (a, b) => a.sequence - b.sequence
          ),
        };

        return updatedPages;
      },
      { revalidate: false }
    );
  };

  return {
    messages,

    isLoading,
    isLoadingMore,
    isValidating,
    error,

    hasMore,
    loadOlder,

    addMessage,
    mutate,
  };
};
