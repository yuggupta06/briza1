
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import useSWRInfinite from "swr/infinite";

import Loading from "@/app/components/Loading/loading";
import type { PostType } from "@/types/post";

import PostCard from "../Posts/post-card";

type FeedResponse = {
  success: boolean;
  posts: PostType[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
};



const fetchFeedPage = async (url: string): Promise<FeedResponse> => {
  const { data } = await axios.get<FeedResponse>(url);
  return data;
};

export default function ImagesFeed() {
  const loaderRef = useRef<HTMLDivElement>(null);

  // SWR creates a key for each cursor-based page.
  const getKey = useCallback(
    (pageIndex: number, previousPageData: FeedResponse | null) => {
      // Stop requesting pages when the previous page was the last one.
      if (
        previousPageData &&
        (!previousPageData.hasMore || !previousPageData.nextCursor)
      ) {
        return null;
      }

      // First page.
      if (pageIndex === 0) {
        return "/api/feed";
      }

      // Subsequent pages use the previous response's cursor.
      return `/api/feed?cursor=${encodeURIComponent(
        previousPageData!.nextCursor!
      )}`;
    },
    []
  );

  const {
    data: pages,
    error: feedError,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate: mutateFeed,
  } = useSWRInfinite<FeedResponse>(getKey, fetchFeedPage, {
  initialSize: 1,
  persistSize: true,

  refreshInterval: 60_000,
  revalidateAll: false,
  revalidateFirstPage: true,

  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,

  refreshWhenHidden: false,
  refreshWhenOffline: false,

  dedupingInterval: 2_000,
});

  // Combine the cached pages into one array for rendering.
  const posts = useMemo(() => {
    if (!pages) {
      return [];
    }

    return pages.flatMap((page) => page.posts);
  }, [pages]);

  const lastPage = pages?.[pages.length - 1];

  const hasMore = pages
    ? Boolean(lastPage?.hasMore && lastPage.nextCursor)
    : true;

  const isLoadingMore = isValidating && posts.length > 0;

  // Load the next page without manually maintaining a cursor.
  const loadMore = useCallback(() => {
    if (
      !hasMore ||
      isValidating ||
      !pages ||
      pages.length < size
    ) {
      return;
    }

    void setSize((currentSize) => currentSize + 1);
  }, [hasMore, isValidating, pages, setSize, size]);

  // Infinite scrolling.
  useEffect(() => {
    const element = loaderRef.current;

    if (!element || !hasMore || isLoading || feedError) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "300px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, feedError, loadMore]);

  // Initial loading state.
  if (isLoading && !pages) {
    return (
      <div className="relative flex min-h-[50vh] w-full items-center justify-center">
        <Loading classname="70vh" />
      </div>
    );
  }

  // Initial request failed.
  if (feedError && posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-center text-sm text-outline">
          Failed to load posts. Please try again.
        </p>

        <button
          type="button"
          onClick={() => void mutateFeed()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Posts feed"
      className="flex w-full flex-col gap-8"
    >
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
        />
      ))}

      {/* Infinite-scroll loading target */}
      <div
        ref={loaderRef}
        aria-label="Loading more posts"
        className="flex min-h-12 w-full items-center justify-center py-6"
      >
        {hasMore && isLoadingMore && (
          <div
            role="status"
            aria-label="Loading more posts"
            className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
          />
        )}
      </div>

      {/* Handle errors while retaining already-loaded posts. */}
      {feedError && posts.length > 0 && (
        <div className="flex flex-col items-center gap-3 pb-6">
          <p className="text-center text-sm text-outline">
            Could not load more posts.
          </p>

          <button
            type="button"
            onClick={() => void mutateFeed()}
            className="rounded-lg border border-outline px-4 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* End of feed */}
      {!hasMore && posts.length > 0 && (
        <p className="pb-6 text-center text-sm text-outline">
          You&apos;re all caught up.
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !feedError && posts.length === 0 && (
        <p className="py-12 text-center text-sm text-outline">
          No posts to show yet.
        </p>
      )}
    </section>
  );
}
