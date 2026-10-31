
"use client";

import { useEffect, useRef } from "react";
import { useVideoPlayback } from "@/app/context/VideoPlaybackContext";

export function usePauseVideoWhenOutOfView(videoKey: string) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    registerVideo,
    unregisterVideo,
    playVideo,
  } = useVideoPlayback();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    registerVideo(videoKey, video);

    const handlePlay = () => {
      playVideo(videoKey);
    };

    video.addEventListener("play", handlePlay);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.5
        ) {
          void video.play().catch(() => {
            // Browser may block autoplay.
          });
        } else {
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
      video.removeEventListener("play", handlePlay);
      unregisterVideo(videoKey);
      video.pause();
    };
  }, [
    videoKey,
    registerVideo,
    unregisterVideo,
    playVideo,
  ]);

  return videoRef;
}
