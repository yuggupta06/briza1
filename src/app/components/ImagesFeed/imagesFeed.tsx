
"use client";

import axios from "axios";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import Loading from "@/app/components/Loading/loading";
import type { PostType } from "@/types/post";

import PostCard from "../Posts/post-card";
import {
  imagesFeedReducer,
  initialState,
} from "./imageFeedReducer";

type FeedResponse = {
  success: boolean;
  posts: PostType[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
};

export default function ImagesFeed() {
  const [state, dispatch] = useReducer(
    imagesFeedReducer,
    initialState
  );
  const [currentUserId,setCurrentUserId]=useState<string>("")

  const { feed } = state;

  // Pagination and request control.
  const cursorRef = useRef<string | null>(null);
  const hasMoreImagesRef = useRef(true);
  const isFetchingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  // Prevent duplicate posts across pages.
  const loadedPostIdsRef = useRef<Set<string>>(new Set());

  // IntersectionObserver target.
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchImages = useCallback(async () => {
    if (
      !hasMoreImagesRef.current ||
      isFetchingRef.current
    ) {
      return;
    }

    const controller = new AbortController();

    controllerRef.current = controller;
    isFetchingRef.current = true;

    dispatch({
      type: "SET_FEED_LOADING",
      payload: true,
    });

    try {
      const response = await axios.get<FeedResponse>(
        "/api/feed",
        {
          params: {
            cursor: cursorRef.current ?? undefined,
          },
          signal: controller.signal,
        }
      );

      if (controller.signal.aborted) {
        return;
      }

      const { posts, nextCursor } = response.data;

      // Add only posts that have not already been loaded.
      const newPosts = posts.filter((post) => {
        if (loadedPostIdsRef.current.has(post._id)) {
          return false;
        }

        loadedPostIdsRef.current.add(post._id);
        return true;
      });

      if (newPosts.length > 0) {
        dispatch({
          type: "APPEND_POSTS",
          payload: newPosts,
        });
      }

      // Save the cursor for the next page.
      cursorRef.current = nextCursor;

      dispatch({
        type: "SET_CURSOR",
        payload: nextCursor,
      });

      const hasMore =
        nextCursor !== null &&
        response.data.hasMore !== false;

      hasMoreImagesRef.current = hasMore;

      dispatch({
        type: "SET_HAS_MORE",
        payload: hasMore,
      });
    } catch (error) {
      if (
        !controller.signal.aborted &&
        !axios.isCancel(error)
      ) {
        console.error("Failed to fetch feed posts:", error);
      }
    } finally {
      // Only the current request should reset loading state.
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        isFetchingRef.current = false;

        dispatch({
          type: "SET_FEED_LOADING",
          payload: false,
        });
      }
    }
  }, []);
useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await axios.get("/api/profile/me", {
          withCredentials: true,
        });

        setCurrentUserId(String(data.user._id));
        
      } catch (error) {
        console.error("Failed to fetch current user", error);
      }
    };

    fetchCurrentUser();
  }, []);
  // Fetch the first page on mount.
  useEffect(() => {
    void fetchImages();
  }, [fetchImages]);

  // Infinite scrolling.
  useEffect(() => {
    const element = loaderRef.current;

    if (!element || !feed.hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void fetchImages();
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
  }, [feed.hasMore, feed.loading, fetchImages]);

  // Cancel an outstanding request on unmount.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      isFetchingRef.current = false;
    };
  }, []);

  // Initial loading state.
  if (feed.loading && state.posts.length === 0) {
    return (
      <div className="relative flex min-h-[50vh] w-full items-center justify-center">
        <Loading classname="70vh" />
      </div>
    );
  }

  return (
    <section
      aria-label="Posts feed"
      className="flex w-full flex-col gap-8"
    >
      {state.posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          currentUserId={currentUserId}
        />
      ))}

      {/* Infinite-scroll loading target */}
      <div
        ref={loaderRef}
        aria-label="Loading more posts"
        className="flex min-h-12 w-full items-center justify-center py-6"
      >
        {feed.hasMore && feed.loading && state.posts.length > 0 && (
          <div
            role="status"
            aria-label="Loading more posts"
            className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
          />
        )}
      </div>

      {/* End of feed */}
      {!feed.hasMore && state.posts.length > 0 && (
        <p className="pb-6 text-center text-sm text-outline">
          You&apos;re all caught up.
        </p>
      )}

      {/* Empty state */}
      {!feed.loading && state.posts.length === 0 && (
        <p className="py-12 text-center text-sm text-outline">
          No posts to show yet.
        </p>
      )}
    </section>
  );
}
