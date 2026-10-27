
"use client";

import { useEffect } from "react";
import { LoaderCircle, X } from "lucide-react";

import { useFollowList } from "@/app/hooks/useFollowList";
import type { FollowListType } from "@/app/hooks/useFollowList";
import FollowUserItem from "@/app/components/follow/FollowUserItem";

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
  const {
    users,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useFollowList(username, type);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

          <button type="button" onClick={onClose} aria-label="Close list">
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
              onClick={loadMore}
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
