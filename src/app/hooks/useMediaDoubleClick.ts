
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseMediaDoubleClickOptions {
  liked: boolean;
  isLiking: boolean;
  handleLike: () => Promise<void> | void;
  onSingleClick?: () => void;
  restartAnimation?: boolean;
}

export function useMediaDoubleClick({
  liked,
  isLiking,
  handleLike,
  onSingleClick,
  restartAnimation = false,
}: UseMediaDoubleClickOptions) {
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartAnimationKey, setHeartAnimationKey] = useState(0);

  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDoubleClick = useCallback(() => {
    if (restartAnimation) {
      setHeartAnimationKey((previous) => previous + 1);
    }

    setShowHeartAnimation(true);

    if (heartTimerRef.current) {
      clearTimeout(heartTimerRef.current);
    }

    heartTimerRef.current = setTimeout(() => {
      setShowHeartAnimation(false);
      heartTimerRef.current = null;
    }, 700);

    if (!liked && !isLiking) {
      void handleLike();
    }
  }, [liked, isLiking, handleLike, restartAnimation]);

  // Distinguish a single click from a double click.
  const handleClick = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;

      handleDoubleClick();
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      onSingleClick?.();
      clickTimerRef.current = null;
    }, 250);
  }, [handleDoubleClick, onSingleClick]);

  useEffect(() => {
    return () => {
      if (heartTimerRef.current) {
        clearTimeout(heartTimerRef.current);
      }

      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  return {
    showHeartAnimation,
    heartAnimationKey,
    handleDoubleClick,
    handleClick,
  };
}
