
"use client";

import axios from "axios";
import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PostType } from "@/types/post";

interface UseProfileActionsProps {
  isOwner: boolean;
  userId: string;
  selectedPost: PostType | null;

  posts: PostType[];
  likedPosts: PostType[];

  setPosts: Dispatch<SetStateAction<PostType[]>>;
  setLikedPosts: Dispatch<SetStateAction<PostType[]>>;

  setSelectedPost: Dispatch<SetStateAction<PostType | null>>;

  commentsModalOpen: boolean;
  setCommentsModalOpen: Dispatch<SetStateAction<boolean>>;

  showToast: (message: string) => void;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      fallback
    );
  }

  return error instanceof Error
    ? error.message
    : fallback;
}

export function useProfileActions({
  isOwner,
  userId,
  selectedPost,
  posts,
  likedPosts,
  setPosts,
  setLikedPosts,
  setSelectedPost,
  commentsModalOpen,
  setCommentsModalOpen,
  showToast,
}: UseProfileActionsProps) {
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Prevents duplicate delete requests before React re-renders.
  const deletingPostRef = useRef(false);

  const deleteSelectedPost = useCallback(async () => {
    // Authorization and duplicate-request guards.
    if (
      !isOwner ||
      !selectedPost ||
      selectedPost.author._id !== userId ||
      deletingPostRef.current
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone."
    );

    if (!confirmed) return;

    const deletedId = selectedPost._id;

    // Lock immediately to prevent repeated clicks.
    deletingPostRef.current = true;
    setIsDeletingPost(true);

    // Save the previous state for rollback.
    const previousPosts = posts;
    const previousLikedPosts = likedPosts;
    const previousSelectedPost = selectedPost;
    const previousCommentsModalOpen = commentsModalOpen;

    // Optimistically remove the post from both lists.
    setPosts((currentPosts) =>
      currentPosts.filter((post) => post._id !== deletedId)
    );

    setLikedPosts((currentLikedPosts) =>
      currentLikedPosts.filter((post) => post._id !== deletedId)
    );

    // Close the post and comments modals immediately.
    setSelectedPost(null);
    setCommentsModalOpen(false);

    try {
      const response = await axios.post("/api/posts/delete", {
        postId: deletedId,
      });

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "Unable to delete this post."
        );
      }

      // Server confirmed deletion.
      showToast("Post deleted.");
    } catch (error) {
      console.error("Unable to delete post:", error);

      // Restore the previous lists.
      setPosts(previousPosts);
      setLikedPosts(previousLikedPosts);

      // Restore the post modal and comments modal state.
      setSelectedPost(previousSelectedPost);
      setCommentsModalOpen(previousCommentsModalOpen);

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
  }, [
    isOwner,
    userId,
    selectedPost,
    posts,
    likedPosts,
    setPosts,
    setLikedPosts,
    setSelectedPost,
    commentsModalOpen,
    setCommentsModalOpen,
    showToast,
  ]);

  return {
    isDeletingPost,
    deleteSelectedPost,
  };
}
