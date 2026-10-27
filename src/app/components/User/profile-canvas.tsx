
"use client";

import axios from "axios";
import {
  ArrowLeft,
  Bookmark,
  Camera,
  ChevronDown,
  Grid2X2,
  Heart,
  Link2,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
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
} from "react";

import CommentsModalComponent from "@/app/components/Posts/CommentsModal";
import PostCard from "@/app/components/Posts/post-card";
import FollowButton from "@/app/components/follow/FollowButton";
import FollowStats from "@/app/components/follow/FollowStats";
import { Avatar } from "@/app/components/ui/avatar";
import { usePostInteractions } from "@/app/hooks/use-post-interactions";
import { useSharePost } from "@/app/hooks/use-share-post";
import { useMediaDoubleClick } from "@/app/hooks/useMediaDoubleClick";
import { formatCount, formatDate } from "@/backend/lib/post-card-utils";
import type { PostType } from "@/types/post";
import type { UserType } from "@/types/user";

type ProfileTab = "posts" | "saved" | "liked";

interface ProfileCanvasProps {
  user: UserType;
  isOwner: boolean;
  onEditProfile?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
}

interface ProfilePostsResponse {
  success: boolean;
  posts: PostType[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  error?: string;
  message?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      fallback
    );
  }

  return error instanceof Error ? error.message : fallback;
}

function toPostType(post: PostType): PostType {
  return {
    _id: post._id,
    postUrl: post.postUrl,
    postType: post.postType,
    caption: post.caption,
    createdAt: post.createdAt,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    isLiked: post.isLiked,
    author: {
      _id: post.author._id,
      username: post.author.username,
      imageUrl: post.author.imageUrl,
    },
  };
}

