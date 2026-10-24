
import { PostType } from "@/types/post";
import { ImagesFeedState } from "./types";

export type ImagesFeedAction =
    | {
          type: "SET_POSTS";
          payload: PostType[];
      }
    | {
          type: "APPEND_POSTS";
          payload: PostType[];
      }
    | {
          type: "SET_FEED_LOADING";
          payload: boolean;
      }
    | {
          type: "SET_HAS_MORE";
          payload: boolean;
      }
    | {
          type: "SET_CURSOR";
          payload: string | null;
      }
    | {
          type: "SET_LIKE_ANIMATION_INDEX";
          payload: number | null;
      };

export const initialState: ImagesFeedState = {
    posts: [],

    feed: {
        loading: true,
        hasMore: true,
        cursor: null,
    },

    likeAnimationIndex: null,
};

export function imagesFeedReducer(
    state: ImagesFeedState,
    action: ImagesFeedAction
): ImagesFeedState {
    switch (action.type) {
        case "SET_POSTS":
            return {
                ...state,
                posts: action.payload,
            };

        case "APPEND_POSTS":
            return {
                ...state,
                posts: [...state.posts, ...action.payload],
            };

        case "SET_FEED_LOADING":
            return {
                ...state,
                feed: {
                    ...state.feed,
                    loading: action.payload,
                },
            };

        case "SET_HAS_MORE":
            return {
                ...state,
                feed: {
                    ...state.feed,
                    hasMore: action.payload,
                },
            };

        case "SET_CURSOR":
            return {
                ...state,
                feed: {
                    ...state.feed,
                    cursor: action.payload,
                },
            };

        case "SET_LIKE_ANIMATION_INDEX":
            return {
                ...state,
                likeAnimationIndex: action.payload,
            };

        default:
            return state;
    }
}
