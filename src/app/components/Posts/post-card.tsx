
"use client";

import { memo } from "react";
import type { PostCardProps } from "@/types/post";
import ProfilePostThumbnail from "./ProfilePostThumbnail";
import FeedPostCard from "./FeedPostCard";

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
 PostType,
  PostCardProps,
  PostCardVariant,
} from "@/types/post";
