"use client";

import { useCallback } from "react";

interface UseSharePostOptions {
  postId: string;
  username: string;
  onLinkCopied?: () => void;
  onShareError?: () => void;
}

export function useSharePost({
  postId,
  username,
  onLinkCopied,
  onShareError,
}: UseSharePostOptions) {
  const sharePost = useCallback(async () => {
    const url = `${window.location.origin}/profile/${encodeURIComponent(
      username
    )}?post=${encodeURIComponent(postId)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by @${username}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        onLinkCopied?.();
      }
    } catch (error) {
      // Closing the native share dialog is not an actual error.
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error("Error sharing post:", error);
      onShareError?.();
    }
  }, [postId, username, onLinkCopied, onShareError]);

  return sharePost;
}