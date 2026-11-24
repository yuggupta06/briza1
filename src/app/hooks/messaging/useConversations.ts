
"use client";

import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import { fetchConversations } from "@/backend/lib/messaging/api";

import type {
  ConversationsResponse,
  ConversationInboxItem,
} from "@/types/messaging-ui";

const CONVERSATIONS_KEY = "/api/conversations";

type ConversationPageKey = [
  typeof CONVERSATIONS_KEY,
  string | null,
];

// Determines which page SWR should fetch.
const getKey = (
  pageIndex: number,
  previousPageData: ConversationsResponse | null
): ConversationPageKey | null => {
  // First page: fetch the latest conversations.
  if (pageIndex === 0) {
    return [CONVERSATIONS_KEY, null];
  }

  // Stop pagination when there are no more conversations.
  if (!previousPageData?.hasMore || !previousPageData.nextCursor) {
    return null;
  }

  // Next page: use the previous response's cursor.
  return [
    CONVERSATIONS_KEY,
    previousPageData.nextCursor,
  ];
};

// Fetcher receives the key returned by getKey.
const fetcher = async (
  [, cursor]: ConversationPageKey
): Promise<ConversationsResponse> => {
  return fetchConversations(cursor);
};

export const useConversations = () => {
  const {
    data,
    error,
    size,
    setSize,
    isLoading,
    isValidating,
    mutate,
  } = useSWRInfinite<ConversationsResponse, Error>(
    getKey,
    fetcher,
    {
    initialSize: 1,
    persistSize: true,

    revalidateFirstPage: true,
    revalidateOnMount: true,

    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,

    dedupingInterval: 2000,
}
  );

  // Combine all fetched pages into one array.
  const conversations = useMemo(() => {
    if (!data) return [];

    const uniqueConversations = new Map<
      string,
      ConversationInboxItem
    >();

    for (const page of data) {
      for (const conversation of page.conversations) {
        uniqueConversations.set(
          conversation._id,
          conversation
        );
      }
    }

    return Array.from(uniqueConversations.values());
  }, [data]);

  // Check whether another page exists.
  const hasMore =
    data?.[data.length - 1]?.hasMore ?? false;

  // True when the next page is being fetched.
  const isLoadingMore =
    size > (data?.length ?? 0);

  // Fetch the next page.
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || isValidating) {
      return;
    }

    await setSize((currentSize) => currentSize + 1);
  };

  return {
    conversations,

    isLoading,
    isLoadingMore,
    isValidating,
    error,

    hasMore,
    loadMore,

    mutate,
  };
};
