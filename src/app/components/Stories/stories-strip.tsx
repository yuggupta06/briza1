import Image from 'next/image'
import { currentUserStoryAvatar, stories } from '@/backend/lib/data'

export function StoriesStrip() {
  return (
    <section
      aria-label="Stories"
      className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 shadow-sm"
    >
      <ul className="custom-scrollbar flex items-center gap-4 overflow-x-auto pb-1">
        <li className="shrink-0">
          <button type="button" className="group flex flex-col items-center gap-1.5">
            <span className="relative block h-16 w-16 rounded-full border border-dashed border-outline p-[2px] transition-colors duration-200 group-hover:border-primary">
              <span className="block h-full w-full overflow-hidden rounded-full bg-surface-container">
                <Image
                  src={currentUserStoryAvatar || '/placeholder.svg'}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </span>
              <span
                aria-hidden="true"
                className="absolute right-0 bottom-0 flex h-4 w-4 items-center justify-center rounded-full border border-surface bg-primary-container text-[10px] font-bold text-on-primary-container"
              >
                +
              </span>
            </span>
            <span className="text-label-sm text-on-surface-variant group-hover:text-on-surface">
              Your Story
            </span>
          </button>
        </li>

        {stories.map((story) => (
          <li key={story.handle} className="shrink-0">
            <button type="button" className="group flex flex-col items-center gap-1.5">
              <span className="block h-16 w-16 rounded-full bg-gradient-to-tr from-secondary-container via-primary-container to-secondary p-[2px] transition-transform duration-200 group-hover:scale-105">
                <span className="block h-full w-full overflow-hidden rounded-full bg-surface p-[2px]">
                  <Image
                    src={story.avatar || '/placeholder.svg'}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
              </span>
              <span className="max-w-16 truncate text-label-sm text-on-surface-variant group-hover:text-on-surface">
                {story.handle}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
