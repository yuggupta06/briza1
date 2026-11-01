
"use client";

import axios from "axios";
import { useCallback, useReducer, useRef } from "react";
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

interface PaginatedState<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  error: string;
}

type Action<T> =
  | { type: "first-page-start" }
  | {
      type: "first-page-success";
      items: T[];
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { type: "first-page-error"; error: string }
  | { type: "load-more-start" }
  | {
      type: "load-more-success";
      items: T[];
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { type: "load-more-error"; error: string }
  | {
      type: "set-items";
      updater: SetStateAction<T[]>;
    }
  | { type: "reset" };

function createInitialState<T>(): PaginatedState<T> {
  return {
    items: [],
    isLoading: true,
    isLoadingMore: false,
    hasMore: false,
    nextCursor: null,
    error: "",
  };
}

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

function reducer<T>(
  state: PaginatedState<T>,
  action: Action<T>
): PaginatedState<T> {
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
        items: action.items,
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
      return {
        ...state,
        items: [
          ...state.items,
          ...action.items,
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

    case "set-items":
      return {
        ...state,
        items:
          typeof action.updater === "function"
            ? action.updater(state.items)
            : action.updater,
      };

    case "reset":
      return createInitialState<T>();

    default:
      return state;
  }
}

export function usePaginatedData<T>(
  fetchPage: FetchPage<T>,
  getId: (item: T) => string
) {
  const [state, dispatch] = useReducer(
    reducer<T>,
    undefined,
    createInitialState<T>
  );

  const requestIdRef = useRef(0);
  const requestInProgressRef = useRef(false);

  const setItems = useCallback(
    (updater: SetStateAction<T[]>) => {
      dispatch({ type: "set-items", updater });
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
          data.error || data.message ||
          "Invalid response."
        );
      }

      dispatch({
        type: "first-page-success",
        items: data.items,
        hasMore: data.pagination.hasMore,
        nextCursor: data.pagination.nextCursor,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      dispatch({
        type: "first-page-error",
        error: getErrorMessage(
          error,
          "Unable to load data."
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
          data.error || data.message ||
          "Invalid response."
        );
      }

      dispatch({
        type: "load-more-success",
        items: data.items.filter(
          (item) =>
            !state.items.some(
              (existing) => getId(existing) === getId(item)
            )
        ),
        hasMore: data.pagination.hasMore,
        nextCursor: data.pagination.nextCursor,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      dispatch({
        type: "load-more-error",
        error: getErrorMessage(
          error,
          "Unable to load more data."
        ),
      });
    } finally {
      if (requestId === requestIdRef.current) {
        requestInProgressRef.current = false;
      }
    }
  }, [
    fetchPage,
    state.hasMore,
    state.nextCursor,
    state.items,
    getId,
  ]);

  return {
    ...state,
    setItems,
    reset,
    fetchFirstPage,
    loadMore,
  };
}
