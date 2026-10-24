
"use client";

import { memo, useCallback } from "react";
import Image from "next/image";
import { Heart, MessageCircle } from "lucide-react";

import type { PostType } from "@/types/post";
import { formatCount } from "@/backend/lib/post-card-utils";

interface Props {
  post:PostType;
  onOpenPost?: (post:PostType) => void;
  
}

function ProfilePostThumbnailComponent({
  post,
  onOpenPost,
}: Props) {
  const handleOpen = useCallback(() => {
    onOpenPost?.(post);
  }, [onOpenPost, post]);

  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label={`Open post by @${post.author.username}`}
      className="group relative block aspect-square w-full min-w-0 overflow-hidden bg-neutral-900 text-left"
    >
      {post.postType === "image" && post.postUrl ? (
        <Image
          src={post.postUrl}
          alt={post.caption || "Post image"}
          fill
          sizes="(max-width: 640px) 33vw, 240px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
      ) : post.postType === "video" && post.postUrl ? (
        <video
          src={post.postUrl}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center overflow-hidden p-3 sm:p-5">
          <p className="line-clamp-6 whitespace-pre-wrap break-words text-xs text-white sm:text-sm">
            {post.caption || "Text post"}
          </p>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/50 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Heart size={20} fill="currentColor" />
          {formatCount(post.likesCount)}
        </span>

        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageCircle size={20} fill="currentColor" />
          {formatCount(post.commentsCount)}
        </span>
      </div>

      <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white sm:hidden">
        <Heart size={13} />
        {formatCount(post.likesCount)}
        <MessageCircle size={13} />
        {formatCount(post.commentsCount)}
      </div>
    </button>
  );
}

const ProfilePostThumbnail = memo(
  ProfilePostThumbnailComponent
);

export default ProfilePostThumbnail;
