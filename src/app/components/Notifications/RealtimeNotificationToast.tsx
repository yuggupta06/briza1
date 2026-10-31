
"use client";

import { useRealtimeEvent } from "@/app/hooks/useRealtimeEvent";
import { NotificationType } from "@/types/notification";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ToastData = {
    id: string;
    username: string;
    message: string;
    imageUrl: string;
    type: NotificationType["type"];
    post: string | null;
    comment: string | null;
};

export default function RealtimeNotificationToast() {
    const [toast, setToast] = useState<ToastData | null>(null);

    const handleNotification = useCallback(
        ({ notification }: { notification: NotificationType }) => {
            const { actor, type } = notification;

            const messages: Record<NotificationType["type"], string> = {
                follow: "started following you",
                like: "liked your post",
                comment: "commented on your post",
            };

            setToast({
                id: notification._id,
                username: actor.username,
                message: `${actor.username} ${messages[type]}`,
                imageUrl: actor.imageUrl || "/placeholder.svg",
                type: notification.type,
                post: notification.post ?? null,
                comment: notification.comment ?? null,
            });
        },
        []
    );

    useRealtimeEvent("new-notification", handleNotification);

    // Automatically dismiss the toast after 4 seconds.
    useEffect(() => {
        if (!toast) return;

        const timer = window.setTimeout(() => {
            setToast(null);
        }, 4000);

        return () => window.clearTimeout(timer);
    }, [toast]);

    if (!toast) return null;

    // Determine where the notification should navigate.

    const notificationHref =
  toast.type === "follow"
    ? `/profile/${encodeURIComponent(toast.username)}`
    : toast.type=="like"
      ? `/profile?post=${toast.post}`
      :`/profile?post=${toast.post}`

    return (
        <div className="fixed right-4 top-4 z-100 w-[calc(100%-2rem)] max-w-sm">
            <div className="flex items-center gap-3 rounded-xl border bg-background p-4 shadow-xl">

                <Link
                    href={notificationHref}
                    onClick={() => setToast(null)}
                    aria-label={
                        toast.type === "follow"
                            ? `View ${toast.username}'s profile`
                            : "View notification post"
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Image
                        src={toast.imageUrl}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />

                    <p className="min-w-0 flex-1 text-sm font-medium">
                        {toast.message}
                    </p>
                </Link>

                <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => setToast(null)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                    ✕
                </button>

            </div>
        </div>
    );
}
