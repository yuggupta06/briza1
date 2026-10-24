
"use client";

import { mobileNav } from "@/backend/lib/data";
import { cn } from "@/backend/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/briza-icon";

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!href || href === "#") return false;

    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Mobile"
      className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant/30 bg-surface/80 px-4 shadow-2xl backdrop-blur-xl md:hidden"
    >
      {mobileNav.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg px-3 py-1 transition-all duration-200 active:scale-95",
              active
                ? "bg-surface-container-high font-medium text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Icon
              name={item.icon}
              filled={active}
              className={cn(
                "transition-colors duration-200",
                item.accentIcon && "text-primary"
              )}
            />

            <span className="text-label-sm">{item.label}</span>

            {item.dot && (
              <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-surface">
                <span className="sr-only">New messages</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
