
"use client";

import { currentUser, sidebarNav } from "@/backend/lib/data";
import { cn } from "@/backend/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "../ui/avatar";
import { Icon } from "../ui/briza-icon";

export function SideNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!href || href === "#") return false;

    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col justify-between border-r border-outline-variant/30 bg-surface-container-low p-4 md:flex">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface-container-high text-primary shadow-sm">
            <Icon
              name="filter_vintage"
              filled
              className="text-[20px]"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-headline-md font-bold tracking-tight text-on-surface">
              Briza
            </span>
            <span className="text-label-sm tracking-wider text-outline">
              Curated Visual Exhibition
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main" className="mt-2 flex flex-col gap-1.5">
          {sidebarNav.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-between overflow-hidden rounded-lg px-4 py-3 transition-all duration-200 hover:bg-surface-container hover:text-on-surface active:scale-[0.98]",
                  active
                    ? "bg-surface-container-high font-semibold text-primary shadow-sm"
                    : "font-medium text-on-surface-variant"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    name={item.icon}
                    filled={active}
                    className={cn(
                      "transition-colors duration-200",
                      item.accentIcon && "text-primary"
                    )}
                  />

                  <span className="text-label-md">
                    {item.label}
                  </span>
                </span>

                {item.shortcut && (
                  <kbd className="rounded border border-outline-variant/30 bg-surface-container-highest px-1.5 py-0.5 text-label-sm text-outline">
                    {item.shortcut}
                  </kbd>
                )}

                {item.dot && (
                  <span className="h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20">
                    <span className="sr-only">New activity</span>
                  </span>
                )}

                {item.badge !== undefined && (
                  <span className="rounded-full bg-primary-container px-1.5 py-0.5 text-label-sm font-semibold text-on-primary-container">
                    {item.badge}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* New Post */}
        <Link
          href="/upload"
          className={cn(
            "mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-headline-sm transition-all duration-200 active:scale-[0.98]",
            isActive("/upload")
              ? "bg-primary text-on-primary shadow-sm"
              : "bg-primary-container text-on-primary-container shadow-sm hover:opacity-95"
          )}
        >
          <Icon name="add" className="text-[18px]" />
          <span>New Post</span>
        </Link>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-4">
        <Link
          href="/settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200",
            isActive("/settings")
              ? "bg-surface-container-high font-semibold text-primary"
              : "font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          )}
        >
          <Icon name="settings" />
          <span className="text-label-md">Settings</span>
        </Link>

        {/* Theme indicator */}
        <div className="flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container/60 px-4 py-2 text-on-surface-variant">
          <span className="flex items-center gap-2.5">
            <Icon name="dark_mode" className="text-[18px]" />
            <span className="text-label-sm">Dark Gallery</span>
          </span>

          <span className="rounded border border-primary/20 bg-surface-container-high px-1.5 py-0.5 font-mono text-[10px] text-primary">
            ON
          </span>
        </div>

        {/* Profile */}
        <Link
          href="/profile"
          aria-current={isActive("/profile") ? "page" : undefined}
          className={cn(
            "mt-2 flex items-center justify-between rounded-lg p-2 text-left transition-all duration-200",
            isActive("/profile")
              ? "bg-surface-container-high text-primary"
              : "text-on-surface-variant hover:bg-surface-container"
          )}
        >
          <span className="flex items-center gap-2.5">
            <Avatar
              src={currentUser.avatar}
              alt={currentUser.avatarAlt}
              size={32}
              className="ring-1 ring-outline-variant/40"
            />

            <span className="flex flex-col">
              <span className="text-label-md text-on-surface">
                {currentUser.name}
              </span>
              <span className="text-label-sm text-outline">
                @{currentUser.handle}
              </span>
            </span>
          </span>

          <Icon
            name="more_horiz"
            className="text-[18px] text-outline"
          />

          <span className="sr-only">Account options</span>
        </Link>
      </div>
    </aside>
  );
}
