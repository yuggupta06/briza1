
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
} from "lucide-react";

import { usePostInteractions } from "@/app/hooks/use-post-interactions";
import { useMediaDoubleClick } from "@/app/hooks/useMediaDoubleClick";
import { useSharePost } from "@/app/hooks/use-share-post";
import { usePauseVideoWhenOutOfView } from "@/app/hooks/usePauseVideoWhenOutOfView";

import type { PostType } from "@/types/post";
import CommentsModalComponent from "./CommentsModal";

import {
  FALLBACK_AVATAR,
  formatCount,
  formatDate,
} from "@/backend/lib/post-card-utils";



function FeedPostCard({ post }: { post: PostType }) {
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // custom hooks 
  const {
    liked,
    likeCount,
    commentCount,
    comments,
    commentText,
    commentsLoading,
    isLoadingMore,
    isSubmittingComment,
    isLiking,
    hasMoreComments,
    commentsError,
    likeError,
    submitError,
    setCommentText,
    setSubmitError,
    fetchComments,
    loadMoreComments,
    submitComment,
    handleLike,
    handleCommentDeleted,
  } = usePostInteractions({ post });

  const {
    showHeartAnimation,
    handleDoubleClick: handleImageDoubleClick,
  } = useMediaDoubleClick({
    liked,
    isLiking,
    handleLike,
  });
  const sharePost = useSharePost({
  postId: post._id,
  username: post.author.username,
  });

  const videoRef = usePauseVideoWhenOutOfView(post.postUrl); 

    // Open and close
  const openComments = useCallback(() => {
    if (commentsOpen) return;

    setCommentsOpen(true);

    if (comments.length === 0) {
      void fetchComments(null);
    }
  }, [commentsOpen, comments.length, fetchComments]);
  const closeComments = useCallback(() => {
    setCommentsOpen(false);
    setSubmitError("");
  }, [setSubmitError]);

  

  // Lock background scrolling while comments are open.
  useEffect(() => {
    if (!commentsOpen) return;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeComments();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [commentsOpen, closeComments]);



  return (
    <>
      <article className="w-full min-w-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href={`/profile/${post.author.username}`}
            className="flex min-w-0 cursor-pointer items-center gap-3"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-800">
              <Image
                src={post.author.imageUrl || FALLBACK_AVATAR}
                alt={`${post.author.username}'s avatar`}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {post.author.username}
              </p>

              {post.createdAt && (
                <p className="text-xs text-neutral-500">
                  {formatDate(post.createdAt)}
                </p>
              )}
            </div>
          </Link>

          <button
            type="button"
            aria-label="More post options"
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        {post.postType === "image" && post.postUrl && (
          <div
            className="relative aspect-square w-full select-none bg-neutral-900 md:aspect-[5/4] lg:aspect-[4/3]"
            onDoubleClick={handleImageDoubleClick}
          >
            <Image
              src={post.postUrl}
              alt={post.caption || "Post image"}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 620px, 680px"
              className="object-cover"
              unoptimized
            />

            {showHeartAnimation && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Heart
                  size={96}
                  strokeWidth={1.5}
                  className="animate-ping fill-red-500 text-red-500 drop-shadow-lg"
                />
              </div>
            )}
          </div>
        )}

        {post.postType === "video" && post.postUrl && (
          <div
            className="relative w-full bg-black"
            onDoubleClick={handleImageDoubleClick}
          >
            <video
            ref={videoRef}
              src={post.postUrl}
              controls
              playsInline
              muted
              className="max-h-[650px] w-full object-contain md:max-h-[420px] lg:max-h-[480px]"
            >
              Your browser does not support video playback.
            </video>

            {showHeartAnimation && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Heart
                  size={96}
                  strokeWidth={1.5}
                  className="animate-ping fill-red-500 text-red-500 drop-shadow-lg"
                />
              </div>
            )}
          </div>
        )}

        {post.postType === "text" && post.caption && (
          <div className="whitespace-pre-wrap break-words px-5 py-8 text-base leading-7">
            {post.caption}
          </div>
        )}

        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => void handleLike()}
              disabled={isLiking}
              aria-label={liked ? "Unlike post" : "Like post"}
              aria-pressed={liked}
              className={`flex cursor-pointer items-center gap-2 transition ${
                liked
                  ? "text-rose-500"
                  : "text-neutral-300 hover:text-rose-500"
              } disabled:cursor-wait disabled:opacity-70`}
            >
              <Heart
                size={23}
                fill={liked ? "currentColor" : "none"}
              />

              <span className="text-sm font-medium">
                {formatCount(likeCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={openComments}
              aria-label={`View ${commentCount} comments`}
              className="flex cursor-pointer items-center gap-2 text-neutral-300 transition hover:text-white"
            >
              <MessageCircle size={23} />

              <span className="text-sm font-medium">
                {formatCount(commentCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void sharePost()}
              aria-label="Share post"
              className="cursor-pointer text-neutral-300 transition hover:text-white"
            >
              <Share2 size={22} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSaved((value) => !value)}
            aria-label={saved ? "Unsave post" : "Save post"}
            aria-pressed={saved}
            className="cursor-pointer text-neutral-300 transition hover:text-white"
          >
            <Bookmark
              size={22}
              fill={saved ? "currentColor" : "none"}
            />
          </button>
        </div>

        {likeError && (
          <p role="alert" className="px-4 pt-2 text-xs text-rose-400">
            {likeError}
          </p>
        )}

        {post.caption?.trim() && (
          <div className="px-4 pb-4 pt-3 text-sm leading-6">
            <Link
              href={`/profile/${post.author.username}`}
              className="mr-2 font-semibold text-white hover:text-neutral-300"
            >
              {post.author.username}
            </Link>

            <span className="whitespace-pre-wrap break-words text-neutral-200">
              {post.caption}
            </span>
          </div>
        )}
      </article>

      <CommentsModalComponent
        postId={post._id}
        open={commentsOpen}
        onClose={closeComments}
        commentCount={commentCount}
        comments={comments}
        commentText={commentText}
        setCommentText={setCommentText}
        commentsLoading={commentsLoading}
        isLoadingMore={isLoadingMore}
        isSubmittingComment={isSubmittingComment}
        hasMoreComments={hasMoreComments}
        commentsError={commentsError || ""}
        submitError={submitError || ""}
        setSubmitError={setSubmitError}
        fetchComments={fetchComments}
        loadMoreComments={loadMoreComments}
        submitComment={submitComment}
        onCommentDeleted={handleCommentDeleted}
      />
    </>
  );
}

export default memo(FeedPostCard);
