"use client";

import type { PostCardProps } from "@/types/post";
import { memo } from "react";
import FeedPostCard from "./FeedPostCard/FeedPostCard";
import ProfilePostThumbnail from "./ProfilePostCard/ProfilePostThumbnail";

function PostCardComponent({
  post,
  variant = "feed",
  onOpenPost,
}: PostCardProps) {
  if (variant === "profile") {
    return (
      <ProfilePostThumbnail
        post={post}
        onOpenPost={onOpenPost}
      />
    );
  }

  return <FeedPostCard post={post} />;
}

const PostCard = memo(PostCardComponent);

export default PostCard;

export type {
  PostCardProps,
  PostCardVariant, PostType
} from "@/types/post";