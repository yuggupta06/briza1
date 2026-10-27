"use client";

import { useEffect, useState } from "react";

import { useFollow } from "@/app/hooks/useFollow";
import { useFollowStatus } from "@/app/hooks/useFollowStatus";
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
    refreshStatus,
  } = useFollowStatus(targetUserId);

  const { toggleFollow, isMutating, error } = useFollow(targetUserId);
  const { mutateCurrentUser } = useCurrentUser();

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setIsFollowing(initialFollowing);
    }
  }, [initialFollowing, isLoading]);

  if (isSelf) return null;

  const handleClick = async () => {
    if (isLoading || isMutating || isFollowing === null) return;

    const previous = isFollowing;
    setIsFollowing(!previous);

    try {
      const result = await toggleFollow();

      if (!result) {
        setIsFollowing(previous);
        return;
      }

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
      setIsFollowing(previous);
      await refreshStatus();
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
        disabled={isMutating}
        aria-pressed={isFollowing}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-60 ${
          isFollowing
            ? "border border-neutral-300 bg-transparent text-current"
            : "bg-black text-white dark:bg-white dark:text-black"
        }`}
      >
        {isMutating
          ? "Please wait..."
          : isFollowing
            ? "Following"
            : "Follow"}
      </button>

      {(error || statusError) && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {error ?? statusError}
        </p>
      )}
    </div>
  );
}