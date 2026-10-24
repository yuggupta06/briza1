
import { PostType } from "@/types/post";

export type ImagesFeedState = {
    // Posts received from the API
    posts: PostType[];

    // Infinite scrolling and pagination
    feed: {
        loading: boolean;
        hasMore: boolean;
        cursor: string | null;
    };

    // Like animation
    likeAnimationIndex: number | null;
};
