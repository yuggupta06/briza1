
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";

import { notoSerif } from "@/app/fonts";
import { PostType } from "@/types/post";
import { handleShare } from "@/backend/lib/share";

type PostCardProps = {
  Post: PostType;
  index: number;
  likeAnimationIndex: number;
};

export default function PostCard({
  Post,
  index,
  likeAnimationIndex,
}: PostCardProps) {
  const { author } = Post;

  return (
    <article
      className="feed-surface w-full overflow-hidden rounded-xl border border-white/10"
      key={`${Post._id}-${index}`}
    >
      <header className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <Link prefetch href={`/search/${author.username}`} className="shrink-0">
          <Image
            priority
            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15"
            src={author.imageUrl}
            alt={`${author.username} profile`}
            width={40}
            height={40}
          />
        </Link>
        <Link
          prefetch
          href={`/search/${author.username}`}
          className={`${notoSerif.className} min-w-0 flex-1 truncate text-sm text-white transition-colors hover:text-[#78e6c8] md:text-base`}
        >
          {author.username}
        </Link>
        <MoreHorizontal
          role="img"
          aria-label="More options"
          className="h-5 w-5 shrink-0 text-white/55"
        />
      </header>

      <motion.div
        layoutId={`image-${index}`}
        className="relative h-[min(78vh,620px)] min-h-[300px] w-full cursor-pointer border-b border-white/10 bg-[#1a1a1a]"
      >
        {Post.postType === "image" ? (
          <Image
            priority
            src={Post.postUrl}
            alt={`Post by ${author.username}`}
            fill
            sizes="(max-width: 768px) 100vw, 760px"
            className="object-contain"
          />
        ) : (
          <video
            onMouseEnter={(e) => {
              void e.currentTarget.play();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
            }}
            src={Post.postUrl}
            muted
            controls
            className="h-full w-full cursor-grab object-contain"
          />
        )}

        {index === likeAnimationIndex && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart className="h-16 w-16 fill-red-500 text-red-500 fade-in-out" />
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-4 px-4 pt-3 pb-1">
        <div className="text-white/80" aria-hidden="true">
          <Heart aria-hidden="true" className="h-5 w-5 transition-colors hover:text-[#78e6c8]" />
        </div>
        <div className="flex items-center gap-2 text-white/80" role="img" aria-label="Comments">
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
        </div>
        <button
          type="button"
          aria-label="Share post"
          onClick={() => handleShare()}
          className="text-white/80 transition-colors hover:text-[#78e6c8]"
        >
          <Share2 aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-2 pb-4">
        <p className="text-sm font-semibold text-white">
          {Post.likes.toLocaleString("en-US")} likes
        </p>
      </div>
    </article>
  );
}
