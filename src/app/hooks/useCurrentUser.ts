
"use client";

import useSWR from "swr";
import axios from "axios";

import type { UserType } from "@/types/user";
import type { FollowPreview } from "@/types/follow";

type CurrentUserResponse = {
  success: boolean;
  user: UserType;
  followerPreviews: FollowPreview[];
  followingPreviews: FollowPreview[];
};

const fetchCurrentUser = async (
  url: string
): Promise<CurrentUserResponse> => {
  const { data } = await axios.get<CurrentUserResponse>(url, {
    withCredentials: true,
  });

  return data;
};

export function useCurrentUser() {
  const { data, error, isLoading, mutate } =
    useSWR<CurrentUserResponse>(
      "/api/profile/me",
      fetchCurrentUser,
      {
        revalidateOnFocus: false,
        revalidateIfStale: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60_000,
      }
    );

  return {
    currentUser: data?.user,

    followerPreviews: data?.followerPreviews ?? [],
    followingPreviews: data?.followingPreviews ?? [],

    isLoading,
    error,
    mutateCurrentUser: mutate,
  };
}
