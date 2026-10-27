"use client";

import useSWR from "swr";
import axios from "axios";
import { UserType } from "@/types/user";


type CurrentUserResponse = {
  user: UserType;
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
    currentUser: data?.user ,
    isLoading,
    error,
    mutateCurrentUser: mutate,
  };
}