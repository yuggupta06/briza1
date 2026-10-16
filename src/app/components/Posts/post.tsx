
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
    <article className="feed-surface w-full md:w-[min(720px,86vw)] rounded-none md:rounded-3xl overflow-hidden"
      key={`${Post._id}-${index}`}
    >
        <div className="flex items-center gap-x-3 px-5 py-4 bg-white/[0.02]">
        <Link
          prefetch
          href={`/search/${author.username}`}
        >
          <Image
            priority
            className="rounded-full md:w-[50px]"
            src={author.imageUrl}
            alt="Profile"
            width={30}
            height={30}
          />
        </Link>

        <Link
          prefetch
          href={`/search/${author.username}`}
        >
          <p
            className={`${notoSerif.className} text-white text-sm md:text-lg`}
          >
            {author.username}
          </p>
        </Link>
      </div>

      <motion.div
        layoutId={`image-${index}`}
        className="relative h-[300px] md:h-[400px] lg:h-[500px] xl:h-[450px] border-y-2 border-gray-700 cursor-pointer"
      >
        {Post.postType == "image" ? (
          <Image
            priority
            src={Post.postUrl}
            alt={`Image ${index}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw"
            className="object-contain rounded-lg"
          // onDoubleClick={() =>
          //     singleCLick({
          //         user,
          //         post,
          //         index,
          //         userWithImages,
          //         setLikedPostNumber,
          //         setUserWithImages,
          //         currentUserId: currentUserId!,
          //         showLike: isLiked,
          //     })
          // }
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
            className="object-contain w-full h-full rounded-lg cursor-grab"
          />
        )}

        {index === likeAnimationIndex && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-16 h-16 text-red-500 fill-red-500 fade-in-out" />
          </div>
        )}
      </motion.div>

      <div className="flex items-center space-x-2 pl-4 py-4 md:*:w-7 md:*:h-7 lg:*:w-5 lg:*:h-5 md:py-4 *:cursor-pointer">
        <Heart
        // onClick={() =>
        //     singleCLick({
        //         user,
        //         post,
        //         index,
        //         userWithImages,
        //         setLikedPostNumber,
        //         setUserWithImages,
        //         currentUserId: currentUserId!,
        //         showLike: isLiked,
        //     })
        // }
        // className={`transition-colors duration-300 ${
        //     isLiked
        //         ? "fill-red-500 text-red-500"
        //         : "text-white"
        // }`}
        />

        <p className="text-white">
          {Post.likes}
        </p>

        <MessageCircle
        // onClick={() => {
        //     getAllUsersWithComments({
        //         user,
        //         post,
        //         index,
        //         setShow,
        //         setActiveImage,
        //         setCommentArray,
        //     } as any);
        // }}
        />

        <Share2 onClick={() => handleShare()} />
      </div>
    </article>

  );
}
