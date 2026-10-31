
"use client";

import { useState } from "react";

import FollowListModal from "@/app/components/follow/FollowListModal";
import type { FollowListType } from "@/app/hooks/follow/useFollowList";

interface FollowStatsProps {
  username: string;
  followers: number;
  following: number;
}

export default function FollowStats({
  username,
  followers,
  following,
}: FollowStatsProps) {
  const [activeList, setActiveList] = useState<FollowListType | null>(
    null
  );

  return (
    <>
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => setActiveList("followers")}
          className="text-sm cursor-pointer "
        >
          <strong>{followers}</strong>{" "}
          <span className="text-neutral-500 hover:text-gray-400 transition-colors duration-200">followers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveList("following")}
          className="text-sm cursor-pointer "
        >
          <strong>{following}</strong>{" "}
          <span className="text-neutral-500 hover:text-gray-400 transition-colors duration-200">following</span>
        </button>
      </div>

      {activeList && (
        <FollowListModal
          username={username}
          type={activeList}
          onClose={() => setActiveList(null)}
        />
      )}
    </>
  );
}
