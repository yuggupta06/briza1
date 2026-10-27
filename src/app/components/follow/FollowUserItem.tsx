
"use client";

import Image from "next/image";
import Link from "next/link";

import FollowButton from "@/app/components/follow/FollowButton";
import type { FollowUser } from "@/types/follow";

interface FollowUserItemProps {
  user: FollowUser;
}

export default function FollowUserItem({
  user,
}: FollowUserItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <Link
        href={`/profile/${encodeURIComponent(user.username)}`}
        className="flex min-w-0 items-center gap-3"
      >
        <Image
          src={user.imageUrl}
          alt={`${user.username}'s profile`}
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-full object-cover"
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.username}</p>
          <p className="truncate text-sm text-neutral-500">{user.name}</p>
        </div>
      </Link>

      <FollowButton targetUserId={user._id} />
    </div>
  );
}
