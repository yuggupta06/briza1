"use client";

import { useState } from "react";

import FollowListModal from "@/app/components/follow/FollowListModal";
import type { FollowPreview } from "@/types/follow";
type FollowListType = "followers" | "following";

interface FollowStatsProps {
  username: string;
  followers: number;
  following: number;
  followerPreviews: FollowPreview[];
  followingPreviews: FollowPreview[];
}

export default function FollowStats({
  username,
  followers,
  following,
  followerPreviews,
  followingPreviews
}: FollowStatsProps) {
  const [activeList, setActiveList] = useState<FollowListType | null>(
    null
  );
  const renderAvatars = (users: FollowPreview[]) => (
  <div className="flex -space-x-2">
    {users.slice(0, 3).map((user) => (
      <img
        key={user._id}
        src={user.imageUrl || "/default-avatar.png"}
        alt={user.username}
        className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-black"
      />
    ))}
  </div>
);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
  type="button"
  onClick={() => setActiveList("followers")}
  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
>
  {renderAvatars(followerPreviews)}

  <div className="flex flex-col">
    <span className="text-sm font-semibold">{followers}</span>
    <span className="text-xs text-neutral-500">Followers</span>
  </div>
</button>

        <button
  type="button"
  onClick={() => setActiveList("following")}
  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
>
  {renderAvatars(followingPreviews)}

  <div className="flex flex-col">
    <span className="text-sm font-semibold">{following}</span>
    <span className="text-xs text-neutral-500">Following</span>
  </div>
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