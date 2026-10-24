'use client'

import { cn } from '@/backend/lib/utils';
import { useState } from 'react';

export function FollowButton({ name }: { name: string }) {
  const [following, setFollowing] = useState(false)

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={`${following ? 'Unfollow' : 'Follow'} ${name}`}
      onClick={() => setFollowing((v) => !v)}
      className={cn(
        'rounded-lg border border-outline-variant/30 px-3 py-1 text-label-sm font-medium transition-colors',
        following
          ? 'bg-primary-container text-on-primary-container'
          : 'bg-surface-container-high text-on-surface hover:bg-primary-container hover:text-on-primary-container',
      )}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
