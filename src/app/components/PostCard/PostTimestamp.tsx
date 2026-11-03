
"use client";

import { useEffect, useRef, useState } from "react";

interface PostTimestampProps {
  createdAt: string | Date;
  displayText: string;
}

export default function PostTimestamp({
  createdAt,
  displayText,
}: PostTimestampProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const date = new Date(createdAt);
  const isValidDate = !Number.isNaN(date.getTime());

  const fullDate = isValidDate
    ? new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date)
    : "";

  const fullTime = isValidDate
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date)
    : "";

  const clearCloseTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearCloseTimeout();
  }, []);

  const handleMouseEnter = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      clearCloseTimeout();
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      setIsOpen(false);
    }
  };

  const handleClick = () => {
    // Desktop uses hover. Touch devices use a temporary click popup.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    clearCloseTimeout();
    setIsOpen(true);

    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      timeoutRef.current = null;
    }, 1000);
  };

  if (!isValidDate) return null;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Post uploaded on ${fullDate} at ${fullTime}`}
        aria-expanded={isOpen}
        className="cursor-pointer text-left text-xs text-outline transition-colors hover:text-on-surface"
      >
        {displayText}
      </button>

      <div
        className={`
          pointer-events-none absolute left-0 top-full z-50 mt-2
          min-w-max rounded-xl border border-outline-variant/30
          bg-surface-container-high px-3 py-2 shadow-xl
          transition-all duration-200 ease-out
          ${
            isOpen
              ? "visible translate-y-0 opacity-100"
              : "invisible -translate-y-1 opacity-0"
          }
        `}
        role="tooltip"
      >
        <p className="text-xs font-semibold text-on-surface">
          {fullDate}
        </p>

        <p className="mt-1 text-[11px] text-on-surface-variant">
          {fullTime}
        </p>
      </div>
    </div>
  );
}
