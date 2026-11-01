
"use client";

import axios from "axios";
import { LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect } from "react";

import FollowUserItem from "@/app/components/follow/FollowUserItem";
import {
  usePaginatedData,
  type PaginatedResponse,
} from "@/app/hooks/Pagination/use-paginated-data";

type FollowListType = "followers" | "following";

import type {
  FollowListResponse,
  FollowUser,
} from "@/types/follow";

interface FollowListModalProps {
  username: string;
  type: FollowListType;
  onClose: () => void;
}

export default function FollowListModal({
  username,
  type,
  onClose,
}: FollowListModalProps) {

  // 1. Fetch a page of followers or following.
  const fetchFollowPage = useCallback(
    async (
      cursor: string | null
    ): Promise<PaginatedResponse<FollowUser>> => {
      const params = new URLSearchParams({
        username,
        limit: "20",
      });

      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await axios.get<FollowListResponse>(
        `/api/follow/${type}?${params.toString()}`
      );

      const page = response.data;

      if (!page.success) {
        throw new Error("Unable to load users");
      }

      return {
        success: true,
        items: page.users,
        pagination: page.pagination,
      };
    },
    [username, type]
  );

  // 2. Initialize generic pagination.
  const {
    items: users,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    reset,
    fetchFirstPage,
    loadMore,
  } = usePaginatedData<FollowUser>(
    fetchFollowPage,
    (user) => user._id
  );

  // 3. Fetch the first page when the modal opens
  // or username/type changes.
  useEffect(() => {
    reset();
    void fetchFirstPage();
  }, [reset, fetchFirstPage]);

  // 4. Close modal using Escape.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-list-title"
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white text-black shadow-xl dark:bg-neutral-950 dark:text-white"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 id="follow-list-title" className="font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close list"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoaderCircle className="animate-spin" />
            </div>
          )}

          {error && (
            <p role="alert" className="py-5 text-sm text-red-500">
              {error}
            </p>
          )}

          {!isLoading && !error && users.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">
              No {title.toLowerCase()} yet.
            </p>
          )}

          {users.map((user) => (
            <FollowUserItem key={user._id} user={user} />
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={isLoadingMore}
              className="my-3 w-full rounded-lg border py-2 text-sm disabled:opacity-60"
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
