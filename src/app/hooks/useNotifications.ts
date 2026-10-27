
"use client";

import { useCallback, useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import axios from "axios";
import { io } from "socket.io-client";

export type BrizaNotification = {
  _id: string;
  actor: {
    _id: string;
    username: string;
    imageUrl?: string;
  };
  type: "follow";
  read: boolean;
  createdAt: string;
};

type NotificationsPage = {
  success: boolean;
  notifications: BrizaNotification[];
  unreadCount: number;
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

const API_URL = "/api/notifications";

const fetcher = async (
  url: string
): Promise<NotificationsPage> => {
  const { data } = await axios.get<NotificationsPage>(url);
  return data;
};

export function useNotifications() {
  const getKey = useCallback(
    (
      pageIndex: number,
      previousPageData: NotificationsPage | null
    ) => {
      if (pageIndex === 0) {
        return API_URL;
      }

      if (
        !previousPageData ||
        !previousPageData.pagination.hasMore ||
        !previousPageData.pagination.nextCursor
      ) {
        return null;
      }

      return `${API_URL}?cursor=${encodeURIComponent(
        previousPageData.pagination.nextCursor
      )}`;
    },
    []
  );

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<NotificationsPage>(getKey, fetcher);

  // Real-time notifications
  useEffect(() => {
    const socket = io({
      withCredentials: true,
    });

    socket.on(
      "notification:new",
      (notification: BrizaNotification) => {
        void mutate(
          (pages) => {
            if (!pages?.length) return pages;

            // Prevent duplicate notifications across all loaded pages.
            const alreadyExists = pages.some((page) =>
              page.notifications.some(
                (item) => item._id === notification._id
              )
            );

            if (alreadyExists) return pages;

            return pages.map((page, index) => {
              if (index !== 0) return page;

              return {
                ...page,
                notifications: [
                  notification,
                  ...page.notifications,
                ].slice(0, 30),
                unreadCount: page.unreadCount + 1,
              };
            });
          },
          { revalidate: false }
        );
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [mutate]);

  // Combine all loaded pages and deduplicate by notification ID.
  const notifications = Array.from(
    new Map(
      (data ?? [])
        .flatMap((page) => page.notifications)
        .map((notification) => [
          notification._id,
          notification,
        ])
    ).values()
  );

  const firstPage = data?.[0];
  const lastPage = data?.[data.length - 1];

  const hasMore =
    lastPage?.pagination.hasMore ?? false;

  const isLoadingMore =
    isValidating && size > 1;

  const loadMore = useCallback(() => {
    if (
      !lastPage?.pagination.hasMore ||
      !lastPage.pagination.nextCursor ||
      isValidating
    ) {
      return;
    }

    void setSize((currentSize) => currentSize + 1);
  }, [lastPage, isValidating, setSize]);

  return {
    notifications,
    unreadCount: firstPage?.unreadCount ?? 0,
    hasMore,
    nextCursor: lastPage?.pagination.nextCursor ?? null,
    loadMore,
    isLoading,
    isLoadingMore,
    error,
    mutate,
  };
}
