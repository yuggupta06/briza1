
"use client";

import Image from "next/image";
import {
  FileText,
  Check,
  CheckCheck,
  Play,
  Reply,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";

import type {
  MessagingMessage,
  MessagingReplyMessage,
} from "@/types/messaging-ui";

interface MessageBubbleProps {
  message: MessagingMessage;
  currentUserId: string;
  isSeen?: boolean;
  onReply: () => void;
}

interface VideoMessageProps {
  url: string;
}

const MAX_SWIPE_DISTANCE = 76;
const REPLY_THRESHOLD = 55;
const SWIPE_DIRECTION_THRESHOLD = 8;

function VideoMessage({ url }: VideoMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen =
        document.fullscreenElement === containerRef.current;

      setShowControls(isFullscreen);

      if (!isFullscreen) {
        videoRef.current?.pause();
        setIsPlaying(false);
      }
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const handlePlay = async () => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;

    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
        await video.play();
        setIsPlaying(true);
      } else if (
        "webkitEnterFullscreen" in video &&
        typeof (
          video as HTMLVideoElement & {
            webkitEnterFullscreen?: () => void;
          }
        ).webkitEnterFullscreen === "function"
      ) {
        (
          video as HTMLVideoElement & {
            webkitEnterFullscreen: () => void;
          }
        ).webkitEnterFullscreen();

        await video.play();
        setShowControls(true);
        setIsPlaying(true);
      } else {
        setShowControls(true);
        await video.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Unable to play video:", error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg bg-black
        [&:fullscreen]:flex
        [&:fullscreen]:h-screen
        [&:fullscreen]:w-screen
        [&:fullscreen]:items-center
        [&:fullscreen]:justify-center
        [&:fullscreen]:rounded-none"
    >
      <video
        ref={videoRef}
        src={url}
        controls={showControls}
        playsInline
        preload="metadata"
        className="max-h-72 w-full object-contain
          [&:fullscreen]:max-h-full
          [&:fullscreen]:h-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {!showControls && !isPlaying && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm">
            <Play size={27} fill="white" />
          </span>
        </button>
      )}
    </div>
  );
}

function getSenderName(
  senderId: MessagingReplyMessage["senderId"],
  currentUserId: string
) {
  if (typeof senderId === "string") {
    return senderId === currentUserId ? "You" : "Message";
  }

  return senderId._id === currentUserId
    ? "You"
    : senderId.username;
}

function getReplyPreview(message: MessagingReplyMessage) {
  if (message.content) {
    return message.content;
  }

  if (message.messageType === "image") {
    return "Photo";
  }

  if (message.messageType === "video") {
    return "Video";
  }

  if (message.messageType === "file") {
    return message.attachments[0]?.name ?? "File";
  }

  return "Message";
}

