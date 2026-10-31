"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
} from "react";

type VideoPlaybackContextType = {
  registerVideo: (id: string, video: HTMLVideoElement) => void;
  unregisterVideo: (id: string) => void;
  playVideo: (id: string) => void;
};

const VideoPlaybackContext =
  createContext<VideoPlaybackContextType | null>(null);

export function VideoPlaybackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const videosRef = useRef(new Map<string, HTMLVideoElement>());
  const activeVideoRef = useRef<string | null>(null);

  const registerVideo = useCallback(
    (id: string, video: HTMLVideoElement) => {
      videosRef.current.set(id, video);
    },
    []
  );

  const unregisterVideo = useCallback((id: string) => {
    videosRef.current.delete(id);

    if (activeVideoRef.current === id) {
      activeVideoRef.current = null;
    }
  }, []);

  const playVideo = useCallback((id: string) => {
    const activeId = activeVideoRef.current;

    if (activeId && activeId !== id) {
      videosRef.current.get(activeId)?.pause();
    }

    activeVideoRef.current = id;
  }, []);

  return (
    <VideoPlaybackContext.Provider
      value={{ registerVideo, unregisterVideo, playVideo }}
    >
      {children}
    </VideoPlaybackContext.Provider>
  );
}

export function useVideoPlayback() {
  const context = useContext(VideoPlaybackContext);

  if (!context) {
    throw new Error(
      "useVideoPlayback must be used inside VideoPlaybackProvider"
    );
  }

  return context;
}