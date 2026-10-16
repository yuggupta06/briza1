import { CommentWithAuthor } from "@/types/comment";
import { PostType } from "@/types/post";

export type ActiveImageType = {
  postId: string;
  imageUrl: string;

  user: {
    username: string;
    imageUrl: string;
  };

  index: number;
  postType: string;
  likeCount: number;
  isLiked: boolean;

  showLike?: boolean;
};
export type ImagesFeedState = {
    // Server/API data
    posts: PostType[];

    // Feed state
    feed: {
        loading: boolean;
        hasMore: boolean;
        cursor: string | null;
    };

    // Modal state
    modal: {
        isOpen: boolean;
        post: ActiveImageType | null;
    };

    // Comment state
    comments: {
        items: CommentWithAuthor[];
        loading: boolean;
        text: string;
    };

    // Like animation
    likeAnimationIndex: number | null;
};