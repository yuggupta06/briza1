"use client";
import { useCallback, useEffect, useState } from "react";

type FeedSnapshot = {
  postId: string;
  offset: number;
};

const STORAGE_KEY = "briza-feed-scroll";

// Prevent repeated initial navigation checks.
let hasCheckedInitialReload = false;

function getSavedSnapshot(): FeedSnapshot | null {
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

export function useFeedScrollRestoration() {
  const [isRestoring, setIsRestoring] = useState(
    () => Boolean(getSavedSnapshot())
  );

  // 1. Clear saved feed data ONLY on browser reload.
  useEffect(() => {
    if (hasCheckedInitialReload) return;

    hasCheckedInitialReload = true;

    const navigationEntry = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;

    if (navigationEntry?.type === "reload") {
      sessionStorage.removeItem(STORAGE_KEY);

      setIsRestoring(false);

      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    }
  }, []);

  // 2. Save the post with the largest visible area.
  const savePosition = useCallback(() => {
    const feed = document.querySelector("[data-feed-container]");

    if (!feed) return;

    const posts = Array.from(
      feed.querySelectorAll<HTMLElement>("[data-post-id]")
    );

    const visiblePost = posts
      .map((post) => {
        const rect = post.getBoundingClientRect();

        const visibleHeight =
          Math.min(rect.bottom, window.innerHeight) -
          Math.max(rect.top, 0);

        return {
          post,
          visibleHeight: Math.max(0, visibleHeight),
          offset: rect.top,
        };
      })
      .filter((item) => item.visibleHeight > 0)
      .sort((a, b) => b.visibleHeight - a.visibleHeight)[0];

    if (!visiblePost) return;

    const postId = visiblePost.post.dataset.postId;

    if (!postId) return;

    const snapshot: FeedSnapshot = {
      postId,
      offset: visiblePost.offset,
    };

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(snapshot)
      );
    } catch {
      // Ignore storage errors.
    }
  }, []);

  // 3. Restore the saved position.
  useEffect(() => {
    let restoreFrame = 0;
    let attempts = 0;
    let completed = false;

    const snapshot = getSavedSnapshot();

    if (!snapshot) {
      setIsRestoring(false);
      return;
    }

    const restore = () => {
      if (completed) return;

      const feed = document.querySelector("[data-feed-container]");

      const posts = feed?.querySelectorAll<HTMLElement>(
        "[data-post-id]"
      );

      const target = Array.from(posts ?? []).find(
        (post) => post.dataset.postId === snapshot.postId
      );

      if (target) {
        const currentOffset =
          target.getBoundingClientRect().top;

        window.scrollTo({
          top:
            window.scrollY +
            currentOffset -
            snapshot.offset,
          behavior: "instant",
        });

        completed = true;
        setIsRestoring(false);
        return;
      }

      attempts++;

      if (attempts >= 600) {
        completed = true;
        setIsRestoring(false);
        return;
      }

      restoreFrame = requestAnimationFrame(restore);
    };

    restoreFrame = requestAnimationFrame(restore);

    return () => {
      cancelAnimationFrame(restoreFrame);
    };
  }, []);

  // 4. Save while scrolling and when leaving the feed.
  useEffect(() => {
    let saveFrame = 0;

    const handleScroll = () => {
      if (isRestoring || saveFrame) return;

      saveFrame = requestAnimationFrame(() => {
        saveFrame = 0;
        savePosition();
      });
    };

    const handlePageHide = () => {
      if (!isRestoring) {
        savePosition();
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        !isRestoring
      ) {
        savePosition();
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("pagehide", handlePageHide);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener("scroll", handleScroll);
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
  }, [isRestoring, savePosition]);

  return { isRestoring };
}