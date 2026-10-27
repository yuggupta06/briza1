
export interface FollowUser {
  _id: string;
  username: string;
  name: string;
  imageUrl: string;
}

export interface FollowStatusResponse {
  success: boolean;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface ToggleFollowResponse {
  success: boolean;
  message: string;
  isFollowing: boolean;
  followers: number;
  following: number;
}

export interface FollowListResponse {
  success: boolean;
  users: FollowUser[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}
