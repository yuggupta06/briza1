
"use client";

import Image from "next/image";
import { FileText, Check, CheckCheck } from "lucide-react";

import type { MessagingMessage } from "@/types/messaging-ui";

interface MessageBubbleProps {
  message: MessagingMessage;
  currentUserId: string;
  isSeen?: boolean;
}

export default function MessageBubble({
  message,
  currentUserId,
  isSeen = false,
}: MessageBubbleProps) {
  const senderId =
    typeof message.senderId === "string"
      ? message.senderId
      : message.senderId._id.toString();

  const isOwnMessage = senderId === currentUserId;

  const hasAttachments = message.attachments.length > 0;

  const formattedTime = new Date(message.createdAt).toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );

  return (
    <div
      data-message-sequence={message.sequence}
      className={`flex w-full ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[65%] ${
          isOwnMessage
            ? "rounded-br-sm bg-[#818df8]/40 text-white"
            : "rounded-bl-sm bg-surface-container text-on-surface"
        }`}
      >
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
                  <video
                    key={`${message._id}-${index}`}
                    controls
                    preload="metadata"
                    className="max-h-72 max-w-full rounded-lg"
                  >
                    <source src={attachment.url} />
                    Your browser does not support video playback.
                  </video>
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

          {isOwnMessage && (
            isSeen ? (
              <CheckCheck
                size={15}
                className="text-[#38BDF8] dark:text-[#0EA5E9] "
                aria-label="Seen"
              />
            ) : (
              <Check
                size={14}
                className="text-white/70"
                aria-label="Sent"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
