export type CommentType = {
  _id: string;
  postId: string;
  author: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentWithAuthor = Omit<CommentType, "author"> & {
  author: {
    _id: string;
    username: string;
    imageUrl: string;
  };
};