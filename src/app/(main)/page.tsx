
import ImagesFeed from "@/app/components/ImagesFeed/imagesFeed";
import { StoriesStrip } from "@/app/components/Stories/stories-strip";
import NotificationBell from "@/app/components/Notifications/NotificationBell";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-[620px] flex-col gap-6 px-4 py-4 pb-24 md:px-0 md:py-6 md:pb-12">
      <h1 className="sr-only">Briza home feed</h1>

      {/* Home header */}
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Home
        </h2>

        <NotificationBell />
      </header>

      <StoriesStrip />

      <ImagesFeed />
    </main>
  );
}
