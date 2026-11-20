import { Types } from "mongoose";

export interface PopulatedUserType {
  _id: Types.ObjectId;
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