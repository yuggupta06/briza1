
"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import type {
  FollowListResponse,
  FollowUser,
} from "@/types/follow";

export type FollowListType = "followers" | "following";

export function useFollowList(
  username: string,
  type: FollowListType,
  enabled = true
) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!enabled || !username) return;

      if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      setError(null);

      try {
        const params = new URLSearchParams({
          username,
          limit: "20",
        });

        if (cursor) params.set("cursor", cursor);

        const response = await axios.get<FollowListResponse>(
          `/api/follow/${type}?${params.toString()}`
        );

        const page = response.data;

        setUsers((previous) =>
          append
            ? [
                ...previous,
                ...page.users.filter(
                  (user) => !previous.some((item) => item._id === user._id)
                ),
              ]
            : page.users
        );

        setNextCursor(page.pagination.nextCursor);
        setHasMore(page.pagination.hasMore);
      } catch (err: unknown) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? "Unable to load users"
            : "Unable to load users"
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [username, type, enabled]
  );

  useEffect(() => {
    setUsers([]);
    setNextCursor(null);
    setHasMore(false);

    if (enabled && username) {
      void fetchPage(null, false);
    }
  }, [fetchPage, enabled, username]);

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore && nextCursor) {
      void fetchPage(nextCursor, true);
    }
  }, [fetchPage, hasMore, isLoading, isLoadingMore, nextCursor]);

  return {
    users,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  };
}
