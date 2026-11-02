
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

type ReelSnapshot = {
  postId: string;
  offset: number;
};

type UseReelScrollRestorationOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  videos: { _id: string }[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
};

// Dedicated storage key for Reels.
const STORAGE_KEY = "briza:reels:scroll:v1";

// Prevent repeated initial navigation checks.
let hasCheckedInitialReload = false;

function getSavedSnapshot(): ReelSnapshot | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);

    if (!saved) return null;

    const parsed: unknown = JSON.parse(saved);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("postId" in parsed) ||
      !("offset" in parsed) ||
      typeof parsed.postId !== "string" ||
      typeof parsed.offset !== "number"
    ) {
      return null;
    }

    return {
      postId: parsed.postId,
      offset: parsed.offset,
    };
  } catch {
    return null;
  }
}

export function useReelScrollRestoration({
  containerRef,
  videos,
  hasMore,
  isLoadingMore,
  loadMore,
}: UseReelScrollRestorationOptions) {
  const [isRestoring, setIsRestoring] = useState(
    () => Boolean(getSavedSnapshot())
  );

  const restoredPostIdRef = useRef<string | null>(null);

  const requestedForVideoCountRef = useRef<number | null>(null);

  // 1. Clear the saved Reel snapshot ONLY on browser reload.
  useEffect(() => {
    if (hasCheckedInitialReload) return;

    hasCheckedInitialReload = true;

    const navigationEntry = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;

    if (navigationEntry?.type === "reload") {
      sessionStorage.removeItem(STORAGE_KEY);

      setIsRestoring(false);

      // Reels use an internal scrollable container.
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: "instant",
        });
      }
    }
  }, [containerRef]);

  // 2. Save the Reel with the largest visible area.
  const savePosition = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    const reels = Array.from(
      container.querySelectorAll<HTMLElement>("[data-post-id]")
    );

    const visibleReel = reels
      .map((reel) => {
        const rect = reel.getBoundingClientRect();

        const visibleHeight =
          Math.min(rect.bottom, containerRect.bottom) -
          Math.max(rect.top, containerRect.top);

        return {
          reel,
          visibleHeight: Math.max(0, visibleHeight),
          offset: rect.top - containerRect.top,
        };
      })
      .filter((item) => item.visibleHeight > 0)
      .sort((a, b) => b.visibleHeight - a.visibleHeight)[0];

    if (!visibleReel) return;

    const postId = visibleReel.reel.dataset.postId;

    if (!postId) return;

    const snapshot: ReelSnapshot = {
      postId,
      offset: visibleReel.offset,
    };

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(snapshot)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [containerRef]);

  // 3. Restore the saved Reel once it becomes available.
  useEffect(() => {
    if (!isRestoring) return;

    const container = containerRef.current;
    const snapshot = getSavedSnapshot();

    if (!container || !snapshot) {
      setIsRestoring(false);
      return;
    }

    // Don't restore the same snapshot twice during this mount.
    if (restoredPostIdRef.current === snapshot.postId) {
      return;
    }

    const reels = Array.from(
      container.querySelectorAll<HTMLElement>("[data-post-id]")
    );

    const target = reels.find(
      (reel) => reel.dataset.postId === snapshot.postId
    );

    if (target) {
      const containerTop =
        container.getBoundingClientRect().top;

      const currentOffset =
        target.getBoundingClientRect().top - containerTop;

      container.scrollTo({
        top:
          container.scrollTop +
          currentOffset -
          snapshot.offset,
        behavior: "instant",
      });

      restoredPostIdRef.current = snapshot.postId;

      setIsRestoring(false);
      return;
    }

    // Saved Reel isn't loaded yet. Request another page.
    if (hasMore && !isLoadingMore) {
      if (
        requestedForVideoCountRef.current !== videos.length
      ) {
        requestedForVideoCountRef.current = videos.length;
        loadMore();
      }

      return;
    }

    // No more pages available.
    if (!hasMore && !isLoadingMore) {
      setIsRestoring(false);
    }
  }, [
    containerRef,
    videos,
    hasMore,
    isLoadingMore,
    loadMore,
    isRestoring,
  ]);

  // 4. Save while scrolling and before leaving the Reels page.
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let saveFrame = 0;

    const saveIfReady = () => {
      if (!isRestoring) {
        savePosition();
      }
    };

    const handleScroll = () => {
      if (isRestoring || saveFrame) return;

      saveFrame = requestAnimationFrame(() => {
        saveFrame = 0;
        savePosition();
      });
    };

    const handlePageHide = () => {
      saveIfReady();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveIfReady();
      }
    };

    container.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("pagehide", handlePageHide);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      container.removeEventListener("scroll", handleScroll);

      window.removeEventListener("pagehide", handlePageHide);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      if (saveFrame) {
        cancelAnimationFrame(saveFrame);
      }

      // Preserve the snapshot during client-side navigation.
      if (!isRestoring) {
        savePosition();
      }
    };
  }, [containerRef, isRestoring, savePosition]);

  return { isRestoring };
}
