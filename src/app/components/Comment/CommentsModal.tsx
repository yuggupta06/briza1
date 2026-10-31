"use client";

import axios from "axios";
import {
  ChevronDown,
  LoaderCircle,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from "react";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { useRealtime } from "@/app/providers/RealtimeProvider";
import {
  FALLBACK_AVATAR,
  formatCount,
  formatDate,
} from "@/backend/lib/post-card-utils";
import type { CommentWithAuthor } from "@/types/comment";

type CommentItem = CommentWithAuthor & {
  repliesCount?: number;
  parentCommentId?: string | null;
  replyToCommentId?: string | null;
  replyToUserId?: string | null;
  replyToUser?: {
    _id: string;
    username: string;
  } | null;
};

type ReplyItem = CommentItem & {
  parentCommentId: string;
};

interface Props {
  postId: string;
  open: boolean;
  onClose: () => void;
  commentCount: number;
  comments: CommentItem[];
  commentText: string;
  setCommentText: (value: string) => void;
  commentsLoading: boolean;
  isLoadingMore: boolean;
  isSubmittingComment: boolean;
  hasMoreComments: boolean;
  commentsError: string;
  submitError: string;
  setSubmitError: (value: string) => void;
  fetchComments: (cursor: string | null) => unknown;
  loadMoreComments: () => unknown;
  submitComment: () => Promise<boolean>;
  onCommentDeleted: (commentId: string, isReply: boolean) => void;
}

function CommentsModalComponent({
  postId,
  open,
  onClose,
  commentCount,
  comments,
  commentText,
  setCommentText,
  commentsLoading,
  isLoadingMore,
  isSubmittingComment,
  hasMoreComments,
  commentsError,
  submitError,
  setSubmitError,
  fetchComments,
  loadMoreComments,
  submitComment,
  onCommentDeleted
}: Props) {
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (commentsLoading || isSubmittingComment) return;

      const success = await submitComment();

      if (success && commentsContainerRef.current) {
        commentsContainerRef.current.scrollTop = 0;
      }
    },
    [commentsLoading, isSubmittingComment, submitComment]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`comments-title-${postId}`}
        className="flex h-[88dvh] max-h-225 w-full flex-col overflow-hidden rounded-t-2xl bg-neutral-950 text-white sm:h-[min(760px,90dvh)] sm:max-w-xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="w-8" />

          <div className="text-center">
            <h2
              id={`comments-title-${postId}`}
              className="text-base font-semibold"
            >
              Comments
            </h2>

            <p className="text-xs text-neutral-500">
              {formatCount(commentCount)} comments
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </header>

        <div
          ref={commentsContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {commentsLoading &&
            comments.length === 0 &&
            !isSubmittingComment ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400">
              <LoaderCircle size={18} className="animate-spin" />
              Loading comments...
            </div>
          ) : commentsError && comments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-neutral-400">
                {commentsError}
              </p>

              <button
                type="button"
                onClick={() => void fetchComments(null)}
                className="mt-3 rounded-full bg-neutral-800 px-4 py-2 text-sm"
              >
                Try again
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <MessageCircle
                size={32}
                className="mx-auto mb-3 text-neutral-600"
              />

              <p className="font-medium">No comments yet</p>

              <p className="mt-1 text-sm text-neutral-500">
                Be the first to share your thoughts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {comments.map((item) => (
                <CommentThread
                  key={item._id}
                  postId={postId}
                  item={item}
                  onCommentDeleted={onCommentDeleted}
                />
              ))}
            </div>
          )}

          {commentsError && comments.length > 0 && (
            <p
              role="alert"
              className="px-4 py-3 text-center text-sm text-rose-400"
            >
              {commentsError}
            </p>
          )}

          {!commentsLoading && hasMoreComments && (
            <div className="px-4 py-4 text-center">
              <button
                type="button"
                onClick={() => void loadMoreComments()}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <ChevronDown size={16} />
                )}

                {isLoadingMore
                  ? "Loading..."
                  : "Load more comments"}
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-neutral-800 bg-neutral-950 p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={commentText}
              onChange={(event) => {
                setCommentText(event.target.value);
                setSubmitError("");
              }}
              placeholder="Add a comment..."
              rows={1}
              maxLength={500}
              disabled={isSubmittingComment}
              className="max-h-28 min-h-11 min-w-0 flex-1 resize-y rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-600 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={
                !commentText.trim() || isSubmittingComment
              }
              aria-label="Post comment"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-black disabled:opacity-40"
            >
              {isSubmittingComment ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            {submitError ? (
              <p role="alert" className="text-xs text-rose-400">
                {submitError}
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                Keep it respectful and friendly.
              </p>
            )}

            <span className="shrink-0 text-xs text-neutral-600">
              {commentText.length}/500
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
interface ThreadProps {
  postId: string;
  item: CommentItem;
  onCommentDeleted: (commentId: string, isReply: boolean) => void;
}

function CommentThreadComponent({
  postId,
  item,
  onCommentDeleted
}: ThreadProps) {
  const { currentUser } = useCurrentUser();
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] =
    useState<CommentItem | null>(null);

  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [replyCount, setReplyCount] = useState(
    item.repliesCount ?? 0
  );

  const requestInFlight = useRef(false);
  const hasFetchedReplies = useRef(false);
  const seenReplyIdsRef = useRef(new Set<string>());
  const { subscribeToPost } = useRealtime();

  const addReplyOnce = useCallback((reply: ReplyItem) => {
    if (seenReplyIdsRef.current.has(reply._id)) return;

    seenReplyIdsRef.current.add(reply._id);

    setReplies((previous) => [
      reply,
      ...previous.filter((existing) => existing._id !== reply._id),
    ]);

    setReplyCount((count) => count + 1);
  }, []);

  useEffect(() => {
    return subscribeToPost(postId, "new-reply", ({ reply }) => {
      // A post channel carries replies for every root comment on that post.
      if (reply.parentCommentId !== item._id) return;

      addReplyOnce(reply as ReplyItem);
    });
  }, [postId, item._id, subscribeToPost, addReplyOnce]);

  const fetchReplies = useCallback(
    async (nextCursor: string | null) => {
      if (requestInFlight.current) return;

      requestInFlight.current = true;
      setReplyError("");

      if (nextCursor) setLoadingMore(true);
      else setLoading(true);

      try {
        const response = await axios.post(
          "/api/comments/replies/child-comments",
          {
            postId,
            parentCommentId: item._id,
            cursor: nextCursor,
          },
          { withCredentials: true }
        );

        const data = response.data;

        if (!data.success) {
          throw new Error(
            data.message || "Unable to load replies."
          );
        }

        const fetched = data.replies as ReplyItem[];

        setReplies((previous) => {
          // Keep replies that arrived through Pusher while this request
          // was in flight, then merge fetched replies without duplicates.
          const merged = [...previous, ...fetched];
          const uniqueReplies = Array.from(
            new Map(
              merged.map((reply) => [reply._id, reply])
            ).values()
          );

          uniqueReplies.forEach((reply) => {
            seenReplyIdsRef.current.add(reply._id);
          });

          return uniqueReplies;
        });

        hasFetchedReplies.current = true;
        setHasMore(Boolean(data.hasMore));
        setCursor(data.nextCursor ?? null);
      } catch (error) {
        setReplyError(
          axios.isAxiosError(error)
            ? error.response?.data?.message ||
            error.message ||
            "Unable to load replies."
            : error instanceof Error
              ? error.message
              : "Unable to load replies."
        );
      } finally {
        requestInFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [item._id, postId]
  );

  const handleDelete = useCallback(
    async (commentId: string, isReply: boolean) => {
      if (deletingId) return;

      const confirmed = window.confirm(
        "Are you sure you want to delete this comment?"
      );

      if (!confirmed) return;

      setDeletingId(commentId);
      setDeleteError("");

      try {
        const response = await axios.post(
          "/api/comments/delete-comments",
          { commentId },
          { withCredentials: true }
        );

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Unable to delete comment."
          );
        }

        if (isReply) {
          setReplies((previous) =>
            previous.filter((reply) => reply._id !== commentId)
          );
          setReplyCount((count) => Math.max(0, count - 1));

          if (replyingTo?._id === commentId) {
            setReplyingTo(null);
            setReplyText("");
          }
        } else {
          // Refresh the parent-owned comments list.
          onCommentDeleted(commentId, false);
        }
      } catch (error) {
        setDeleteError(
          axios.isAxiosError(error)
            ? error.response?.data?.message ||
            error.message ||
            "Unable to delete comment."
            : error instanceof Error
              ? error.message
              : "Unable to delete comment."
        );
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, onCommentDeleted, replyingTo?._id]
  );

  const handleViewReplies = useCallback(() => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (!hasFetchedReplies.current) {
      void fetchReplies(null);
    }
  }, [expanded, fetchReplies]);

  const handleReply = useCallback(
    (target: CommentItem) => {
      setReplyingTo(target);
      setReplyText("");
      setReplyError("");
      setExpanded(true);

      if (!hasFetchedReplies.current) {
        void fetchReplies(null);
      }
    },
    [fetchReplies]
  );

  const handleSubmitReply = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      const target = replyingTo;
      const text = replyText.trim();

      if (!target || !text || submitting) return;

      setSubmitting(true);
      setReplyError("");

      try {
        const response = await axios.post(
          "/api/comments/replies/create-reply",
          {
            postId,
            parentCommentId: item._id,
            replyToCommentId: target._id,
            text,
          },
          { withCredentials: true }
        );

        const data = response.data;

        if (!data.success || !data.reply) {
          throw new Error(
            data.message || "Unable to post your reply."
          );
        }

        const newReply = data.reply as ReplyItem;

        addReplyOnce(newReply);

        hasFetchedReplies.current = true;
        setExpanded(true);
        setReplyingTo(null);
        setReplyText("");
      } catch (error) {
        setReplyError(
          axios.isAxiosError(error)
            ? error.response?.data?.message ||
            error.message ||
            "Unable to post your reply."
            : error instanceof Error
              ? error.message
              : "Unable to post your reply."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [addReplyOnce, item._id, postId, replyText, replyingTo, submitting]
  );

  const canDeleteComment =
    String(item.author._id) === String(currentUser?._id);

  return (
    <div className="min-w-0 px-3 py-4 sm:px-4">
      {/* Original comment */}
      <div className="flex min-w-0 gap-3">
        <Avatar author={item.author} />

        <div className="min-w-0 flex-1">
          <CommentHeader item={item} />

          <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-neutral-300">
            {item.text}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleReply(item)}
              className="text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer"
            >
              Reply
            </button>

            <button
              type="button"
              onClick={handleViewReplies}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
            >
              <ChevronDown
                size={14}
                className={
                  expanded
                    ? "rotate-180 transition-transform"
                    : "transition-transform"
                }
              />

              {expanded ? "Hide replies" : "View more replies"}
            </button>

            {replyCount > 0 && (
              <span className="text-xs text-neutral-500">
                {formatCount(replyCount)}{" "}
                {replyCount === 1 ? "reply" : "replies"}
              </span>
            )}

            {canDeleteComment && (
              <button
                type="button"
                onClick={() => void handleDelete(item._id, false)}
                disabled={deletingId !== null}
                aria-label="Delete your comment"
                title="Delete comment"
                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-400 disabled:opacity-50"
              >
                {deletingId === item._id ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="mt-2 pl-12 text-xs text-rose-400">
          {deleteError}
        </p>
      )}

      {/* Replies */}
      {expanded && (
        <div className="ml-4 mt-3 border-l border-neutral-800 pl-2 sm:ml-6 sm:pl-3">
          {loading && replies.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-xs text-neutral-400">
              <LoaderCircle size={15} className="animate-spin" />
              Loading replies...
            </div>
          ) : (
            <>
              {replies.map((reply) => {
                const canDeleteReply =
                  String(reply.author._id) === String(currentUser?._id);

                return (
                  <div key={reply._id} className="min-w-0 py-3">
                    <div className="flex min-w-0 gap-2.5 sm:gap-3">
                      <Avatar author={reply.author} small />

                      <div className="min-w-0 flex-1">
                        <CommentHeader item={reply} />

                        <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-neutral-300">
                          {reply.replyToUser?.username && (
                            <Link
                              href={`/profile/${reply.replyToUser.username}`}
                              className="mr-1 font-medium text-sky-400 hover:underline"
                            >
                              @{reply.replyToUser.username}
                            </Link>
                          )}
                          {reply.text}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleReply(reply)}
                            className="text-xs font-semibold text-neutral-400 hover:text-white"
                          >
                            Reply
                          </button>

                          {canDeleteReply && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(reply._id, true)
                              }
                              disabled={deletingId !== null}
                              aria-label="Delete your reply"
                              title="Delete reply"
                              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-400 disabled:opacity-50"
                            >
                              {deletingId === reply._id ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Delete
                            </button>
                          )}
                        </div>

                        {deleteError && deletingId === null && (
                          <p
                            role="alert"
                            className="mt-1 text-xs text-rose-400"
                          >
                            {deleteError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {replies.length === 0 && !loading && (
                <p className="py-3 text-xs text-neutral-500">
                  No replies yet.
                </p>
              )}
            </>
          )}

          {replyError && (
            <p role="alert" className="py-2 text-xs text-rose-400">
              {replyError}
            </p>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => void fetchReplies(cursor)}
              disabled={loadingMore || loading}
              className="inline-flex items-center gap-2 py-3 text-xs font-semibold text-sky-400 disabled:opacity-50"
            >
              {loadingMore && (
                <LoaderCircle size={14} className="animate-spin" />
              )}

              {loadingMore
                ? "Loading..."
                : "View 10 more replies"}
            </button>
          )}
        </div>
      )}

      {/* Reply composer */}
      {replyingTo && (
        <form
          onSubmit={handleSubmitReply}
          className="ml-4 mt-3 flex min-w-0 items-end gap-2 sm:ml-6"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex min-w-0 items-center gap-1 text-xs text-neutral-500">
              <span className="shrink-0">Replying to</span>

              <Link
                href={`/profile/${replyingTo.author.username}`}
                className="truncate font-medium text-sky-400"
              >
                @{replyingTo.author.username}
              </Link>

              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                  setReplyError("");
                }}
                className="ml-auto shrink-0 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={1}
              maxLength={500}
              disabled={submitting}
              placeholder={`Reply to @${replyingTo.author.username}...`}
              aria-label={`Reply to ${replyingTo.author.username}`}
              className="min-h-10 w-full resize-y rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-600 disabled:opacity-60"
            />

            {replyError && (
              <p role="alert" className="mt-1 text-xs text-rose-400">
                {replyError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!replyText.trim() || submitting}
            aria-label="Send reply"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black disabled:opacity-40"
          >
            {submitting ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}
          </button>
        </form>
      )}
    </div>
  );
}

function Avatar({
  author,
  small = false,
}: {
  author: CommentWithAuthor["author"];
  small?: boolean;
}) {
  return (
    <Link
      href={`/profile/${author.username}`}
      className={`relative shrink-0 overflow-hidden rounded-full bg-neutral-800 ${small ? "h-8 w-8" : "h-9.5 w-9.5"
        }`}
    >
      <Image
        src={author.imageUrl || FALLBACK_AVATAR}
        alt={`${author.username}'s avatar`}
        fill
        sizes={small ? "32px" : "38px"}
        className="object-cover"
        unoptimized
      />
    </Link>
  );
}

function CommentHeader({ item }: { item: CommentItem }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <Link
        href={`/profile/${item.author.username}`}
        className="break-all text-sm font-semibold text-white hover:underline"
      >
        {item.author.username}
      </Link>

      <time
        dateTime={item.createdAt}
        className="text-xs text-neutral-500"
      >
        {formatDate(item.createdAt)}
      </time>
    </div>
  );
}

const CommentThread = memo(CommentThreadComponent);

export default memo(CommentsModalComponent);