
import { CommentWithAuthor } from "@/types/comment";
import { PostType } from "@/types/post";
import { ActiveImageType, ImagesFeedState } from "./types";

export type ImagesFeedAction =
    | {
          type: "OPEN_POST";
          payload: ActiveImageType;
      }
    | {
          type: "CLOSE_POST";
      }
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
          type: "SET_COMMENTS";
          payload: CommentWithAuthor[];
      }
    | {
          type: "SET_COMMENTS_LOADING";
          payload: boolean;
      }
    | {
          type: "SET_COMMENT_TEXT";
          payload: string;
      }
    | {
          type: "SET_LIKE_ANIMATION_INDEX";
          payload: number | null;
      }
    | {
          type: "UPDATE_MODAL_POST";
          payload: Partial<ActiveImageType>;
      };

export const initialState: ImagesFeedState = {
    posts: [],

    feed: {
        loading: true,
        hasMore: true,
        cursor: null,
    },

    modal: {
        isOpen: false,
        post: null,
    },

    comments: {
        items: [],
        loading: false,
        text: "",
    },

    likeAnimationIndex: null,
};

export function imagesFeedReducer(
    state: ImagesFeedState,
    action: ImagesFeedAction
): ImagesFeedState {
    switch (action.type) {
        case "OPEN_POST":
            return {
                ...state,
                modal: {
                    isOpen: true,
                    post: action.payload,
                },
                comments: {
                    ...state.comments,
                    items: [],
                    text: "",
                    loading: false,
                },
            };

        case "CLOSE_POST":
            return {
                ...state,
                modal: {
                    isOpen: false,
                    post: null,
                },
                comments: {
                    ...state.comments,
                    items: [],
                    text: "",
                    loading: false,
                },
                likeAnimationIndex: null,
            };

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

        case "SET_COMMENTS":
            return {
                ...state,
                comments: {
                    ...state.comments,
                    items: action.payload,
                },
            };

        case "SET_COMMENTS_LOADING":
            return {
                ...state,
                comments: {
                    ...state.comments,
                    loading: action.payload,
                },
            };

        case "SET_COMMENT_TEXT":
            return {
                ...state,
                comments: {
                    ...state.comments,
                    text: action.payload,
                },
            };

        case "SET_LIKE_ANIMATION_INDEX":
            return {
                ...state,
                likeAnimationIndex: action.payload,
            };

        case "UPDATE_MODAL_POST":
            if (!state.modal.post) {
                return state;
            }

            return {
                ...state,
                modal: {
                    ...state.modal,
                    post: {
                        ...state.modal.post,
                        ...action.payload,
                    },
                },
            };

        default:
            return state;
    }
}
