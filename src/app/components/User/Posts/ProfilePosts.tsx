
"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo } from "react";
import { SWRConfig } from "swr";
import {
  Camera,
  ChevronDown,
  Heart,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";

import PostCard from "@/app/components/PostCard/post-card";
import {
  usePaginatedData,
  type PaginatedResponse,
} from "@/app/hooks/Pagination/use-paginated-data";

import type { PostType } from "@/types/post";
import type { UserType } from "@/types/user";
import type { SetStateAction } from "react";

export type ProfileTab = "posts" | "saved" | "liked";

export interface ProfilePostsSetters {
  setPosts: (updater: SetStateAction<PostType[]>) => void;
  setLikedPosts: (updater: SetStateAction<PostType[]>) => void;
}

interface ProfilePostsProps {
  user: UserType;
  isOwner: boolean;
  tab: ProfileTab;
  onPostsChange: (posts: PostType[]) => void;
  onLikedPostsChange: (posts: PostType[]) => void;
  onSettersReady: (setters: ProfilePostsSetters | null) => void;
  onOpenPost: (post: PostType) => void;
}

const getPostId = (post: PostType) => post._id;

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

function ProfilePostsContent({
  user,
  isOwner,
  tab,
  onPostsChange,
  onLikedPostsChange,
  onSettersReady,
  onOpenPost,
}: ProfilePostsProps) {
  // ---------------------------------------
  // Profile posts fetcher
  // ---------------------------------------

  const fetchProfilePostsPage = useCallback(
    async (
      cursor: string | null
    ): Promise<PaginatedResponse<PostType>> => {
      const { data } = await axios.get("/api/posts/get_posts", {
        params: {
          ...(!isOwner ? { username: user.username } : {}),
          ...(cursor ? { cursor } : {}),
        },
        withCredentials: true,
      });

      return {
        success: data.success,
        items: data.posts ?? [],
        pagination: data.pagination,
        error: data.error,
        message: data.message,
      };
    },
    [isOwner, user.username]
  );

  // ---------------------------------------
  // Liked posts fetcher
  // ---------------------------------------

  const fetchLikedPostsPage = useCallback(
    async (
      cursor: string | null
    ): Promise<PaginatedResponse<PostType>> => {
      const { data } = await axios.get("/api/posts/liked", {
        params: cursor ? { cursor } : {},
        withCredentials: true,
      });

      return {
        success: data.success,
        items: data.posts ?? [],
        pagination: data.pagination,
        error: data.error,
        message: data.message,
      };
    },
    []
  );

  // ---------------------------------------
  // Pagination hooks
  // ---------------------------------------

  const profileKey = isOwner ? user._id : user.username;

  const profilePagination = usePaginatedData(
    fetchProfilePostsPage,
    getPostId,
    `profile-posts-${profileKey}`
  );

  const likedPagination = usePaginatedData(
    fetchLikedPostsPage,
    getPostId,
    `profile-liked-${user._id}`,
    tab === "liked" && isOwner
  );

  const {
    items: posts,
    setItems: setPosts,
    isLoading,
    isLoadingMore: isLoadingMorePosts,
    hasMore: hasMorePosts,
    nextCursor: nextPostsCursor,
    error: errorMessage,
    fetchFirstPage: fetchPosts,
    loadMore: loadMorePosts,
  } = profilePagination;

  const {
    items: likedPosts,
    setItems: setLikedPosts,
    isLoading: isLoadingLikedPosts,
    isLoadingMore: isLoadingMoreLikedPosts,
    hasMore: hasMoreLikedPosts,
    nextCursor: nextLikedCursor,
    error: likedError,
    fetchFirstPage: fetchLikedPosts,
    loadMore: loadMoreLikedPosts,
  } = likedPagination;

  // ---------------------------------------
  // Send current data to ProfileCanvas
  // ---------------------------------------

  useEffect(() => {
    onPostsChange(posts);
  }, [posts, onPostsChange]);

  useEffect(() => {
    onLikedPostsChange(likedPosts);
  }, [likedPosts, onLikedPostsChange]);

  // Give ProfileCanvas access to the SWR setters.
  useEffect(() => {
    onSettersReady({
      setPosts,
      setLikedPosts,
    });

    return () => {
      onSettersReady(null);
    };
  }, [setPosts, setLikedPosts, onSettersReady]);

  // ---------------------------------------
  // Synchronize author information
  // ---------------------------------------

  useEffect(() => {
    if (posts.length > 0) {
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
    }

    if (likedPosts.length > 0) {
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
    }
  }, [
    user._id,
    user.username,
    user.imageUrl,
    posts.length,
    likedPosts.length,
    setPosts,
    setLikedPosts,
  ]);

  // ---------------------------------------
  // Derived values
  // ---------------------------------------

  const visiblePosts = tab === "liked" ? likedPosts : posts;

  const activeIsLoading =
    tab === "liked" ? isLoadingLikedPosts : isLoading;

  const activeError =
    tab === "liked" ? likedError : errorMessage;

  const hasMore =
    tab === "liked" ? hasMoreLikedPosts : hasMorePosts;

  const isLoadingMore =
    tab === "liked"
      ? isLoadingMoreLikedPosts
      : isLoadingMorePosts;

  const nextCursor =
    tab === "liked" ? nextLikedCursor : nextPostsCursor;

  const loadMore =
    tab === "liked" ? loadMoreLikedPosts : loadMorePosts;

  const retry =
    tab === "liked" ? fetchLikedPosts : fetchPosts;

  // ---------------------------------------
  // Loading state
  // ---------------------------------------

  if (activeIsLoading) {
    return (
      <div className="grid min-w-0 grid-cols-2 gap-1.5 pt-5 sm:gap-3 md:grid-cols-3 md:gap-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-lg bg-surface-container-high"
          />
        ))}
      </div>
    );
  }

  // ---------------------------------------
  // Error state
  // ---------------------------------------

  if (activeError) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 py-20 text-center">
        <p className="max-w-md text-sm text-outline">
          {activeError}
        </p>

        <button
          type="button"
          onClick={() => void retry()}
          className="rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm hover:bg-surface-container-high"
        >
          Try again
        </button>
      </div>
    );
  }

  // ---------------------------------------
  // Empty state
  // ---------------------------------------

  if (visiblePosts.length === 0) {
    if (tab === "liked") {
      return (
        <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
          <Heart size={34} className="text-outline" />

          <h2 className="text-xl font-semibold">
            No liked posts
          </h2>

          <p className="max-w-sm text-sm text-outline">
            Posts you like will appear here, including posts shared by
            other users.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 px-5 py-20 text-center">
        <Camera size={36} className="text-outline" />

        <h2 className="text-xl font-semibold">
          No posts yet
        </h2>

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
    );
  }

  // ---------------------------------------
  // Posts grid
  // ---------------------------------------

  return (
    <div className="space-y-6 pt-4 sm:pt-6">
      <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-3 md:gap-5">
        {visiblePosts.map((post) => (
          <PostCard
            key={post._id}
            post={toPostType(post)}
            variant="profile"
            onOpenPost={() => onOpenPost(post)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            disabled={isLoadingMore || !nextCursor}
            onClick={() => void loadMore()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm transition hover:bg-surface-container-high disabled:opacity-50"
          >
            {isLoadingMore && (
              <LoaderCircle
                size={16}
                className="animate-spin"
              />
            )}

            {isLoadingMore ? "Loading posts..." : "Load more"}

            {!isLoadingMore && <ChevronDown size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------
// SWR cache boundary
// ---------------------------------------

function ProfilePostsWrapper(props: ProfilePostsProps) {
  const isolatedCacheConfig = useMemo(
    () => ({
      provider: () => new Map(),
    }),
    []
  );

  // Own profile uses the existing global SWR cache.
  if (props.isOwner) {
    return <ProfilePostsContent {...props} />;
  }

  // Another user's profile gets its own cache.
  return (
    <SWRConfig value={isolatedCacheConfig}>
      <ProfilePostsContent {...props} />
    </SWRConfig>
  );
}

export default ProfilePostsWrapper;
