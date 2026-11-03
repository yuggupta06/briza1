
"use client";

import axios from "axios";
import { useCallback, useMemo, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import type { SetStateAction } from "react";

export interface PaginatedResponse<T> {
  success: boolean;
  items: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  error?: string;
  message?: string;
}

type FetchPage<T> = (
  cursor: string | null
) => Promise<PaginatedResponse<T>>;

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      fallback
    );
  }

  return error instanceof Error
    ? error.message
    : fallback;
}

export function usePaginatedData<T>(
  fetchPage: FetchPage<T>,
  getId: (item: T) => string,
  cacheKey: string,
  enabled=true
) {
  const requestInProgressRef = useRef(false);

  // Generate cursor-based SWR keys.
  const getKey = useCallback(
  (
    pageIndex: number,
    previousPageData: PaginatedResponse<T> | null
  ) => {
    if (!enabled) return null;

    if (pageIndex === 0) {
      return [cacheKey, null] as const;
    }

    if (
      !previousPageData ||
      !previousPageData.pagination.hasMore ||
      !previousPageData.pagination.nextCursor
    ) {
      return null;
    }

    return [
      cacheKey,
      previousPageData.pagination.nextCursor,
    ] as const;
  },
  [cacheKey, enabled]
);

  // Fetch and validate each page.
  const fetcher = useCallback(
    async ([, cursor]: [string, string | null]) => {

    const data = await fetchPage(cursor);



      if (!data.success || !data.pagination) {
        throw new Error(
          data.error ||
            data.message ||
            "Invalid response."
        );
      }

      return data;
    },
    [fetchPage]
  );

 const {
  data,
  error: swrError,
  size,
  setSize,
  mutate,
  isValidating,
  isLoading: swrIsLoading,
} = useSWRInfinite<PaginatedResponse<T>, Error>(
  getKey,
  fetcher,
  {
    initialSize: 1,
    persistSize: true,

    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,

    revalidateFirstPage: false,
    revalidateAll: false,

    dedupingInterval: 2000,
  }
);


  // Combine all cached pages into one array.
  const items = useMemo(() => {
  const allItems = data?.flatMap((page) => page.items ?? []) ?? [];

 

  const uniqueItems = new Map<string, T>();

  allItems.forEach((item) => {
    uniqueItems.set(getId(item), item);
  });

  console.log("[Pagination] FINAL ITEMS:", uniqueItems.size);

  return Array.from(uniqueItems.values());
}, [data, getId]);

  const lastPage = data?.[data.length - 1];

  const hasMore = lastPage?.pagination.hasMore ?? false;

  const nextCursor =
    lastPage?.pagination.nextCursor ?? null;

  const isLoading = enabled && swrIsLoading;

  const isLoadingMore =
    isValidating && size > (data?.length ?? 0);

  // Load the next page.
  const loadMore = useCallback(async () => {
    if (
      requestInProgressRef.current ||
      !hasMore ||
      !nextCursor ||
      isValidating
    ) {
      return;
    }

    requestInProgressRef.current = true;

    try {
      // Retry a failed page if size already exceeds
      // the number of successfully fetched pages.
      if (size > (data?.length ?? 0)) {
        await setSize(size);
      } else {
        await setSize(size + 1);
      }
    } finally {
      requestInProgressRef.current = false;
    }
  }, [
    hasMore,
    nextCursor,
    isValidating,
    size,
    data,
    setSize,
  ]);

  // Update cached items optimistically.
  const setItems = useCallback(
    (updater: SetStateAction<T[]>) => {
      void mutate(
        (pages) => {
          if (!pages?.length) return pages;

          const currentItems = pages.flatMap(
            (page) => page.items
          );

          const nextItems =
            typeof updater === "function"
              ? (updater as (previous: T[]) => T[])(
                  currentItems
                )
              : updater;

          // Preserve the original page distribution.
          let itemIndex = 0;

          return pages.map((page, index) => {
            const remaining = nextItems.length - itemIndex;

            const count =
              index === pages.length - 1
                ? remaining
                : Math.min(
                    page.items.length,
                    remaining
                  );

            const pageItems = nextItems.slice(
              itemIndex,
              itemIndex + Math.max(0, count)
            );

            itemIndex += Math.max(0, count);

            return {
              ...page,
              items: pageItems,
            };
          });
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  // Manually refresh cached pages.
  const fetchFirstPage = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Explicitly clear the current dataset.
  const reset = useCallback(async () => {
    requestInProgressRef.current = false;

    await mutate(undefined, {
      revalidate: false,
    });

    await setSize(1);
  }, [mutate, setSize]);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    nextCursor,
    error: swrError
      ? getErrorMessage(
          swrError,
          "Unable to load data."
        )
      : "",
    setItems,
    reset,
    fetchFirstPage,
    loadMore,
  };
}
