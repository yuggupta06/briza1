
"use client";

import { useCallback, useRef, useState } from "react";

export interface PaginatedResponse<T> {
  success: boolean;
  items: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

interface UseLocalPaginatedDataOptions<T> {
  fetchPage: (cursor: string | null) => Promise<PaginatedResponse<T>>;
  getId: (item: T) => string;
}

export function useLocalPaginatedData<T>({
  fetchPage,
  getId,
}: UseLocalPaginatedDataOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);

  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);

  const fetchFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    loadingRef.current = true;
    setIsLoading(true);
    setError("");
    setItems([]);
    nextCursorRef.current = null;

    try {
      const response = await fetchPage(null);

      if (requestId !== requestIdRef.current) return;

      setItems(response.items);
      setHasMore(response.pagination.hasMore);
      hasMoreRef.current = response.pagination.hasMore;
      nextCursorRef.current = response.pagination.nextCursor;
    } catch {
      if (requestId === requestIdRef.current) {
        setError("Unable to load users. Please try again.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (
      loadingRef.current ||
      !hasMoreRef.current ||
      !nextCursorRef.current
    ) return;

    const requestId = requestIdRef.current;

    loadingRef.current = true;
    setIsLoadingMore(true);
    setError("");

    try {
      const response = await fetchPage(nextCursorRef.current);

      if (requestId !== requestIdRef.current) return;

      setItems((previous) => {
        const existingIds = new Set(previous.map(getId));

        return [
          ...previous,
          ...response.items.filter(
            (item) => !existingIds.has(getId(item))
          ),
        ];
      });

      setHasMore(response.pagination.hasMore);
      hasMoreRef.current = response.pagination.hasMore;
      nextCursorRef.current = response.pagination.nextCursor;
    } catch {
      if (requestId === requestIdRef.current) {
        setError("Unable to load more users. Please try again.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [fetchPage, getId]);

  const reset = useCallback(() => {
    requestIdRef.current++;
    loadingRef.current = false;
    nextCursorRef.current = null;
    hasMoreRef.current = false;

    setItems([]);
    setHasMore(false);
    setIsLoading(false);
    setIsLoadingMore(false);
    setError("");
  }, []);

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    reset,
    fetchFirstPage,
    loadMore,
  };
}
