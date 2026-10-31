
"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import type { FollowStatusResponse } from "@/types/follow";

export function useFollowStatus(targetUserId?: string) {
  const [data, setData] = useState<FollowStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!targetUserId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<FollowStatusResponse>(
        `/api/follow/status?targetUserId=${encodeURIComponent(targetUserId)}`
      );

      setData(response.data);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "Unable to load follow status"
          : "Unable to load follow status"
      );
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!targetUserId) {
        setData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get<FollowStatusResponse>(
          `/api/follow/status?targetUserId=${encodeURIComponent(targetUserId)}`
        );

        if (active) setData(response.data);
      } catch (err: unknown) {
        if (active) {
          setError(
            axios.isAxiosError(err)
              ? err.response?.data?.message ?? "Unable to load follow status"
              : "Unable to load follow status"
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [targetUserId]);

  return {
    isFollowing: data?.isFollowing ?? false,
    isSelf: data?.isSelf ?? false,
    isLoading,
    error,
    refreshStatus: fetchStatus,
  };
}
