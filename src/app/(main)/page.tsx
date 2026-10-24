
import ImagesFeed from '@/app/components/ImagesFeed/imagesFeed'
import { StoriesStrip } from '@/app/components/Stories/stories-strip'

export default function HomePage() {
  return (
    <main className="flex w-full max-w-[620px] flex-col gap-8 px-4 py-6 pb-24 md:px-0 md:pb-12">
      <h1 className="sr-only">Briza home feed</h1>

      <StoriesStrip />

      <ImagesFeed />
    </main>
  )
}
