"use client";

import { useCallback, useEffect, useState } from "react";

type FeedSnapshot = {
  postId: string;
  offset: number;
};

const STORAGE_KEY = "briza-feed-scroll";

function getSavedSnapshot(): FeedSnapshot | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function useFeedScrollRestoration() {
  const [isRestoring, setIsRestoring] = useState(
    () => Boolean(getSavedSnapshot())
  );


  const savePosition = useCallback(() => {
    const feed = document.querySelector("[data-feed-container]");
    if (!feed) return;

    const posts = Array.from(
      feed.querySelectorAll<HTMLElement>("[data-post-id]")
    );

    const visiblePost = posts.find((post) => {
      const rect = post.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    });

    if (!visiblePost) return;

    const snapshot: FeedSnapshot = {
      postId: visiblePost.dataset.postId!,
      offset: visiblePost.getBoundingClientRect().top,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, []);

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
        const currentOffset = target.getBoundingClientRect().top;

        window.scrollTo({
          top: window.scrollY + currentOffset - snapshot.offset,
          behavior: "instant",
        });

        sessionStorage.removeItem(STORAGE_KEY);

        completed = true;
        setIsRestoring(false);
        return;
      }

      attempts++;

      // Do not keep the screen hidden forever.
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

  useEffect(() => {
    let saveFrame = 0;

    const handleScroll = () => {
      if (saveFrame) return;

      saveFrame = requestAnimationFrame(() => {
        saveFrame = 0;

        if (!isRestoring) {
          savePosition();
        }
      });
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(saveFrame);
    };
  }, [isRestoring, savePosition]);

  return { isRestoring };
}
