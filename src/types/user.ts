

export interface PopulatedUserType {
  _id: string;
  username: string;
  imageUrl: string;
}
export type UserType =PopulatedUserType & {
  name: string;
  email: string;
  followers: number;
  following: number;
  totalPosts?: number;
};