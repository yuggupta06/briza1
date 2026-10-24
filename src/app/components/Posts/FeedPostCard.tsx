
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
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
import type { PostType } from "@/types/post";
import {
  FALLBACK_AVATAR,
  formatCount,
  formatDate,
} from "@/backend/lib/post-card-utils";
import CommentsModalComponent from "./CommentsModal";


function FeedPostCard({ post,currentUserId }: { post: PostType,currentUserId:string }) {
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  const heartTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);


  
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
    handleCommentDeleted
  } = usePostInteractions({ post });

  // Show the heart on every double-click.
  // Only send a like if the post is currently unliked.
  const handleImageDoubleClick = useCallback(() => {
    setShowHeartAnimation(true);

    if (heartTimerRef.current) {
      clearTimeout(heartTimerRef.current);
    }

    heartTimerRef.current = setTimeout(() => {
      setShowHeartAnimation(false);
      heartTimerRef.current = null;
    }, 700);

    if (!liked && !isLiking) {
      void handleLike();
    }
  }, [liked, isLiking, handleLike]);

  useEffect(() => {
    return () => {
      if (heartTimerRef.current) {
        clearTimeout(heartTimerRef.current);
      }
    };
  }, []);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
    setSubmitError("");
  }, [setSubmitError]);

  const openComments = useCallback(() => {
    if (commentsOpen) return;

    setCommentsOpen(true);
    if(comments.length>0) return ;
    void fetchComments(null);
  }, [comments.length, commentsOpen, fetchComments]);

  // Lock background scrolling while the modal is open.
  // Escape closes the modal.
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

  const sharePost = useCallback(async () => {
    const url = `${window.location.origin}/post/${post._id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by @${post.author.username}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== "AbortError"
      ) {
        console.error("Error sharing post:", error);
      }
    }
  }, [post._id, post.author.username]);

  return (
    <>
      <article className="w-full min-w-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-white">
        {/* Author */}
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

        {/* Image post */}
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

        {/* Video post */}
        {post.postType === "video" && post.postUrl && (
          <div
            className="relative w-full bg-black"
            onDoubleClick={handleImageDoubleClick}
          >
            <video
              src={post.postUrl}
              controls
              playsInline
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

        {/* Text post */}
        {post.postType === "text" && post.caption && (
          <div className="whitespace-pre-wrap break-words px-5 py-8 text-base leading-7">
            {post.caption}
          </div>
        )}

        {/* Like, comment, share, save actions */}
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => void handleLike()}
              disabled={isLiking}
              aria-label={liked ? "Unlike post" : "Like post"}
              aria-pressed={liked}
              className={`flex cursor-pointer items-center gap-2 transition ${liked
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

        {/* Like error */}
        {likeError && (
          <p role="alert" className="px-4 pt-2 text-xs text-rose-400">
            {likeError}
          </p>
        )}

        {/* Caption */}
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

      {/* Comments are rendered in a separate component */}
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
        currentUserId={currentUserId}
        onCommentDeleted={handleCommentDeleted}
      />
    </>
  );
}

export default memo(FeedPostCard);
