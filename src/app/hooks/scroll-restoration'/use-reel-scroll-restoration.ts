
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

const STORAGE_KEY = "briza-reels-scroll";

function getSavedSnapshot(): ReelSnapshot | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
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

  // Save the Reel with the largest visible area.
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

    const snapshot: ReelSnapshot = {
      postId: visibleReel.reel.dataset.postId!,
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

  // Restore the saved Reel once it becomes available.
  useEffect(() => {
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
        behavior: "auto",
      });

      restoredPostIdRef.current = snapshot.postId;
      setIsRestoring(false);
      return;
    }

    // The saved Reel isn't loaded yet.
    // Request another SWR page and check again when it arrives.
    if (hasMore && !isLoadingMore) {
      if (requestedForVideoCountRef.current !== videos.length) {
        requestedForVideoCountRef.current = videos.length;
        loadMore();
      }

      return;
    }

    // Stop restoring if there are no more pages to load.
    if (!hasMore && !isLoadingMore) {
      setIsRestoring(false);
    }
  }, [
    containerRef,
    videos,
    hasMore,
    isLoadingMore,
    loadMore,
  ]);

  // Save while scrolling, when the page is hidden, and before unmount.
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
      if (saveFrame) return;

      saveFrame = requestAnimationFrame(() => {
        saveFrame = 0;
        saveIfReady();
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

      // Save the latest position before the component unmounts.
      saveIfReady();
    };
  }, [containerRef, isRestoring, savePosition]);

  return { isRestoring };
}
