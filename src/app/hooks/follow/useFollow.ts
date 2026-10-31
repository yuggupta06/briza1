
"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import type { ToggleFollowResponse } from "@/types/follow";

export function useFollow(targetUserId: string) {
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFollow = useCallback(async (): Promise<ToggleFollowResponse | null> => {
    if (!targetUserId || isMutating) return null;

    setIsMutating(true);
    setError(null);

    try {
      const response = await axios.post<ToggleFollowResponse>(
        "/api/follow/toggle-follow",
        { targetUserId }
      );

      return response.data;
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Unable to update follow status"
        : "Unable to update follow status";

      setError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [targetUserId, isMutating]);

  return { toggleFollow, isMutating, error };
}
