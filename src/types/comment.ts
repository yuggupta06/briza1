
export type CommentType = {
  _id: string;
  post: string;
  author: string;

  parentCommentId?: string | null;
  replyToCommentId?: string | null;
  replyToUserId?: string | null;
  repliesCount?: number;

  text: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentWithAuthor = Omit<
  CommentType,
  "author"
> & {
  author: {
    _id: string;
    username: string;
    imageUrl: string;
  };

  replyToUser?: {
    _id: string;
    username: string;
  } | null;
};
