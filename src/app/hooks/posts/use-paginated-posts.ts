
"use client";

import axios from "axios";
import { useCallback, useReducer, useRef } from "react";
import type { SetStateAction } from "react";
import type { PostType } from "@/types/post";

export interface PaginatedPostsResponse {
  success: boolean;
  posts: PostType[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  error?: string;
  message?: string;
}

type FetchPage = (
  cursor: string | null
) => Promise<PaginatedPostsResponse>;

interface PaginatedPostsState {
  posts: PostType[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  error: string;
}

type Action =
  | { type: "first-page-start" }
  | {
      type: "first-page-success";
      posts: PostType[];
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { type: "first-page-error"; error: string }
  | { type: "load-more-start" }
  | {
      type: "load-more-success";
      posts: PostType[];
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { type: "load-more-error"; error: string }
  | { type: "set-posts"; updater: SetStateAction<PostType[]> }
  | { type: "reset" };

const initialState: PaginatedPostsState = {
  posts: [],
  isLoading: true,
  isLoadingMore: false,
  hasMore: false,
  nextCursor: null,
  error: "",
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      fallback
    );
  }

  return error instanceof Error ? error.message : fallback;
}

function reducer(
  state: PaginatedPostsState,
  action: Action
): PaginatedPostsState {
  switch (action.type) {
    case "first-page-start":
      return {
        ...state,
        isLoading: true,
        isLoadingMore: false,
        error: "",
      };

    case "first-page-success":
      return {
        ...state,
        posts: action.posts,
        isLoading: false,
        isLoadingMore: false,
        hasMore: action.hasMore,
        nextCursor: action.nextCursor,
        error: "",
      };

    case "first-page-error":
      return {
        ...state,
        isLoading: false,
        isLoadingMore: false,
        error: action.error,
      };

    case "load-more-start":
      return {
        ...state,
        isLoadingMore: true,
        error: "",
      };

    case "load-more-success": {
      const existingIds = new Set(
        state.posts.map((post) => post._id)
      );

      return {
        ...state,
        posts: [
          ...state.posts,
          ...action.posts.filter(
            (post) => !existingIds.has(post._id)
          ),
        ],
        isLoadingMore: false,
        hasMore: action.hasMore,
        nextCursor: action.nextCursor,
        error: "",
      };
    }

    case "load-more-error":
      return {
        ...state,
        isLoadingMore: false,
        error: action.error,
      };

    case "set-posts":
      return {
        ...state,
        posts:
          typeof action.updater === "function"
            ? action.updater(state.posts)
            : action.updater,
      };

    case "reset":
      return initialState;

    default:
      return state;
  }
}

export function usePaginatedPosts(fetchPage: FetchPage) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Identifies the latest request. Older requests cannot update the state.
  const requestIdRef = useRef(0);

  // Prevents multiple load-more requests from running simultaneously.
  const requestInProgressRef = useRef(false);

  const setPosts = useCallback(
    (updater: SetStateAction<PostType[]>) => {
      dispatch({ type: "set-posts", updater });
    },
    []
  );

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    requestInProgressRef.current = false;
    dispatch({ type: "reset" });
  }, []);

  const fetchFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    requestInProgressRef.current = true;
    dispatch({ type: "first-page-start" });

    try {
      const data = await fetchPage(null);

      if (requestId !== requestIdRef.current) return;

      if (!data.success || !data.pagination) {
        throw new Error(
          data.error ||
            data.message ||
            "Invalid posts response."
        );
      }

      dispatch({
        type: "first-page-success",
        posts: data.posts,
        hasMore: data.pagination.hasMore,
        nextCursor: data.pagination.nextCursor,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      console.error("Unable to fetch posts:", error);

      dispatch({
        type: "first-page-error",
        error: getErrorMessage(
          error,
          "Unable to load posts. Please try again."
        ),
      });
    } finally {
      if (requestId === requestIdRef.current) {
        requestInProgressRef.current = false;
      }
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    const cursor = state.nextCursor;

    if (
      requestInProgressRef.current ||
      !state.hasMore ||
      !cursor
    ) {
      return;
    }

    const requestId = requestIdRef.current;

    requestInProgressRef.current = true;
    dispatch({ type: "load-more-start" });

    try {
      const data = await fetchPage(cursor);

      if (requestId !== requestIdRef.current) return;

      if (!data.success || !data.pagination) {
        throw new Error(
          data.error ||
            data.message ||
            "Invalid posts response."
        );
      }

      dispatch({
        type: "load-more-success",
        posts: data.posts,
        hasMore: data.pagination.hasMore,
        nextCursor: data.pagination.nextCursor,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      console.error("Unable to load more posts:", error);

      dispatch({
        type: "load-more-error",
        error: getErrorMessage(
          error,
          "Unable to load more posts. Please try again."
        ),
      });
    } finally {
      if (requestId === requestIdRef.current) {
        requestInProgressRef.current = false;
      }
    }
  }, [fetchPage, state.hasMore, state.nextCursor]);

  return {
    ...state,
    setPosts,
    reset,
    fetchFirstPage,
    loadMore,
  };
}
