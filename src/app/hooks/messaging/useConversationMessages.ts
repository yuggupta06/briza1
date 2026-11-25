
"use client";

import { useCallback, useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import {
  fetchMessages,
  type FetchMessagesOptions,
} from "@/backend/lib/messaging/api";

import type {
  MessagesResponse,
  MessagingMessage,
} from "@/types/messaging-ui";

const PAGE_SIZE = 30;

type MessagesPageKey = [
  string,
  number | null,
  FetchMessagesOptions | null
];

interface UseConversationMessagesOptions {
  initialLastReadSeq: number;
}

export const getKey = (
  conversationId: string,
  pageIndex: number,
  previousPageData: MessagesResponse | null,
  initialLastReadSeq: number
): MessagesPageKey | null => {
  if (!conversationId) return null;

  // Initial page: load around the current user's read boundary.
  if (pageIndex === 0) {
    return [
      conversationId,
      null,
      { around: initialLastReadSeq },
    ];
  }

  // Subsequent pages fetch older messages.
  if (
    !previousPageData?.hasMore ||
    previousPageData.nextCursor === null
  ) {
    return null;
  }

  return [
    conversationId,
    previousPageData.nextCursor,
    null,
  ];
};

const fetcher = async (
  [
    conversationId,
    before,
    options,
  ]: MessagesPageKey
): Promise<MessagesResponse> => {
  return fetchMessages(
    conversationId,
    before,
    PAGE_SIZE,
    options ?? undefined
  );
};

export const useConversationMessages = (
  conversationId: string | null,
  { initialLastReadSeq }: UseConversationMessagesOptions
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
        previousPageData,
        initialLastReadSeq
      ),
    fetcher,
    {
      initialSize: 1,
      persistSize: false,

      revalidateFirstPage: false,
      revalidateOnMount: true,

      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,

      dedupingInterval: 2000,
    }
  );

  // Combine all pages, remove duplicates and sort chronologically.
  const messages = useMemo(() => {
    if (!data) return [];

    const uniqueMessages = new Map<string, MessagingMessage>();

    for (const page of data) {
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

  // Load older messages.
  const loadOlder = useCallback(async () => {
    if (!hasMore || isLoadingMore || isValidating) return;

    await setSize((currentSize) => currentSize + 1);
  }, [hasMore, isLoadingMore, isValidating, setSize]);

  // Fetch newer messages after a particular sequence.
  const loadNewer = useCallback(
    async (after: number) => {
      if (!conversationId) return [];

      const response = await fetchMessages(
        conversationId,
        null,
        PAGE_SIZE,
        { after }
      );

      await mutate(
        (pages) => {
          if (!pages?.length) return pages;

          const existingIds = new Set(
            pages.flatMap((page) =>
              page.messages.map((message) => message._id)
            )
          );

          const newMessages = response.messages.filter(
            (message) => !existingIds.has(message._id)
          );

          if (newMessages.length === 0) return pages;

          const updatedPages = [...pages];

          updatedPages[0] = {
            ...updatedPages[0],
            messages: [
              ...updatedPages[0].messages,
              ...newMessages,
            ].sort((a, b) => a.sequence - b.sequence),
          };

          return updatedPages;
        },
        { revalidate: false }
      );

      return response.messages;
    },
    [conversationId, mutate]
  );

  // Fetch the latest messages, used by the down-arrow.
  const loadLatest = useCallback(async () => {
    if (!conversationId) return [];

    const response = await fetchMessages(
      conversationId,
      null,
      PAGE_SIZE,
      { latest: true }
    );

    await mutate(
      (pages) => {
        const existingPages = pages ?? [];
        const existingIds = new Set(
          existingPages.flatMap((page) =>
            page.messages.map((message) => message._id)
          )
        );

        const newMessages = response.messages.filter(
          (message) => !existingIds.has(message._id)
        );

        if (!existingPages.length) {
          return [response];
        }

        const updatedPages = [...existingPages];

        updatedPages[0] = {
          ...updatedPages[0],
          messages: [
            ...updatedPages[0].messages,
            ...newMessages,
          ].sort((a, b) => a.sequence - b.sequence),
        };

        return updatedPages;
      },
      { revalidate: false }
    );

    return response.messages;
  }, [conversationId, mutate]);

  // Insert a newly sent or received message.
  const addMessage = useCallback(
    async (newMessage: MessagingMessage) => {
      await mutate(
        (pages) => {
          if (!pages?.length) return pages;

          const alreadyExists = pages.some((page) =>
            page.messages.some(
              (message) => message._id === newMessage._id
            )
          );

          if (alreadyExists) return pages;

          const updatedPages = [...pages];

          updatedPages[0] = {
            ...updatedPages[0],
            messages: [
              ...updatedPages[0].messages,
              newMessage,
            ].sort((a, b) => a.sequence - b.sequence),
          };

          return updatedPages;
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  return {
    messages,

    isLoading,
    isLoadingMore,
    isValidating,
    error,

    hasMore,
    loadOlder,
    loadNewer,
    loadLatest,

    addMessage,
    mutate,
  };
};
