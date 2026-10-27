
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import type { CommentWithAuthor } from "@/types/comment";

export interface InteractionPost {
  _id: string;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
}

interface CommentsResponse {
  success: boolean;
  message?: string;
  comments: unknown[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface CreateCommentResponse {
  success: boolean;
  message?: string;
  comment: unknown;
}

interface LikeResponse {
  success: boolean;
  message?: string;
  isLiked: boolean;
  likesCount: number;
}

function normalizeComment(value: unknown): CommentWithAuthor {
  const comment = value as Record<string, unknown>;
  const author = comment.author as Record<string, unknown> | undefined;
  const replyToUser = comment.replyToUser as
    | Record<string, unknown>
    | null
    | undefined;

  return {
    _id: String(comment._id ?? ""),
    post: String(comment.post ?? ""),
    text: String(comment.text ?? ""),
    createdAt: String(comment.createdAt ?? ""),
    updatedAt: String(comment.updatedAt ?? ""),
    parentCommentId: comment.parentCommentId
      ? String(comment.parentCommentId)
      : null,
    replyToCommentId: comment.replyToCommentId
      ? String(comment.replyToCommentId)
      : null,
    replyToUserId: comment.replyToUserId
      ? String(
          typeof comment.replyToUserId === "object"
            ? (comment.replyToUserId as Record<string, unknown>)._id ?? ""
            : comment.replyToUserId
        )
      : null,
    repliesCount: Number(comment.repliesCount ?? 0),
    author: {
      _id: String(author?._id ?? ""),
      username: String(author?.username ?? "user"),
      imageUrl: String(author?.imageUrl ?? ""),
    },
    replyToUser:
      replyToUser && replyToUser._id
        ? {
            _id: String(replyToUser._id),
            username: String(replyToUser.username ?? "user"),
          }
        : null,
  };
}

interface UsePostInteractionsOptions {
  post: InteractionPost | null;
  onCountsChange?: (
    postId: string,
    counts: {
      isLiked: boolean;
      likesCount: number;
      commentsCount: number;
    }
  ) => void;
}

export function usePostInteractions({
  post,
  onCountsChange,
}: UsePostInteractionsOptions) {
  const [liked, setLiked] = useState(post?.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post?.likesCount ?? 0);
  const [commentCount, setCommentCount] = useState(
    post?.commentsCount ?? 0
  );

  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState("");
  const [likeError, setLikeError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const postIdRef = useRef(post?._id);
  const likingRef = useRef(false);
  const fetchingRef = useRef(false);
  const submittingRef = useRef(false);
  const likedRef = useRef(post?.isLiked ?? false);
  const likeCountRef = useRef(post?.likesCount ?? 0);
  const commentCountRef = useRef(post?.commentsCount ?? 0);

  const publishCounts = useCallback(
    (
      nextLiked: boolean,
      nextLikes: number,
      nextComments: number,
      id = postIdRef.current
    ) => {
      if (!id) return;

      onCountsChange?.(id, {
        isLiked: nextLiked,
        likesCount: nextLikes,
        commentsCount: nextComments,
      });
    },
    [onCountsChange]
  );

  // Reset comment state only when the selected post changes.
  // Count updates must not clear comments or restart their loading state.
  useEffect(() => {
  postIdRef.current = post?._id;

  likedRef.current = post?.isLiked ?? false;
  likeCountRef.current = post?.likesCount ?? 0;
  commentCountRef.current = post?.commentsCount ?? 0;

  setLiked(likedRef.current);
  setLikeCount(likeCountRef.current);
  setCommentCount(commentCountRef.current);

  setComments([]);
  setCommentText("");
  setCommentsLoading(false);
  setIsLoadingMore(false);
  setCommentsError("");
  setLikeError("");
  setSubmitError("");
  setHasMoreComments(false);
  setNextCursor(null);

  fetchingRef.current = false;
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [post?._id]);
  // Sync counts from the parent without resetting comment pagination.
  useEffect(() => {
    likedRef.current = post?.isLiked ?? false;
    likeCountRef.current = post?.likesCount ?? 0;
    commentCountRef.current = post?.commentsCount ?? 0;

    setLiked(likedRef.current);
    setLikeCount(likeCountRef.current);
    setCommentCount(commentCountRef.current);
  }, [post?.isLiked, post?.likesCount, post?.commentsCount]);

  const fetchComments = useCallback(
    async (cursor: string | null = null) => {
      const id = postIdRef.current;

      if (!id || fetchingRef.current) return;

      fetchingRef.current = true;
      setCommentsError("");

      if (cursor) {
        setIsLoadingMore(true);
      } else {
        // Only show the initial loading screen if there are no comments.
        if (comments.length === 0) setCommentsLoading(true);
      }

      try {
        const { data } = await axios.post<CommentsResponse>(
          "/api/comments/fetch-comments",
          { postId: id, cursor }
        );

        if (!data.success) {
          throw new Error(data.message || "Failed to fetch comments.");
        }

        if (postIdRef.current !== id) return;

        const fetched = data.comments.map(normalizeComment);

        setComments((previous) => {
          if (!cursor) return fetched;

          const existingIds = new Set(previous.map((item) => item._id));

          return [
            ...previous,
            ...fetched.filter((item) => !existingIds.has(item._id)),
          ];
        });

        setHasMoreComments(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch (error) {
        if (postIdRef.current === id) {
          console.error("Error fetching comments:", error);
          setCommentsError("Couldn't load comments. Please try again.");
        }
      } finally {
        fetchingRef.current = false;

        if (postIdRef.current === id) {
          setCommentsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [comments.length]
  );

  const loadMoreComments = useCallback(async () => {
    if (!nextCursor || !hasMoreComments || fetchingRef.current) return;

    await fetchComments(nextCursor);
  }, [fetchComments, hasMoreComments, nextCursor]);

  const submitComment = useCallback(
    async (textOverride?: string): Promise<boolean> => {
      const id = postIdRef.current;
      const text = (textOverride ?? commentText).trim();

      if (!id || !text || submittingRef.current) return false;

      if (text.length > 500) {
        setSubmitError("Comments cannot exceed 500 characters.");
        return false;
      }

      submittingRef.current = true;
      setIsSubmittingComment(true);
      setSubmitError("");

      try {
        const { data } = await axios.post<CreateCommentResponse>(
          "/api/comments/set-comments",
          { postId: id, text }
        );

        if (!data.success || !data.comment) {
          throw new Error(data.message || "Failed to create comment.");
        }

        if (postIdRef.current !== id) return false;

        const newComment = normalizeComment(data.comment);

        setComments((previous) => [
          newComment,
          ...previous.filter((item) => item._id !== newComment._id),
        ]);

        setCommentText("");

        const nextCount = commentCountRef.current + 1;
        commentCountRef.current = nextCount;
        setCommentCount(nextCount);

        publishCounts(
          likedRef.current,
          likeCountRef.current,
          nextCount,
          id
        );

        return true;
      } catch (error) {
        console.error("Error creating comment:", error);

        setSubmitError(
          axios.isAxiosError(error)
            ? error.response?.data?.message || "Couldn't post your comment."
            : "Couldn't post your comment. Please try again."
        );

        return false;
      } finally {
        submittingRef.current = false;
        setIsSubmittingComment(false);
      }
    },
    [commentText, publishCounts]
  );

  const handleLike = useCallback(async () => {
    const id = postIdRef.current;
    if (!id || likingRef.current) return;

    likingRef.current = true;
    setIsLiking(true);
    setLikeError("");

    const previousLiked = likedRef.current;
    const previousCount = likeCountRef.current;
    const nextLiked = !previousLiked;
    const nextCount = Math.max(
      0,
      previousCount + (nextLiked ? 1 : -1)
    );

    likedRef.current = nextLiked;
    likeCountRef.current = nextCount;
    setLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const { data } = await axios.post<LikeResponse>(
        "/api/posts/set-likes",
        { postId: id, liked: nextLiked }
      );

      if (!data.success || typeof data.likesCount !== "number") {
        throw new Error(data.message || "Invalid like response.");
      }

      if (postIdRef.current !== id) return;

      likedRef.current = data.isLiked;
      likeCountRef.current = data.likesCount;

      setLiked(data.isLiked);
      setLikeCount(data.likesCount);

      publishCounts(
        data.isLiked,
        data.likesCount,
        commentCountRef.current,
        id
      );
    } catch (error) {
      console.error("Error updating like:", error);

      if (postIdRef.current === id) {
        likedRef.current = previousLiked;
        likeCountRef.current = previousCount;

        setLiked(previousLiked);
        setLikeCount(previousCount);

        setLikeError(
          axios.isAxiosError(error)
            ? error.response?.data?.message ||
                "Couldn't update your like. Please try again."
            : "Couldn't update your like. Please try again."
        );
      }
    } finally {
      likingRef.current = false;
      setIsLiking(false);
    }
  }, [publishCounts]);

  const handleCommentDeleted = useCallback(
    (commentId: string, isReply: boolean) => {
      if (isReply) return;

      setComments((previous) => {
        const exists = previous.some(
          (comment) => comment._id === commentId
        );

        if (!exists) return previous;

        const nextCount = Math.max(0, commentCount - 1);
        commentCountRef.current = nextCount;
        setCommentCount(nextCount);

        publishCounts(
          likedRef.current,
          likeCountRef.current,
          nextCount
        );

        return previous.filter((comment) => comment._id !== commentId);
      });
    },
    [commentCount, publishCounts]
  );

  return {
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
  };
}
