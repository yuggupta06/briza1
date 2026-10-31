export type NotificationType = {
  _id: string;
  recipient: string;

  actor: {
    _id: string;
    username: string;
    imageUrl: string;
  };

  type: "follow" | "like" | "comment";

  post: string | null;
  comment: string | null;

  read: boolean;
  createdAt: string;
};