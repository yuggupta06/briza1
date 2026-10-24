import { creators, currentUser, currentUserCardAvatar, footerLinks, topics } from '@/backend/lib/data'
import Link from 'next/link'
import { Avatar } from '../ui/avatar'
import { Icon } from '../ui/briza-icon'
import { FollowButton } from '../ui/follow-button'

export function DiscoverySidebar() {
  return (
    <aside
      aria-label="Discover"
      className="custom-scrollbar sticky top-0 hidden h-screen w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-outline-variant/30 p-6 lg:flex"
    >
      <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={currentUserCardAvatar}
            alt={currentUser.avatarAlt}
            size={44}
            className="ring-2 ring-primary/30"
          />
          <div className="flex flex-col">
            <span className="text-label-md font-semibold text-on-surface">{currentUser.name}</span>
            <span className="text-label-sm text-outline">@{currentUser.handle}</span>
          </div>
        </div>
        <button
          type="button"
          className="text-label-sm font-semibold text-primary transition-colors hover:text-on-surface"
        >
          Switch
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-label-md font-semibold text-on-surface-variant">Curated Tastemakers</h2>
          <button
            type="button"
            className="text-label-sm text-outline transition-colors hover:text-primary"
          >
            See All
          </button>
        </div>
        <ul className="flex flex-col gap-3">
          {creators.map((creator) => (
            <li key={creator.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar src={creator.avatar} alt={creator.avatarAlt} size={36} />
                <div className="flex flex-col">
                  <span className="cursor-pointer text-label-md leading-tight text-on-surface hover:underline">
                    {creator.name}
                  </span>
                  <span className="text-label-sm text-outline">{creator.subtitle}</span>
                </div>
              </div>
              <FollowButton name={creator.name} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 border-t border-outline-variant/20 pt-4">
        <h2 className="text-label-md font-semibold text-on-surface-variant">Exhibition Topics</h2>
        <ul className="flex flex-col gap-2.5">
          {topics.map((topic) => (
            <li key={topic.tag}>
              <Link href="#" className="group flex items-center justify-between">
                <span className="flex flex-col">
                  <span className="text-label-md text-on-surface transition-colors group-hover:text-primary">
                    #{topic.tag}
                  </span>
                  <span className="text-label-sm text-outline">{topic.posts}</span>
                </span>
                <Icon
                  name="north_east"
                  className="text-[16px] text-outline transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto flex flex-col gap-3 border-t border-outline-variant/20 pt-6">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-3 gap-y-1 text-label-sm text-outline">
          {footerLinks.map((link, index) => (
            <span key={link} className="flex items-center gap-3">
              <Link href="#" className="transition-colors hover:text-on-surface">
                {link}
              </Link>
              {index < footerLinks.length - 1 && <span aria-hidden="true">•</span>}
            </span>
          ))}
        </nav>
        <p className="text-label-sm text-outline/60">
          {'© 2025 Briza Platform. All creative rights reserved.'}
        </p>
      </footer>
    </aside>
  )
}
