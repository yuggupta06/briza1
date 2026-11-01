
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import useSWRInfinite from "swr/infinite";

import { Icon } from "@/app/components/ui/briza-icon";
import { LoopVideoCard } from "@/app/components/Reels/LoopVideoCard";
import type { PostType } from "@/types/post";
import { useReelScrollRestoration } from "@/app/hooks/scroll-restoration'/use-reel-scroll-restoration";

type ReelsResponse = {
  success: boolean;
  items: PostType[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  error?: string;
};

const fetchReelsPage = async (url: string): Promise<ReelsResponse> => {
  const { data } = await axios.get<ReelsResponse>(url);
  return data;
};

export default function ReelsPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [activePostId, setActivePostId] = useState<string | null>(null);

  // one single mute for all reels
  const [isMuted, setIsMuted] = useState(true);
  const toggleMute = useCallback(() => {
    setIsMuted((previous) => !previous);
  }, []);
  // Generate a separate SWR key for each cursor-based page.
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ReelsResponse | null) => {
      // Stop when the previous page has no more results.
      if (
        previousPageData &&
        (!previousPageData.pagination.hasMore ||
          !previousPageData.pagination.nextCursor)
      ) {
        return null;
      }

      // First page.
      if (pageIndex === 0) {
        return "/api/reels";
      }

      // Subsequent pages use the previous page's cursor.
      return `/api/reels?cursor=${encodeURIComponent(
        previousPageData!.pagination.nextCursor!
      )}`;
    },
    []
  );

  const {
    data: pages,
    error: reelsError,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate: mutateReels,
  } = useSWRInfinite<ReelsResponse>(getKey, fetchReelsPage, {
    initialSize: 1,
    persistSize: true,

    // Keep cached pages when returning to Reels.
    revalidateAll: false,
    revalidateFirstPage: false,

    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,

    refreshWhenHidden: false,
    refreshWhenOffline: false,

    dedupingInterval: 2_000,
  });

  // Combine all cached pages into one array.
  const videos = useMemo(() => {
    if (!pages) return [];

    return pages.flatMap((page) => page.items);
  }, [pages]);

  const lastPage = pages?.[pages.length - 1];

  const hasMore = pages
    ? Boolean(
      lastPage?.pagination.hasMore &&
      lastPage.pagination.nextCursor
    )
    : true;

  // True only when an additional page is being requested.
  const isLoadingMore = Boolean(
    isValidating &&
    pages?.length &&
    size > pages.length
  );

  // Request the next page.
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

  // Observe video slides and identify the most visible Reel.
  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container || videos.length === 0) {
      setActivePostId(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => b.intersectionRatio - a.intersectionRatio
          )[0];

        if (visibleEntry) {
          const postId = (
            visibleEntry.target as HTMLElement
          ).dataset.postId;

          if (postId) {
            setActivePostId(postId);
          }
        }
      },
      {
        root: container,
        threshold: [0.25, 0.5, 0.75],
      }
    );

    const slides = container.querySelectorAll("[data-post-id]");

    slides.forEach((slide) => observer.observe(slide));

    return () => observer.disconnect();
  }, [videos]);

  // Infinite scrolling.
  useEffect(() => {
    const container = scrollContainerRef.current;
    const sentinel = loadMoreRef.current;

    if (
      !container ||
      !sentinel ||
      !hasMore ||
      isLoading ||
      reelsError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        root: container,
        rootMargin: "500px",
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoading, reelsError, loadMore]);

  // Keep interaction counts synchronized with the SWR cache.
  const handleCountsChange = useCallback(
    (
      postId: string,
      counts: {
        isLiked: boolean;
        likesCount: number;
        commentsCount: number;
      }
    ) => {
      void mutateReels(
        (currentPages) =>
          currentPages?.map((page) => ({
            ...page,
            items: page.items.map((post) =>
              post._id === postId
                ? {
                  ...post,
                  ...counts,
                }
                : post
            ),
          })),
        { revalidate: false }
      );
    },
    [mutateReels]
  );
  const { isRestoring } = useReelScrollRestoration({
    containerRef: scrollContainerRef,
    videos,
    hasMore,
    isLoadingMore,
    loadMore,
  });
  // Initial loading state.
  if (isLoading && !pages) {
    return (
      <main className="fixed inset-0 z-40 flex items-center justify-center bg-black text-white">
        <Icon
          name="progress_activity"
          className="animate-spin text-3xl"
        />
      </main>
    );
  }

  // Initial request failed.
  if (reelsError && videos.length === 0) {
    return (
      <main className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-sm text-white/70">
          Failed to load Reels. Please try again.
        </p>

        <button
          type="button"
          onClick={() => void mutateReels()}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Mobile Reels */}
      <div className="fixed inset-0 z-40 bg-black text-white md:hidden">
        <div
          ref={scrollContainerRef}
          className="h-dvh w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
          style={{
            visibility: isRestoring ? "hidden" : "visible",
          }}
        >
          {videos.length === 0 ? (
            <div className="flex h-dvh flex-col items-center justify-center text-center">
              <Icon
                name="movie"
                className="mb-4 text-5xl opacity-50"
              />

              <h2 className="text-xl font-semibold">
                No Reels yet
              </h2>

              <p className="mt-2 text-sm text-white/60">
                Videos shared by the Briza community will appear here.
              </p>
            </div>
          ) : (
            <>
              {videos.map((post) => (
                <div
                  key={post._id}
                  data-post-id={post._id}
                  className="h-dvh w-full snap-start snap-always"
                >
                  <LoopVideoCard
                    post={post}
                    isActive={activePostId === post._id}
                    onCountsChange={handleCountsChange}
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                  />
                </div>
              ))}

              {/* Infinite-scroll sentinel */}
              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="h-10 w-full"
                />
              )}

              {/* Loading more Reels */}
              {isLoadingMore && (
                <div className="flex h-16 items-center justify-center">
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-2xl"
                  />
                </div>
              )}

              {/* Error while loading another page */}
              {reelsError && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-white/70">
                    Could not load more Reels.
                  </p>

                  <button
                    type="button"
                    onClick={() => void mutateReels()}
                    className="rounded-lg border border-white/30 px-4 py-2 text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!hasMore && (
                <p className="py-6 text-center text-sm text-white/50">
                  You&apos;re all caught up.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