function ProfileCanvas({
  user,
  isOwner,
  onEditProfile,
  onSignOut,
  onDeleteAccount,
}: ProfileCanvasProps) {
  const [tab, setTab] = useState<ProfileTab>("posts");

  // Follow counts displayed in the profile header.
  const [profileFollowers, setProfileFollowers] = useState(
    user.followers ?? 0
  );
  const [profileFollowing, setProfileFollowing] = useState(
    user.following ?? 0
  );

  // Posts created by the profile owner.
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [nextPostsCursor, setNextPostsCursor] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Posts liked by the authenticated user.
  const [likedPosts, setLikedPosts] = useState<PostType[]>([]);
  const [isLoadingLikedPosts, setIsLoadingLikedPosts] = useState(false);
  const [isLoadingMoreLikedPosts, setIsLoadingMoreLikedPosts] =
    useState(false);
  const [hasMoreLikedPosts, setHasMoreLikedPosts] = useState(false);
  const [nextLikedCursor, setNextLikedCursor] = useState<string | null>(
    null
  );
  const [likedError, setLikedError] = useState("");

  const [selectedPost, setSelectedPost] = useState<PostType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);

  const requestInProgressRef = useRef(false);
  const likedRequestInProgressRef = useRef(false);
  const deletingPostRef = useRef(false);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const usernameRef = useRef(user.username);

  useEffect(() => {
    usernameRef.current = user.username;
  }, [user.username]);

  // Keep the displayed counters in sync when the profile data changes.
  useEffect(() => {
    setProfileFollowers(user.followers ?? 0);
    setProfileFollowing(user.following ?? 0);
  }, [user._id, user.followers, user.following]);

  useEffect(() => {
    setPosts((previousPosts) =>
      previousPosts.map((post) =>
        post.author._id === user._id
          ? {
              ...post,
              author: {
                ...post.author,
                username: user.username,
                imageUrl: user.imageUrl,
              },
            }
          : post
      )
    );

    setLikedPosts((previousPosts) =>
      previousPosts.map((post) =>
        post.author._id === user._id
          ? {
              ...post,
              author: {
                ...post.author,
                username: user.username,
                imageUrl: user.imageUrl,
              },
            }
          : post
      )
    );

    setSelectedPost((previousPost) =>
      previousPost && previousPost.author._id === user._id
        ? {
            ...previousPost,
            author: {
              ...previousPost.author,
              username: user.username,
              imageUrl: user.imageUrl,
            },
          }
        : previousPost
    );
  }, [user._id, user.username, user.imageUrl]);

  const profileKey = isOwner ? user._id : user.username;

  const showToast = useCallback((message: string) => {
    setToast(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToast("");
      toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleCountsChange = useCallback(
    (
      postId: string,
      counts: {
        isLiked: boolean;
        likesCount: number;
        commentsCount: number;
      }
    ) => {
      setPosts((previous) =>
        previous.map((post) =>
          post._id === postId ? { ...post, ...counts } : post
        )
      );

      setLikedPosts((previous) => {
        if (!counts.isLiked) {
          return previous.filter((post) => post._id !== postId);
        }

        return previous.map((post) =>
          post._id === postId ? { ...post, ...counts } : post
        );
      });

      setSelectedPost((previous) =>
        previous && previous._id === postId
          ? { ...previous, ...counts }
          : previous
      );
    },
    []
  );

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
    submitComment: submitSharedComment,
    handleLike,
    handleCommentDeleted,
  } = usePostInteractions({
    post: selectedPost
      ? {
          _id: selectedPost._id,
          isLiked: selectedPost.isLiked,
          likesCount: selectedPost.likesCount,
          commentsCount: selectedPost.commentsCount,
        }
      : null,
    onCountsChange: handleCountsChange,
  });

  const {
    showHeartAnimation,
    heartAnimationKey,
    handleDoubleClick: handleMediaDoubleClick,
  } = useMediaDoubleClick({
    liked,
    isLiking,
    handleLike,
    restartAnimation: true,
  });

  const sharePost = useSharePost({
    postId: selectedPost?._id ?? "",
    username: selectedPost?.author.username ?? "",
    onLinkCopied: () => showToast("Link copied."),
    onShareError: () => showToast("Unable to share this post."),
  });

  // Fetch posts created by the profile owner.
  const fetchPosts = useCallback(
    async (cursor: string | null = null) => {
      if (requestInProgressRef.current) return;

      requestInProgressRef.current = true;

      const firstPage = cursor === null;

      if (firstPage) {
        setIsLoading(true);
        setErrorMessage("");
      } else {
        setIsLoadingMorePosts(true);
      }

      try {
        const response = await axios.get<ProfilePostsResponse>(
          "/api/posts/get_posts",
          {
            params: {
              ...(isOwner ? {} : { username: usernameRef.current }),
              ...(cursor ? { cursor } : {}),
            },
            withCredentials: true,
          }
        );

        const data = response.data;

        if (!data.success || !data.pagination) {
          throw new Error(
            data.error || "Invalid profile posts response."
          );
        }

        setPosts((previous) => {
          if (firstPage) return data.posts;

          const existingIds = new Set(
            previous.map((post) => post._id)
          );

          return [
            ...previous,
            ...data.posts.filter((post) => !existingIds.has(post._id)),
          ];
        });

        setHasMorePosts(data.pagination.hasMore);
        setNextPostsCursor(data.pagination.nextCursor);
      } catch (error) {
        console.error("Unable to fetch profile posts:", error);

        setErrorMessage(
          getErrorMessage(
            error,
            "Unable to load posts. Please try again."
          )
        );
      } finally {
        requestInProgressRef.current = false;
        setIsLoading(false);
        setIsLoadingMorePosts(false);
      }
    },
    [isOwner]
  );

  // Fetch posts liked by the authenticated user.
  const fetchLikedPosts = useCallback(
    async (cursor: string | null = null) => {
      if (likedRequestInProgressRef.current) return;

      likedRequestInProgressRef.current = true;

      const firstPage = cursor === null;

      if (firstPage) {
        setIsLoadingLikedPosts(true);
        setLikedError("");
      } else {
        setIsLoadingMoreLikedPosts(true);
      }

      try {
        const response = await axios.get<ProfilePostsResponse>(
          "/api/posts/liked",
          {
            params: cursor ? { cursor } : {},
            withCredentials: true,
          }
        );

        const data = response.data;

        if (!data.success || !data.pagination) {
          throw new Error(
            data.message || data.error || "Invalid liked posts response."
          );
        }

        setLikedPosts((previous) => {
          if (firstPage) return data.posts;

          const existingIds = new Set(
            previous.map((post) => post._id)
          );

          return [
            ...previous,
            ...data.posts.filter((post) => !existingIds.has(post._id)),
          ];
        });

        setHasMoreLikedPosts(data.pagination.hasMore);
        setNextLikedCursor(data.pagination.nextCursor);
      } catch (error) {
        console.error("Unable to fetch liked posts:", error);

        setLikedError(
          getErrorMessage(
            error,
            "Unable to load liked posts. Please try again."
          )
        );
      } finally {
        likedRequestInProgressRef.current = false;
        setIsLoadingLikedPosts(false);
        setIsLoadingMoreLikedPosts(false);
      }
    },
    []
  );

  // Reset profile data when switching to another profile.
  useEffect(() => {
    setPosts([]);
    setLikedPosts([]);

    setHasMorePosts(false);
    setNextPostsCursor(null);

    setHasMoreLikedPosts(false);
    setNextLikedCursor(null);

    setTab("posts");
    setErrorMessage("");
    setLikedError("");

    void fetchPosts(null);
  }, [profileKey, fetchPosts]);

  // Load liked posts when the owner selects the Liked tab.
  useEffect(() => {
    if (tab !== "liked" || !isOwner) return;

    setLikedPosts([]);
    setHasMoreLikedPosts(false);
    setNextLikedCursor(null);
    setLikedError("");

    void fetchLikedPosts(null);
  }, [tab, isOwner, fetchLikedPosts]);

  const openPost = useCallback(
    (post: PostType) => {
      setSelectedPost(post);
      setMenuOpen(false);
      setSubmitError("");
      setCommentsModalOpen(false);
    },
    [setSubmitError]
  );

  const openComments = useCallback(() => {
    if (!selectedPost) return;

    setCommentsModalOpen(true);

    if (comments.length === 0) {
      void fetchComments(null);
    }
  }, [selectedPost, comments.length, fetchComments]);

  const closePost = useCallback(() => {
    if (isSubmittingComment || isDeletingPost) return;

    setCommentsModalOpen(false);
    setSelectedPost(null);
    setSubmitError("");
  }, [isSubmittingComment, isDeletingPost, setSubmitError]);

  useEffect(() => {
    if (!selectedPost) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !commentsModalOpen &&
        !isSubmittingComment &&
        !isDeletingPost
      ) {
        setSelectedPost(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedPost,
    commentsModalOpen,
    isSubmittingComment,
    isDeletingPost,
  ]);

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Profile link copied.");
    } catch {
      showToast("Unable to copy profile link.");
    }

    setMenuOpen(false);
  }

  async function deleteSelectedPost() {
    if (
      !isOwner ||
      !selectedPost ||
      selectedPost.author._id !== user._id ||
      deletingPostRef.current
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone."
    );

    if (!confirmed) return;

    deletingPostRef.current = true;
    setIsDeletingPost(true);

    try {
      const response = await axios.post("/api/posts/delete", {
        postId: selectedPost._id,
      });

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to delete this post."
        );
      }

      const deletedId = selectedPost._id;

      setPosts((previous) =>
        previous.filter((post) => post._id !== deletedId)
      );

      setLikedPosts((previous) =>
        previous.filter((post) => post._id !== deletedId)
      );

      setSelectedPost(null);
      setCommentsModalOpen(false);
      showToast("Post deleted.");
    } catch (error) {
      console.error("Unable to delete post:", error);

      showToast(
        getErrorMessage(
          error,
          "Unable to delete this post. Please try again."
        )
      );
    } finally {
      deletingPostRef.current = false;
      setIsDeletingPost(false);
    }
  }

  const visiblePosts = tab === "liked" ? likedPosts : posts;

  const activeIsLoading =
    tab === "liked" ? isLoadingLikedPosts : isLoading;

  const activeError =
    tab === "liked" ? likedError : errorMessage;

  const profileTabs: {
    id: ProfileTab;
    label: string;
    Icon: typeof Grid2X2;
  }[] = isOwner
    ? [
        { id: "posts", label: "Posts", Icon: Grid2X2 },
        { id: "saved", label: "Saved", Icon: Bookmark },
        { id: "liked", label: "Liked", Icon: Heart },
      ]
    : [{ id: "posts", label: "Posts", Icon: Grid2X2 }];

  return (
    <section className="w-full min-w-0 pb-10 text-on-surface">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="flex min-w-0 flex-col gap-6 border-b border-outline-variant/25 py-6 sm:py-8 md:flex-row md:items-start md:gap-8 lg:gap-10">
          <Image
            src={user.imageUrl || "/placeholder-user.jpg"}
            alt={`${user.name}'s profile`}
            width={128}
            height={128}
            unoptimized
            className="mx-auto h-24 w-24 shrink-0 rounded-full border border-outline-variant/30 object-cover sm:h-28 sm:w-28 md:mx-0 md:h-32 md:w-32"
          />

          <div className="min-w-0 w-full flex-1 space-y-5 md:pt-1">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2 text-center sm:text-left">
                <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                  {user.name}
                </h1>

                <p className="break-all text-sm text-outline">
                  @{user.username}
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start">
                {isOwner ? (
                  <button
                    type="button"
                    onClick={onEditProfile}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-high px-4 text-sm font-medium transition hover:bg-surface-container-highest cursor-pointer"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <FollowButton
                    targetUserId={user._id}
                    onFollowChange={({ followers }) => {
                      // The displayed profile belongs to the target user.
                      // Update that user's follower count after the API succeeds.
                      setProfileFollowers(followers);
                    }}
                  />
                )}

                <button
                  type="button"
                  aria-label="Share profile"
                  onClick={() => void copyProfileLink()}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-high transition hover:bg-surface-container-highest cursor-pointer   "
                >
                  <Share2 size={17} />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    aria-label="More profile options"
                    aria-expanded={menuOpen}
                    onClick={() =>
                      setMenuOpen((previous) => !previous)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-high transition hover:bg-surface-container-highest cursor-pointer"
                  >
                    <MoreHorizontal size={19} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-high py-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => void copyProfileLink()}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-container-highest"
                      >
                        <Link2 size={16} />
                        Copy profile link
                      </button>

                      {isOwner && onSignOut && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onSignOut();
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-500 hover:bg-surface-container-highest"
                          >
                            Sign out
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onDeleteAccount?.();
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-500 hover:bg-surface-container-highest"
                          >
                            <Trash2 size={16} />
                            Delete account
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Clickable followers and following counts */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:justify-start sm:gap-x-10">
              <button
                type="button"
                onClick={() => setTab("posts")}
                className="text-left"
              >
                <span className="font-semibold">
                  {formatCount(posts.length)}
                </span>
                <span className="ml-1.5 text-sm text-outline">
                  posts
                </span>
              </button>

              <FollowStats
                username={user.username}
                followers={profileFollowers}
                following={profileFollowing}
              />
            </div>

            <p className="text-center text-sm leading-relaxed text-on-surface-variant sm:text-left">
              Sharing on Briza.
            </p>
          </div>
        </header>

        <nav
          aria-label="Profile sections"
          className="mt-3 flex items-center justify-center gap-8 border-b border-outline-variant/25 sm:mt-5 sm:gap-14"
        >
          {profileTabs.map(({ id, label, Icon: TabIcon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`relative flex min-h-14 items-center gap-2 px-1 text-xs font-semibold tracking-wide transition sm:min-h-16 cursor-pointer ${
                tab === id
                  ? "text-on-surface"
                  : "text-outline hover:text-on-surface "
              }`}
            >
              <TabIcon
                size={17}
                className={tab === id ? "text-primary" : ""}
              />

              <span>{label}</span>

              {tab === id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        {tab === "saved" ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-5 py-20 text-center">
            <Bookmark size={35} className="text-outline" />
            <h2 className="text-xl font-semibold">Saved posts</h2>
            <p className="text-sm leading-relaxed text-outline">
              Connect your saved-posts API to display your saved posts here.
            </p>
          </div>
        ) : activeIsLoading ? (
          <div className="grid min-w-0 grid-cols-2 gap-1.5 pt-5 sm:gap-3 md:grid-cols-3 md:gap-5">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="aspect-square animate-pulse rounded-lg bg-surface-container-high"
              />
            ))}
          </div>
        ) : activeError ? (
          <div className="flex flex-col items-center gap-4 px-5 py-20 text-center">
            <p className="max-w-md text-sm text-outline">
              {activeError}
            </p>

            <button
              type="button"
              onClick={() => {
                if (tab === "liked") {
                  void fetchLikedPosts(null);
                } else {
                  void fetchPosts(null);
                }
              }}
              className="rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm hover:bg-surface-container-high"
            >
              Try again
            </button>
          </div>
        ) : tab === "liked" && visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
            <Heart size={34} className="text-outline" />
            <h2 className="text-xl font-semibold">No liked posts</h2>
            <p className="max-w-sm text-sm text-outline">
              Posts you like will appear here, including posts shared by
              other users.
            </p>
          </div>
        ) : posts.length === 0 && tab === "posts" ? (
          <div className="flex flex-col items-center gap-4 px-5 py-20 text-center">
            <Camera size={36} className="text-outline" />
            <h2 className="text-xl font-semibold">No posts yet</h2>
            <p className="max-w-sm text-sm leading-relaxed text-outline">
              Your published posts will appear here.
            </p>

            {isOwner && (
              <Link
                href="/upload"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Create a post
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-4 sm:pt-6">
            <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-3 md:gap-5">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={toPostType(post)}
                  variant="profile"
                  onOpenPost={(openedPost) => {
                    const fullPost =
                      likedPosts.find(
                        (item) => item._id === openedPost._id
                      ) ??
                      posts.find(
                        (item) => item._id === openedPost._id
                      );

                    if (fullPost) openPost(fullPost);
                  }}
                />
              ))}
            </div>

            {(tab === "posts"
              ? hasMorePosts
              : hasMoreLikedPosts) && (
              <div className="flex justify-center py-4">
                <button
                  type="button"
                  disabled={
                    tab === "liked"
                      ? isLoadingMoreLikedPosts || !nextLikedCursor
                      : isLoadingMorePosts || !nextPostsCursor
                  }
                  onClick={() => {
                    if (tab === "liked" && nextLikedCursor) {
                      void fetchLikedPosts(nextLikedCursor);
                    } else if (tab === "posts" && nextPostsCursor) {
                      void fetchPosts(nextPostsCursor);
                    }
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm transition hover:bg-surface-container-high disabled:opacity-50"
                >
                  {(tab === "liked"
                    ? isLoadingMoreLikedPosts
                    : isLoadingMorePosts) && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}

                  {(tab === "liked"
                    ? isLoadingMoreLikedPosts
                    : isLoadingMorePosts)
                    ? "Loading posts..."
                    : "Load more"}

                  {!(
                    tab === "liked"
                      ? isLoadingMoreLikedPosts
                      : isLoadingMorePosts
                  ) && <ChevronDown size={16} />}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Post details"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 md:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePost();
          }}
        >
          <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-surface md:h-[min(92dvh,900px)] md:max-h-[92dvh] md:max-w-6xl md:flex-row md:rounded-2xl md:border md:border-white/10">
            <div className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-outline-variant/25 bg-surface px-4 md:hidden">
              <button
                type="button"
                onClick={closePost}
                aria-label="Back to profile"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container-high"
              >
                <ArrowLeft size={21} />
              </button>

              <span className="text-sm font-semibold">Post</span>

              <button
                type="button"
                onClick={() => void sharePost()}
                aria-label="Share post"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container-high"
              >
                <Share2 size={19} />
              </button>
            </div>

            <div className="flex min-h-0 w-full flex-none flex-col overflow-y-auto overscroll-contain md:w-[58%] md:flex-1 md:overflow-hidden">
              <div
                onDoubleClick={
                  selectedPost.postType !== "text"
                    ? handleMediaDoubleClick
                    : undefined
                }
                className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden bg-black md:aspect-auto md:min-h-0 md:flex-1"
              >
                {selectedPost.postType === "image" ? (
                  <Image
                    src={selectedPost.postUrl}
                    alt={`Post by ${selectedPost.author.username}`}
                    fill
                    unoptimized
                    sizes="(min-width: 768px) 58vw, 100vw"
                    className="object-contain"
                  />
                ) : selectedPost.postType === "video" ? (
                  <video
                    src={selectedPost.postUrl}
                    controls
                    playsInline
                    className="max-h-[65dvh] w-full object-contain md:max-h-full"
                  />
                ) : (
                  <div className="flex min-h-64 w-full items-center justify-center p-8 text-center text-white">
                    <p className="whitespace-pre-wrap break-words text-lg">
                      {selectedPost.caption || "Text post"}
                    </p>
                  </div>
                )}

                {showHeartAnimation && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <Heart
                      key={heartAnimationKey}
                      size={96}
                      strokeWidth={1.5}
                      className="animate-ping fill-red-500 text-red-500 drop-shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <aside className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t border-outline-variant/25 bg-surface md:w-[42%] md:flex-none md:border-l md:border-t-0">
              <div className="flex shrink-0 items-center gap-2 border-b border-outline-variant/25 p-3 sm:gap-3 sm:p-4">
                <Avatar
                  src={
                    selectedPost.author.imageUrl ||
                    "/placeholder-user.jpg"
                  }
                  alt={`${selectedPost.author.username}'s avatar`}
                  size={40}
                  className="shrink-0"
                />

                <div className="min-w-0 flex-1 cursor-pointer">
                  <p className="truncate text-sm font-semibold">
                    @{selectedPost.author.username}
                  </p>

                  <p className="mt-1 text-xs text-outline">
                    {selectedPost.createdAt
                      ? formatDate(selectedPost.createdAt)
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => void sharePost()}
                    aria-label="Share post"
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container-high cursor-pointer"
                  >
                    <Share2 size={17} />
                  </button>

                  {isOwner && selectedPost.author._id === user._id && (
                    <button
                      type="button"
                      onClick={() => void deleteSelectedPost()}
                      disabled={isDeletingPost || isSubmittingComment}
                      aria-label="Delete post"
                      title="Delete post"
                      className="mr-1 flex h-9 w-9 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      {isDeletingPost ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <section className="space-y-3 p-4 sm:p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-outline">
                    Caption
                  </h2>

                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">
                    {selectedPost.caption || "No caption for this post."}
                  </p>
                </section>

                <section className="border-y border-outline-variant/25 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => void handleLike()}
                      disabled={isLiking}
                      aria-label={liked ? "Unlike post" : "Like post"}
                      aria-pressed={liked}
                      className={`flex items-center gap-2 text-sm transition disabled:opacity-50 cursor-pointer ${
                        liked
                          ? "text-rose-500"
                          : "text-on-surface hover:text-rose-500"
                      }`}
                    >
                      <Heart
                        size={22}
                        fill={liked ? "currentColor" : "none"}
                      />
                      <span>{formatCount(likeCount)} likes</span>
                    </button>

                    <button
                      type="button"
                      onClick={openComments}
                      aria-label="Open comments"
                      className="flex items-center gap-2 text-sm transition hover:text-primary cursor-pointer"
                    >
                      <MessageCircle size={21} />
                      <span>{formatCount(commentCount)} comments</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Share post"
                      onClick={() => void sharePost()}
                      className="ml-auto flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container-high cursor-pointer"
                    >
                      <Send size={19} />
                    </button>
                  </div>

                  {likeError && (
                    <p role="alert" className="mt-2 text-xs text-rose-500">
                      {likeError}
                    </p>
                  )}
                </section>
              </div>
            </aside>

            <button
              type="button"
              aria-label="Close post"
              onClick={closePost}
              className="absolute left-3 top-3 z-30 hidden h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 md:flex cursor-pointer"
            >
              <X size={19} />
            </button>
          </div>
        </div>
      )}

      {selectedPost && (
        <CommentsModalComponent
          postId={selectedPost._id}
          open={commentsModalOpen}
          onClose={() => {
            setCommentsModalOpen(false);
            setSubmitError("");
          }}
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
          submitComment={submitSharedComment}
          onCommentDeleted={handleCommentDeleted}
        />
      )}

      <div
        aria-live="polite"
        className={`fixed bottom-5 left-1/2 z-[70] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-center text-sm shadow-xl transition-all ${
          toast
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        {toast}
      </div>
    </section>
  );
}

export default memo(ProfileCanvas);
