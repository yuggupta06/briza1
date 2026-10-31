"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter,useSearchParams } from "next/navigation";
import { LoaderCircle, UserRoundX } from "lucide-react";
import axios from "axios";

import ProfileCanvas from "@/app/components/User/profile-canvas";
import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import type { UserType } from "@/types/user";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const router = useRouter();
  const searchParams = useSearchParams();
const postId = searchParams.get("post");

  const {
    currentUser,
    isLoading: isCurrentUserLoading,
  } = useCurrentUser();

  const currentUsername = currentUser?.username?.toLowerCase();

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!username || isCurrentUserLoading) return;

    if (currentUsername && currentUsername === username.toLowerCase()) {
  router.replace(
    postId
      ? `/profile?post=${encodeURIComponent(postId)}`
      : "/profile"
  );
  return;
}

    const controller = new AbortController();

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `/api/profile/${encodeURIComponent(username)}`,
          { signal: controller.signal }
        );

        setUser(response.data.user);
      } catch (error) {
        if (controller.signal.aborted) return;

        setUser(null);

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 404
        ) {
          setError("User not found.");
        } else {
          setError("Failed to load profile. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => controller.abort();
  }, [username, currentUsername, isCurrentUserLoading, router, retryCount, postId]);

  if (loading || isCurrentUserLoading) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <LoaderCircle
              className="h-8 w-8 animate-spin text-primary"
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>

          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-foreground">
              Loading profile
            </p>
            <p className="text-sm text-muted-foreground">
              Just a moment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container">
            <UserRoundX
              className="h-7 w-7 text-on-surface-variant"
              aria-hidden="true"
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              {error === "User not found."
                ? "Profile not found"
                : "Unable to load profile"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {error || "This profile may not be available."}
            </p>
          </div>

          {error !== "User not found." && (
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return <ProfileCanvas user={user} isOwner={false} />;
}