export default function MessageBubble({
  message,
  currentUserId,
  isSeen = false,
  onReply,
}: MessageBubbleProps) {
  const touchStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const swipeDirectionRef = useRef<
    "horizontal" | "vertical" | null
  >(null);

  const [slideDistance, setSlideDistance] = useState(0);

  const senderId =
    typeof message.senderId === "string"
      ? message.senderId
      : message.senderId._id.toString();

  const isOwnMessage = senderId === currentUserId;
  const hasAttachments = message.attachments.length > 0;

  const replyMessage =
    message.replyTo &&
    typeof message.replyTo !== "string"
      ? message.replyTo
      : null;

  const formattedTime = new Date(message.createdAt).toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );

  // Start tracking the swipe.
  const handleTouchStart = (
    event: TouchEvent<HTMLDivElement>
  ) => {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    swipeDirectionRef.current = null;
  };

  // Move the message along with the finger.
  const handleTouchMove = (
    event: TouchEvent<HTMLDivElement>
  ) => {
    const start = touchStartRef.current;

    if (!start || event.touches.length !== 1) return;

    const touch = event.touches[0];

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    // Determine whether the gesture is horizontal or vertical.
    if (!swipeDirectionRef.current) {
      if (
        Math.abs(deltaX) < SWIPE_DIRECTION_THRESHOLD &&
        Math.abs(deltaY) < SWIPE_DIRECTION_THRESHOLD
      ) {
        return;
      }

      swipeDirectionRef.current =
        Math.abs(deltaY) > Math.abs(deltaX)
          ? "vertical"
          : "horizontal";
    }

    // Leave normal vertical scrolling untouched.
    if (swipeDirectionRef.current === "vertical") {
      return;
    }

    // Only allow rightward movement.
    const distance = Math.max(
      0,
      Math.min(deltaX, MAX_SWIPE_DISTANCE)
    );

    setSlideDistance(distance);
  };

  // Release the message and trigger reply if threshold is reached.
  const handleTouchEnd = () => {
    const shouldReply = slideDistance >= REPLY_THRESHOLD;

    touchStartRef.current = null;
    swipeDirectionRef.current = null;

    // Reset the position. CSS transition handles the animation.
    setSlideDistance(0);

    if (shouldReply) {
      onReply();
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    swipeDirectionRef.current = null;
    setSlideDistance(0);
  };

  const replyIconOpacity = Math.min(
    slideDistance / REPLY_THRESHOLD,
    1
  );

  return (
    <div
      data-message-sequence={message.sequence}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={`flex w-full touch-pan-y ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      <div className="relative max-w-[78%] sm:max-w-[65%]">

        {/* Mobile swipe reply indicator */}
        <div
          className="pointer-events-none absolute -left-9 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-opacity duration-100 sm:hidden"
          style={{
            opacity: replyIconOpacity,
            transform: `translateY(-50%) scale(${
              0.75 + replyIconOpacity * 0.25
            })`,
          }}
        >
          <Reply size={15} />
        </div>

        {/* Message bubble */}
        <div
          style={{
            transform: `translateX(${slideDistance}px)`,
            transition:
              slideDistance > 0
                ? "none"
                : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          className={`group relative rounded-2xl px-3 py-2 shadow-sm ${
            isOwnMessage
              ? "rounded-br-sm bg-[#818df8]/40 text-white"
              : "rounded-bl-sm bg-surface-container text-on-surface"
          }`}
        >
          {/* Laptop reply action */}
          <button
            type="button"
            onClick={onReply}
            aria-label="Reply to message"
            title="Reply"
            className="absolute -top-3 right-2 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-outline-variant bg-surface text-on-surface shadow-sm opacity-0 transition-opacity hover:bg-surface-container group-hover:opacity-100 sm:flex"
          >
            <Reply size={14} />
          </button>

          {/* Quoted original message */}
          {replyMessage && (
            <div className="mb-2 overflow-hidden rounded-lg border-l-[3px] border-primary bg-black/10 px-2.5 py-2 dark:bg-white/10">
              <p className="truncate text-xs font-semibold">
                {getSenderName(
                  replyMessage.senderId,
                  currentUserId
                )}
              </p>

              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap wrap-break-word text-xs opacity-80">
                {getReplyPreview(replyMessage)}
              </p>
            </div>
          )}

          {/* Text content */}
          {message.content && (
            <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
              {message.content}
            </p>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="mt-1 flex flex-col gap-2">
              {message.attachments.map((attachment, index) => {
                if (attachment.mediaType === "image") {
                  return (
                    <a
                      key={`${message._id}-${index}`}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg"
                    >
                      <Image
                        src={attachment.url}
                        alt={attachment.name ?? "Shared image"}
                        width={320}
                        height={320}
                        unoptimized
                        className="max-h-72 w-full rounded-lg object-cover"
                      />
                    </a>
                  );
                }

                if (attachment.mediaType === "video") {
                  return (
                    <VideoMessage
                      key={`${message._id}-${index}`}
                      url={attachment.url}
                    />
                  );
                }

                return (
                  <a
                    key={`${message._id}-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-black/5 p-3 text-sm underline dark:bg-white/5"
                  >
                    <FileText size={20} />

                    <span className="max-w-48 truncate">
                      {attachment.name ?? "Download file"}
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          {/* Timestamp and read receipt */}
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              isOwnMessage
                ? "text-white/70"
                : "text-on-surface-variant"
            }`}
          >
            <span>{formattedTime}</span>

            {isOwnMessage &&
              (isSeen ? (
                <CheckCheck
                  size={15}
                  className="text-[#38BDF8] dark:text-[#0EA5E9]"
                  aria-label="Seen"
                />
              ) : (
                <Check
                  size={14}
                  className="text-white/70"
                  aria-label="Sent"
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
