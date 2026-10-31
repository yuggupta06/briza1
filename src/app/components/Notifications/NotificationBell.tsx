
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Check, Clock3, X,Trash2 } from "lucide-react";
import {  useNotifications } from "@/app/hooks/useNotifications";
import { NotificationType } from "@/types/notification";
import { formatDate } from "@/backend/lib/post-card-utils";

type Tab = "all" | "unread";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

const handleDeleteNotification = async (
  notificationId: string
) => {
  if (deletingId) return;

  setDeletingId(notificationId);

  try {
    await deleteNotification(notificationId);
  } catch (error) {
    console.error("Failed to delete notification:", error);
  } finally {
    setDeletingId(null);
  }
};
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    markAsRead,
    deleteNotification
  } = useNotifications();

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);
  const handleNotificationClick = async (
  notification: NotificationType
) => {
  if (!notification.read) {
    await markAsRead(notification._id);
  }

  closeDrawer();
};

  // Lock background scrolling while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeDrawer]);

  // Automatically load another page near the bottom.
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading || isLoadingMore) {
      return;
    }

    const root = listRef.current;
    const sentinel = sentinelRef.current;

    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        root,
        rootMargin: "0px 0px 160px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    isOpen,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
    notifications.length,
    activeTab,
  ]);

  const visibleNotifications = notifications.filter(
    (notification) =>
      activeTab === "all" || !notification.read
  );

  return (
    <>
      {/* Bell */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex h-10 w-10 shrink-0 items-center
          justify-center rounded-full text-gray-700 transition
          hover:bg-gray-100 dark:text-gray-200
          dark:hover:bg-white/10"
      >
        <Bell size={22} strokeWidth={1.8} />

        {unreadCount > 0 && (
          <span
            className="absolute right-0.5 top-0.5 flex h-[18px]
              min-w-[18px] items-center justify-center rounded-full
              bg-blue-600 px-1 text-[10px] font-semibold text-white
              ring-2 ring-white dark:ring-[#111]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex justify-end"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDrawer();
            }
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Responsive drawer */}
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            className="relative flex h-[100dvh] w-full flex-col
              overflow-hidden border-l border-gray-200 bg-white
              shadow-2xl dark:border-white/10 dark:bg-[#111]
              sm:my-3 sm:mr-3 sm:h-[calc(100dvh-24px)]
              sm:w-[min(420px,calc(100vw-24px))]
              sm:rounded-2xl"
          >
            {/* Header */}
            <header
              className="flex shrink-0 items-center justify-between
                border-b border-gray-100 px-5 py-4
                dark:border-white/10 sm:px-6 sm:py-5"
            >
              <div>
                <h2
                  id="notification-title"
                  className="text-lg font-semibold tracking-tight
                    text-gray-900 dark:text-white"
                >
                  Notifications
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Stay updated with your activity
                </p>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close notifications"
                className="flex h-9 w-9 items-center justify-center
                  rounded-full text-gray-500 transition
                  hover:bg-gray-100 hover:text-gray-900
                  dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </header>

            {/* Tabs */}
            <div
              className="flex shrink-0 gap-6 border-b border-gray-100
                px-5 dark:border-white/10 sm:px-6"
            >
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`relative py-3 text-sm font-medium transition ${
                  activeTab === "all"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                All

                {activeTab === "all" && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5
                      rounded-full bg-blue-600 dark:bg-blue-400"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`relative flex items-center gap-2 py-3
                  text-sm font-medium transition ${
                    activeTab === "unread"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                Unread

                {unreadCount > 0 && (
                  <span
                    className="rounded-full bg-blue-50 px-2 py-0.5
                      text-[11px] font-semibold text-blue-600
                      dark:bg-blue-500/15 dark:text-blue-400"
                  >
                    {unreadCount}
                  </span>
                )}

                {activeTab === "unread" && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5
                      rounded-full bg-blue-600 dark:bg-blue-400"
                  />
                )}
              </button>
            </div>

            {/* Scrollable list */}
            <div
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto
                overscroll-contain"
            >
              {isLoading ? (
                <div className="space-y-4 p-5 sm:p-6">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="flex animate-pulse gap-3"
                    >
                      <div className="h-11 w-11 shrink-0 rounded-full
                        bg-gray-200 dark:bg-white/10"
                      />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-4/5 rounded bg-gray-200
                          dark:bg-white/10"
                        />
                        <div className="h-3 w-1/3 rounded bg-gray-100
                          dark:bg-white/5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center
                  justify-center px-6 text-center"
                >
                  <Bell size={30} className="mb-3 text-gray-400" />

                  <p className="font-medium text-gray-900 dark:text-white">
                    Could not load notifications
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Please try again.
                  </p>
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="flex h-full flex-col items-center
                  justify-center px-8 text-center"
                >
                  <div
                    className="mb-4 flex h-16 w-16 items-center
                      justify-center rounded-full bg-blue-50
                      text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  >
                    {activeTab === "unread" ? (
                      <Check size={28} />
                    ) : (
                      <Bell size={28} />
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {activeTab === "unread"
                      ? "You're all caught up"
                      : "No notifications yet"}
                  </h3>

                  <p className="mt-2 max-w-[250px] text-sm leading-6
                    text-gray-500 dark:text-gray-400"
                  >
                    {activeTab === "unread"
                      ? "There are no unread notifications right now."
                      : "When someone follows you or interacts with your posts, you'll see it here."}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  
{visibleNotifications.map((notification: NotificationType) => (
  <div
    key={notification._id}
    className="group flex items-center gap-1 transition
      hover:bg-gray-50 dark:hover:bg-white/[0.04]"
  >
  
<Link
  href={
    notification.type === "follow"
      ? `/profile/${notification.actor.username}`
      : notification.post
        ? notification.type === "comment" && notification.comment
          ? `/profile?post=${notification.post}`
          : `/profile?post=${notification.post}`
        : `/profile/${notification.actor.username}`
  }
  onClick={() => {
    void handleNotificationClick(notification);
  }}
  className={`flex min-w-0 flex-1 gap-3 px-5 py-4 sm:px-6 ${
    !notification.read
      ? "bg-blue-50/70 dark:bg-blue-500/[0.07]"
      : ""
  }`}
>
  {notification.actor.imageUrl ? (
    <Image
      src={notification.actor.imageUrl}
      alt={notification.actor.username}
      width={44}
      height={44}
      unoptimized
      className="h-11 w-11 shrink-0 rounded-full border border-gray-100 object-cover dark:border-white/10"
    />
  ) : (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
    >
      {notification.actor.username.slice(0, 1).toUpperCase()}
    </div>
  )}

  <div className="min-w-0 flex-1 pt-0.5">
    <p className="text-[13px] leading-5 text-gray-700 dark:text-gray-200">
      <span className="font-semibold text-gray-900 dark:text-white">
        {notification.actor.username}
      </span>{" "}

      {notification.type === "follow"
        ? "started following you."
        : notification.type === "like"
          ? "liked your post."
          : notification.type === "comment"
            ? "commented on your post."
            : "interacted with you."}
    </p>

    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <Clock3 size={12} />
      {formatDate(notification.createdAt)}
    </p>
  </div>

  {!notification.read && (
    <span
      aria-label="Unread"
      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600"
    />
  )}
</Link>


    <button
      type="button"
      aria-label={`Delete notification from ${notification.actor.username}`}
      title="Delete notification"
      disabled={deletingId !== null}
      onClick={() => {
        void handleDeleteNotification(notification._id);
      }}
      className="mr-3 flex h-9 w-9 shrink-0 items-center
        justify-center rounded-full text-gray-400
        opacity-100 transition
        hover:bg-red-50 hover:text-red-600
        dark:hover:bg-red-500/10 dark:hover:text-red-400
        disabled:cursor-not-allowed disabled:opacity-40
        sm:mr-4 sm:opacity-0 sm:group-hover:opacity-100
        sm:focus-visible:opacity-100"
    >
      {deletingId === notification._id ? (
        <span
          className="h-4 w-4 animate-spin rounded-full
            border-2 border-current border-t-transparent"
        />
      ) : (
        <Trash2 size={17} />
      )}
    </button>
  </div>
))}

                </div>
              )}

              {/* Pagination sentinel */}
              {!isLoading && !error && (
                <div
                  ref={sentinelRef}
                  className="flex min-h-4 items-center justify-center"
                >
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 py-4
                      text-xs text-gray-500"
                    >
                      <span className="h-4 w-4 animate-spin rounded-full
                        border-2 border-gray-300 border-t-blue-600"
                      />
                      Loading more notifications...
                    </div>
                  )}
                </div>
              )}

              {!isLoading &&
                !error &&
                !hasMore &&
                notifications.length > 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">
                    You are all caught up.
                  </p>
                )}
            </div>

            {/* Footer */}
            <footer
              className="shrink-0 border-t border-gray-100 px-5 py-3
                dark:border-white/10 sm:px-6"
            >
              <p className="text-center text-xs text-gray-400">
                Stay connected with Briza.
              </p>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
