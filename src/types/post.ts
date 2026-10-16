export type PostType = {
  _id: string;
  author: {
    _id: string;
    username: string;
    imageUrl: string;
  };
  postUrl: string;
  postType: string;
  likes: number;
};