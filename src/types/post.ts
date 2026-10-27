export type PostType = {
  _id: string;
  author: {
    _id: string;
    username: string;
    imageUrl: string;
  };
  postUrl: string;
  postType: "image" | "video" | "text";
  isLiked: boolean;
  caption?: string;
  createdAt?: string;
  likesCount: number;
  commentsCount: number;
};

export type PostCardVariant = "feed" | "profile";

export interface PostCardProps {
  post: PostType;
  variant?: PostCardVariant;
  onOpenPost?: (post: PostType) => void;
}