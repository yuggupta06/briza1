
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/app/components/ui/briza-icon";
import CommentsModalComponent from "@/app/components/Comment/CommentsModal";

import { usePostInteractions } from "@/app/hooks/posts/use-post-interactions";
import { useSharePost } from "@/app/hooks/posts/use-share-post";
import { useMediaDoubleClick } from "@/app/hooks/useMediaDoubleClick";

// import { useRealtime } from "@/app/providers/RealtimeProvider";

import type { PostType } from "@/types/post";
import { Heart } from "lucide-react";

interface LoopVideoCardProps {
    post: PostType;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
    onCountsChange: (
        postId: string,
        counts: {
            isLiked: boolean;
            likesCount: number;
            commentsCount: number;
        }
    ) => void;
}

export function LoopVideoCard({
    post,
    isActive,
    isMuted,
    onToggleMute,
    onCountsChange,
}: LoopVideoCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const [commentsOpen, setCommentsOpen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
    const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // const { subscribeToPost } = useRealtime();

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
        handleNewComment,
        loadMoreComments,
        submitComment,
        handleLike,
        handleCommentDeleted,
    } = usePostInteractions({
        post,
        onCountsChange,
    });

    // Play only the active Reel unless manually paused.
    useEffect(() => {
        const video = videoRef.current;

        if (!video) return;

        if (!isActive || isPaused) {
            video.pause();
            return;
        }

        void video.play().catch(() => {
            // Browser autoplay restrictions may prevent playback.
        });
    }, [isActive, isPaused]);

    // Subscribe to new comments using the existing realtime provider.
    // useEffect(() => {
    //     const unsubscribe = subscribeToPost(
    //         post._id,
    //         "new-comment",
    //         ({ comment }) => {
    //             handleNewComment(comment);
    //         }
    //     );

    //     return () => {
    //         if (typeof unsubscribe === "function") {
    //             unsubscribe();
    //         }
    //     };
    // }, [post._id, subscribeToPost, handleNewComment]);


    const toggleSound = useCallback(() => {
        onToggleMute();
        setShowVolumeIndicator(true);

        if (volumeTimerRef.current) {
            clearTimeout(volumeTimerRef.current);
        }

        volumeTimerRef.current = setTimeout(() => {
            setShowVolumeIndicator(false);
            volumeTimerRef.current = null;
        }, 1000);
    }, [onToggleMute]);

    useEffect(() => {
        return () => {
            if (volumeTimerRef.current) {
                clearTimeout(volumeTimerRef.current);
            }
        };
    }, []);
    const {
        showHeartAnimation,
        heartAnimationKey,
        handleClick,
    } = useMediaDoubleClick({
        liked,
        isLiking,
        handleLike,
        onSingleClick: toggleSound,
    });

    const onLinkCopied = useCallback(() => {
        // Clipboard fallback is handled by useSharePost.
    }, []);

    const onShareError = useCallback(() => {
        console.error("Unable to share this Reel.");
    }, []);

    const sharePost = useSharePost({
        postId: post._id,
        username: post.author.username,
        onLinkCopied,
        onShareError,
    });

    // Dedicated pause/play button.
    const togglePause = useCallback(() => {
        setIsPaused((previous) => !previous);
    }, []);
    // dedicated toggle sound button

    const openComments = useCallback(() => {
        setCommentsOpen(true);
        void fetchComments(null);
    }, [fetchComments]);

    const closeComments = useCallback(() => {
        setCommentsOpen(false);
        setSubmitError("");
    }, [setSubmitError]);

    return (
        <div className="relative h-full w-full overflow-hidden bg-black">

            {/* Video: double-click likes; single-click does nothing. */}
            <video
                ref={videoRef}
                src={post.postUrl}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                controls={false}
                onClick={handleClick}
                className="absolute inset-0 h-full w-full object-contain"
            />
            {/* Volume indicator */}
            {showVolumeIndicator && (
                <div
                    key={isMuted ? "muted" : "unmuted"}
                    className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm animate-in fade-in zoom-in duration-150">
                        <Icon
                            name={isMuted ? "volume_off" : "volume_up"}
                            className="text-3xl"
                        />
                    </div>
                </div>
            )}
            {/* Background gradient for text visibility */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-black/20" />

            {/* Header */}
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 pt-12">
                <h1 className="text-xl font-bold tracking-tight text-white">
                    Reels
                </h1>
            </div>

            {/* Double-tap heart animation */}
            {showHeartAnimation && (
                <div
                    key={heartAnimationKey}
                    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                >
                    <Heart
                        size={96}
                        strokeWidth={1.5}
                        className="animate-ping fill-red-500 text-red-500 drop-shadow-lg"
                    />
                </div>
            )}

            {/* Creator information and caption */}
            <div className="absolute bottom-24 left-4 right-20 z-10 space-y-3">
                <div className="flex items-center gap-3">
                    <img
                        src={post.author.imageUrl || "/default-avatar.png"}
                        alt={`@${post.author.username}`}
                        className="h-10 w-10 rounded-full border border-white/70 object-cover"
                    />

                    <span className="text-sm font-semibold text-white">
                        @{post.author.username}
                    </span>
                </div>

                {post.caption && (
                    <p className="line-clamp-3 text-sm leading-5 text-white">
                        {post.caption}
                    </p>
                )}
            </div>

            {/* Right-side actions */}
            <div className="absolute bottom-28 right-3 z-30 flex flex-col items-center gap-6">

                {/* Pause / Play */}
                <button
                    type="button"
                    onClick={togglePause}
                    aria-label={isPaused ? "Play Reel" : "Pause Reel"}
                    className="flex flex-col items-center gap-1 text-white"
                >
                    <Icon
                        name={isPaused ? "play_arrow" : "pause"}
                        className="text-3xl"
                    />
                    <span className="text-xs font-medium">
                        {isPaused ? "Play" : "Pause"}
                    </span>
                </button>

                {/* Like */}
                <button
                    type="button"
                    onClick={() => void handleLike()}
                    disabled={isLiking}
                    aria-label={liked ? "Unlike Reel" : "Like Reel"}
                    className="flex flex-col items-center gap-1 text-white disabled:opacity-60"
                >
                    <Icon
                        name="favorite"
                        filled={liked}
                        className={`text-3xl ${liked ? "text-red-500" : "text-white"
                            }`}
                    />

                    <span className="text-xs font-medium">
                        {likeCount}
                    </span>
                </button>

                {/* Comments */}
                <button
                    type="button"
                    onClick={openComments}
                    aria-label="Open comments"
                    className="flex flex-col items-center gap-1 text-white"
                >
                    <Icon
                        name="chat_bubble"
                        className="text-3xl"
                    />

                    <span className="text-xs font-medium">
                        {commentCount}
                    </span>
                </button>

                {/* Share */}
                <button
                    type="button"
                    onClick={() => void sharePost()}
                    aria-label="Share Reel"
                    className="flex flex-col items-center gap-1 text-white"
                >
                    <Icon
                        name="share"
                        className="text-3xl"
                    />

                    <span className="text-xs font-medium">
                        Share
                    </span>
                </button>
            </div>

            {/* Like error */}
            {likeError && (
                <p className="absolute bottom-20 left-4 z-20 text-xs text-red-300">
                    {likeError}
                </p>
            )}

            {/* Existing comments modal - unchanged */}
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
        </div>
    );
}
