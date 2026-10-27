
"use client";

import { useEffect, useRef } from "react";

export function usePauseVideoWhenOutOfView(videoKey: string) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Play when at least 50% of the video is visible.
          void video.play().catch(() => {
            // Browser may block autoplay.
          });
        } else {
          // Pause when the video scrolls out of view.
          video.pause();
        }
      },
      {
        threshold: [0, 0.5],
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [videoKey]);

  return videoRef;
}
