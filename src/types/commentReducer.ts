import type { UserComment } from "@/types/types"; // adjust this import to your project

export type CommentState = {
  commentArray: UserComment[];
  comment: string;
  commentBoxshow: boolean;
};

export type CommentAction =
  | {
      type: "SET_COMMENTS";
      payload: UserComment[];
    }
  | {
      type: "SET_COMMENT";
      payload: string;
    }
  | {
      type: "SHOW_COMMENT_BOX";
    }
  | {
      type: "HIDE_COMMENT_BOX";
    };

export const initialCommentState: CommentState = {
  commentArray: [],
  comment: "",
  commentBoxshow: false,
};

export function commentReducer(
  state: CommentState,
  action: CommentAction
): CommentState {
  switch (action.type) {
    case "SET_COMMENTS":
      return {
        ...state,
        commentArray: action.payload,
      };

    case "SET_COMMENT":
      return {
        ...state,
        comment: action.payload,
      };

    case "SHOW_COMMENT_BOX":
      return {
        ...state,
        commentBoxshow: true,
      };

    case "HIDE_COMMENT_BOX":
      return {
        ...state,
        commentBoxshow: false,
      };

    default:
      return state;
  }
}