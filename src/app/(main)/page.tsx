
"use client"
import ImagesFeed from "@/app/components/Feed/feed";
import { StoriesStrip } from "@/app/components/Stories/stories-strip";
import NotificationBell from "@/app/components/Notifications/NotificationBell";
import { VideoPlaybackProvider } from "@/app/context/VideoPlaybackContext";
import { useFeedScrollRestoration } from "@/app/hooks/scroll-restoration'/useFeedScrollRestoration";

export default function HomePage() {
  const { isRestoring } = useFeedScrollRestoration();
  return (
    <VideoPlaybackProvider>
      <main className="mx-auto flex w-full max-w-155 flex-col gap-0 px-4 py-1 pb-24 md:px-0 md:py-6 md:pb-12">
        <h1 className="sr-only">Briza home feed</h1>

        {/* Home header */}
        <header className="sticky top-0 z-40 flex items-center justify-between w-screen sm:w-full  bg-background py-3 px-5">
          <h2 className="text-xl font-semibold tracking-tight">
            Home
          </h2>

          <NotificationBell />
        </header>

        <StoriesStrip />

        <div
          style={{
            visibility: isRestoring ? "hidden" : "visible",
          }}
        >
          <ImagesFeed />
        </div>
      </main>
    </VideoPlaybackProvider>
  );
}
