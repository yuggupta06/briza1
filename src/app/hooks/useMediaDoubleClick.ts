"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseMediaDoubleClickOptions {
  liked: boolean;
  isLiking: boolean;
  handleLike: () => Promise<void> | void;
  restartAnimation?: boolean;
}

export function useMediaDoubleClick({
  liked,
  isLiking,
  handleLike,
  restartAnimation = false,
}: UseMediaDoubleClickOptions) {
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartAnimationKey, setHeartAnimationKey] = useState(0);

  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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

  useEffect(() => {
    return () => {
      if (heartTimerRef.current) {
        clearTimeout(heartTimerRef.current);
      }
    };
  }, []);

  return {
    showHeartAnimation,
    heartAnimationKey,
    handleDoubleClick,
  };
}