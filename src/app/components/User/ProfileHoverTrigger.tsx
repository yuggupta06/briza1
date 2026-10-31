
"use client";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { FALLBACK_AVATAR, formatCount } from "@/backend/lib/post-card-utils";
import type { UserType } from "@/types/user";

interface ProfileHoverTriggerProps {
  username: string;
  children: ReactNode;
}

type PreviewUser = Pick<
  UserType,
  "_id" | "name" | "username" | "imageUrl" | "followers" | "following"
>;

// Shared cache prevents duplicate requests from multiple triggers.
const profileCache = new Map<string, PreviewUser>();

const pendingRequests = new Map<string, Promise<PreviewUser>>();

async function getProfile(username: string): Promise<PreviewUser> {
  const key = username.toLowerCase();

  const cached = profileCache.get(key);
  if (cached) return cached;

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = axios
    .get(`/api/profile/${encodeURIComponent(username)}`)
    .then((response) => {
      const user = response.data.user as PreviewUser;
      profileCache.set(key, user);
      return user;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
}

export default function ProfileHoverTrigger({
  username,
  children,
}: ProfileHoverTriggerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canHover, setCanHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<PreviewUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    above: false,
  });

  useEffect(() => {
    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const update = () => setCanHover(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  const updatePosition = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cardWidth = 288;
    const cardHeight = 190;

    const left = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - cardWidth - 12)
    );

    const above = rect.bottom + cardHeight + 12 > window.innerHeight;

    setPosition({
      left,
      top: above
        ? rect.top - 8
        : rect.bottom + 8,
      above,
    });
  }, []);

  const cancelTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openCard = useCallback(() => {
    if (!canHover) return;

    cancelTimers();
    updatePosition();

    openTimerRef.current = setTimeout(() => {
      setOpen(true);
    }, 300);
  }, [canHover, cancelTimers, updatePosition]);

  const closeCard = useCallback(() => {
    cancelTimers();

    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 180);
  }, [cancelTimers]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      const cached = profileCache.get(username.toLowerCase());

      if (cached) {
        setProfile(cached);
        return;
      }

      setLoading(true);

      try {
        const user = await getProfile(username);

        if (!cancelled) setProfile(user);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, username]);

  useEffect(() => {
    if (!open) return;

    const handlePosition = () => updatePosition();

    window.addEventListener("scroll", handlePosition, true);
    window.addEventListener("resize", handlePosition);

    return () => {
      window.removeEventListener("scroll", handlePosition, true);
      window.removeEventListener("resize", handlePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    return () => cancelTimers();
  }, [cancelTimers]);

  return (
    <>
      <div
        ref={wrapperRef}
        onMouseEnter={openCard}
        onMouseLeave={closeCard}
        className="inline-flex min-w-0"
      >
        {children}
      </div>

      {open &&
        canHover &&
        createPortal(
          <div
            onMouseEnter={() => {
              cancelTimers();
              updatePosition();
            }}
            onMouseLeave={closeCard}
            style={{
              position: "fixed",
              left: position.left,
              top: position.above ? undefined : position.top,
              bottom: position.above
                ? window.innerHeight - position.top
                : undefined,
              zIndex: 9999,
              width: 288,
            }}
            className="overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 text-white shadow-2xl"
          >
            {loading ? (
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 animate-pulse rounded-full bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-neutral-800" />
                    <div className="h-3 w-20 animate-pulse rounded bg-neutral-800" />
                  </div>
                </div>
                <div className="h-8 animate-pulse rounded bg-neutral-800" />
              </div>
            ) : profile ? (
              <Link
                href={`/profile/${encodeURIComponent(profile.username)}`}
                className="block p-4 transition hover:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={profile.imageUrl || FALLBACK_AVATAR}
                    alt={`${profile.username}'s avatar`}
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 rounded-full border border-neutral-700 object-cover"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {profile.name}
                    </p>
                    <p className="truncate text-xs text-neutral-400">
                      @{profile.username}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-6">
                  <p className="text-sm">
                    <span className="font-semibold">
                      {formatCount(profile.followers ?? 0)}
                    </span>
                    <span className="ml-1 text-neutral-400">
                      followers
                    </span>
                  </p>

                  <p className="text-sm">
                    <span className="font-semibold">
                      {formatCount(profile.following ?? 0)}
                    </span>
                    <span className="ml-1 text-neutral-400">
                      following
                    </span>
                  </p>
                </div>

                <p className="mt-4 text-center text-xs text-neutral-400">
                  View profile →
                </p>
              </Link>
            ) : (
              <p className="p-4 text-sm text-neutral-400">
                Unable to load profile.
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
