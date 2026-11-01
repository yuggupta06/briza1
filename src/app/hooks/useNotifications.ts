
"use client";

import { useRealtimeEvent } from "@/app/hooks/useRealtimeEvent";
import { NotificationType } from "@/types/notification";
import axios from "axios";
import { useCallback } from "react";
import useSWRInfinite from "swr/infinite";


type NotificationEvent = {
  notification: NotificationType;
};

type NotificationsPage = {
  success: boolean;
  notifications: NotificationType[];
  unreadCount: number;
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

const API_URL = "/api/notifications/fetch-notifications";

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
  } = useSWRInfinite<NotificationsPage>(getKey, fetcher, {
    revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: true,
  revalidateOnMount: true,
  revalidateFirstPage: true,
  persistSize: true,
  });

  // Receive new notifications through the shared realtime provider.
  const handleNewNotification = useCallback(
    (event: NotificationEvent) => {
      const notification = event?.notification;
      if (!notification?._id) return;

      void mutate(
        (pages) => {
          if (!pages?.length) return pages;

          // Prevent duplicates across every loaded page.
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
              unreadCount: notification.read
                ? page.unreadCount
                : page.unreadCount + 1,
            };
          });
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  useRealtimeEvent(
    "new-notification",
    handleNewNotification
  );

  // Flatten loaded pages and deduplicate notifications by ID.
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

  // Mark a notification as read.
  const markAsRead = useCallback(
    async (notificationId: string) => {
      const previousPages = data;

      if (!previousPages) return;

      const notification = previousPages
        .flatMap((page) => page.notifications)
        .find((item) => item._id === notificationId);

      if (!notification || notification.read) return;

      // Optimistically update the cache.
      await mutate(
        (pages) => {
          if (!pages) return pages;

          return pages.map((page, index) => ({
            ...page,
            notifications: page.notifications.map((item) =>
              item._id === notificationId
                ? { ...item, read: true }
                : item
            ),

            // unreadCount is maintained on the first page.
            unreadCount:
              index === 0
                ? Math.max(0, page.unreadCount - 1)
                : page.unreadCount,
          }));
        },
        { revalidate: false }
      );

      try {
        await axios.patch("/api/notifications/mark-read", {
          notificationId,
        });
      } catch (error) {
        // Roll back if the server request fails.
        await mutate(previousPages, {
          revalidate: false,
        });

        throw error;
      }
    },
    [data, mutate]
  );

  // Delete a notification.
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const previousPages = data;

      if (!previousPages) return;

      const notification = previousPages
        .flatMap((page) => page.notifications)
        .find((item) => item._id === notificationId);

      if (!notification) return;

      // Optimistically remove the notification.
      await mutate(
        (pages) => {
          if (!pages) return pages;

          return pages.map((page, index) => ({
            ...page,
            notifications: page.notifications.filter(
              (item) => item._id !== notificationId
            ),
            unreadCount:
              index === 0 && !notification.read
                ? Math.max(0, page.unreadCount - 1)
                : page.unreadCount,
          }));
        },
        { revalidate: false }
      );

      try {
        await axios.delete(
          "/api/notifications/delete-notification",
          {
            data: { notificationId },
          }
        );
      } catch (error) {
        // Restore the previous cache if deletion fails.
        await mutate(previousPages, {
          revalidate: false,
        });

        throw error;
      }
    },
    [data, mutate]
  );

  const firstPage = data?.[0];
  const lastPage = data?.[data.length - 1];

  const hasMore = lastPage?.pagination.hasMore ?? false;

  const isLoadingMore = isValidating && size > 1;

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
    markAsRead,
    deleteNotification,
  };
}
