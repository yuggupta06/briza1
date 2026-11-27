
"use client";

import Image from "next/image";
import {
  FileText,
  Check,
  CheckCheck,
  Play,
  Reply,
  ListChecks,
  MoreVertical,
} from "lucide-react";
import {
  memo,
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
  onReply: (message: MessagingMessage) => void;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: (messageId: string) => void;
  onStartSelection: (messageId: string) => void;

  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
}

interface VideoMessageProps {
  url: string;
}

const MAX_SWIPE_DISTANCE = 76;
const REPLY_THRESHOLD = 55;
const SWIPE_DIRECTION_THRESHOLD = 12;
const LONG_PRESS_MOVE_THRESHOLD = 15;
const LONG_PRESS_DURATION = 600;

const VideoMessage = memo(function VideoMessage({
  url,
}: VideoMessageProps) {
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

    document.addEventListener("fullscreenchange", handleFullscreenChange);

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
});

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

function MessageBubble({
  message,
  currentUserId,
  isSeen = false,
  onReply,
  isSelected,
  isSelectionMode,
  onToggleSelection,
  onStartSelection,
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
}: MessageBubbleProps) {
  const touchStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const swipeDirectionRef = useRef<
    "horizontal" | "vertical" | null
  >(null);

  const longPressTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const longPressTriggeredRef = useRef(false);

  const [slideDistance, setSlideDistance] = useState(0);

  const senderId =
    typeof message.senderId === "string"
      ? message.senderId
      : message.senderId._id.toString();

  const isOwnMessage = senderId === currentUserId;
  const hasAttachments = message.attachments.length > 0;

  const hasReply = Boolean(message.replyTo);

  const replyMessage =
    message.replyTo &&
      typeof message.replyTo !== "string"
      ? message.replyTo
      : null;

  const isReplyUnavailable = hasReply && !replyMessage;

  const formattedTime = new Date(message.createdAt).toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      event.preventDefault();
      return;
    }

    if (isSelectionMode) {
      event.preventDefault();
      event.stopPropagation();
      onToggleSelection(message._id);
    }
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    onMenuToggle();
  };

  const handleMenuReply = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    onMenuClose();
    onReply(message);
  };

  const handleMenuDelete = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    onMenuClose();
    onStartSelection(message._id);
  };

  const handleTouchStart = (
    event: TouchEvent<HTMLDivElement>
  ) => {
    if (event.touches.length !== 1 || isSelectionMode) return;

    const touch = event.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    swipeDirectionRef.current = null;
    longPressTriggeredRef.current = false;

    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setSlideDistance(0);
      onStartSelection(message._id);
    }, LONG_PRESS_DURATION);
  };

  const handleTouchMove = (
    event: TouchEvent<HTMLDivElement>
  ) => {
    const start = touchStartRef.current;

    if (!start || event.touches.length !== 1) return;

    const touch = event.touches[0];

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (
      Math.abs(deltaX) > LONG_PRESS_MOVE_THRESHOLD ||
      Math.abs(deltaY) > LONG_PRESS_MOVE_THRESHOLD
    ) {
      clearLongPressTimer();
    }

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

    if (swipeDirectionRef.current === "vertical") {
      return;
    }

    const distance = Math.max(
      0,
      Math.min(deltaX, MAX_SWIPE_DISTANCE)
    );

    setSlideDistance(distance);
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();

    const wasLongPress = longPressTriggeredRef.current;
    const shouldReply =
      !isSelectionMode &&
      !wasLongPress &&
      slideDistance >= REPLY_THRESHOLD;

    touchStartRef.current = null;
    swipeDirectionRef.current = null;

    setSlideDistance(0);

    if (shouldReply) {
      onReply(message);
    }
  };

  const handleTouchCancel = () => {
    clearLongPressTimer();

    touchStartRef.current = null;
    swipeDirectionRef.current = null;
    setSlideDistance(0);
  };

  const replyIconOpacity = Math.min(
    slideDistance / REPLY_THRESHOLD,
    1
  );

  const handleContextMenu = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
  };

  return (
    <div
      data-message-sequence={message.sequence}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      className={`flex w-full touch-pan-y ${isOwnMessage ? "justify-end" : "justify-start"
        }`}
    >
      <div className="relative max-w-[78%] sm:max-w-[65%]">
        <div
          className="pointer-events-none absolute -left-9 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-opacity duration-100 sm:hidden"
          style={{
            opacity: replyIconOpacity,
            transform: `translateY(-50%) scale(${0.75 + replyIconOpacity * 0.25
              })`,
          }}
        >
          <Reply size={15} />
        </div>

        <div
          style={{
            transform: `translateX(${slideDistance}px)`,
            transition:
              slideDistance > 0
                ? "none"
                : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          className={`group relative rounded-2xl px-3 py-2 shadow-sm transition-all ${isOwnMessage
              ? "rounded-br-sm bg-[#818df8]/40 text-white"
              : "rounded-bl-sm bg-surface-container text-on-surface"
            } ${isSelected
              ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
              : ""
            } ${isSelectionMode ? "cursor-pointer" : ""
            }`}
        >
          {!isSelectionMode && (
            <div
              className={`absolute top-1/2 z-20 hidden -translate-y-1/2 sm:block ${isOwnMessage ? "-left-9" : "-right-9"
                }`}
            >
              <button
                type="button"
                onClick={handleMenuClick}
                aria-label="Message options"
                title="Message options"
                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-surface text-on-surface transition-opacity hover:bg-surface-container ${isMenuOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              >
                <MoreVertical size={16} />
              </button>

              {isMenuOpen && (
                <div
                  className={`absolute top-0 z-30 w-32 overflow-hidden rounded-lg border border-outline-variant bg-surface py-1 shadow-lg ${
  isOwnMessage
    ? "right-full mr-2"
    : "left-full ml-2"
}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handleMenuReply}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container"
                  >
                    <Reply size={15} />
                    Reply
                  </button>

                  <button
                    type="button"
                    onClick={handleMenuDelete}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error transition-colors hover:bg-surface-container"
                  >
                    <ListChecks size={15} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {hasReply && (
            <div className="mb-2 overflow-hidden rounded-lg border-l-[3px] border-primary bg-black/10 px-2.5 py-2 dark:bg-white/10">
              {replyMessage ? (
                <>
                  <p className="truncate text-xs font-semibold">
                    {getSenderName(
                      replyMessage.senderId,
                      currentUserId
                    )}
                  </p>

                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap wrap-break-word text-xs opacity-80">
                    {getReplyPreview(replyMessage)}
                  </p>
                </>
              ) : (
                <p className="text-xs italic opacity-60">
                  {isReplyUnavailable
                    ? "Not available"
                    : "Message unavailable"}
                </p>
              )}
            </div>
          )}

          {message.content && (
            <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
              {message.content}
            </p>
          )}

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

          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isOwnMessage
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

export default memo(MessageBubble);
