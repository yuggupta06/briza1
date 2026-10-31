
"use client";

import { useEffect, useRef, useState } from "react";

import { useFollow } from "@/app/hooks/follow/useFollow";
import { useFollowStatus } from "@/app/hooks/follow/useFollowStatus";
import { useCurrentUser } from "@/app/hooks/useCurrentUser";

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: (result: {
    isFollowing: boolean;
    followers: number;
    following: number;
  }) => void;
}

export default function FollowButton({
  targetUserId,
  onFollowChange,
}: FollowButtonProps) {
  const {
    isFollowing: initialFollowing,
    isSelf,
    isLoading,
    error: statusError,
  } = useFollowStatus(targetUserId);

  const { toggleFollow, error } = useFollow(targetUserId);
  const { mutateCurrentUser } = useCurrentUser();

  // Synchronous lock: prevents overlapping requests before React rerenders.
  const requestInProgress = useRef(false);

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isLoading && !requestInProgress.current) {
      setIsFollowing(initialFollowing);
    }
  }, [initialFollowing, isLoading]);

  if (isSelf) return null;

  const handleClick = async () => {
    if (
      requestInProgress.current ||
      isLoading ||
      isFollowing === null
    ) {
      return;
    }

    requestInProgress.current = true;

    const previous = isFollowing;

    // Optimistic UI: change the label immediately.
    setIsFollowing(!previous);
    setIsPending(true);

    try {
      const result = await toggleFollow();

      if (!result) {
        // The request did not succeed; restore the original state.
        setIsFollowing(previous);
        return;
      }

      // Trust the server's confirmed result.
      setIsFollowing(result.isFollowing);

      onFollowChange?.({
        isFollowing: result.isFollowing,
        followers: result.followers,
        following: result.following,
      });

      const followingDelta =
        Number(result.isFollowing) - Number(previous);

      if (followingDelta !== 0) {
        await mutateCurrentUser(
          (currentData) => {
            if (!currentData?.user) return currentData;

            return {
              ...currentData,
              user: {
                ...currentData.user,
                following: Math.max(
                  0,
                  currentData.user.following + followingDelta
                ),
              },
            };
          },
          { revalidate: false }
        );
      }
    } catch {
      // Roll back if the API request fails.
      setIsFollowing(previous);
    } finally {
      setIsPending(false);
      requestInProgress.current = false;
    }
  };

  if (isLoading || isFollowing === null) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border px-4 py-2 text-sm"
      >
        Loading...
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={isFollowing}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-60 cursor-pointer ${
          isFollowing
            ? "border border-neutral-300 bg-transparent text-current"
            : "bg-black text-white dark:bg-white dark:text-black"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>

      {(error || statusError) && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {error ?? statusError}
        </p>
      )}
    </div>
  );
}
