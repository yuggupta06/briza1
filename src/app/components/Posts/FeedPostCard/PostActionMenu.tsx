
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bookmark,
  Check,
  Copy,

  EyeOff,
  Flag,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

type PostActionMenuProps = {
  postId: string;
  saved: boolean;
  onToggleSave: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onHide?: () => void;
  onReport?: () => void;
};

export default function PostActionMenu({
  postId,
  saved,
  onToggleSave,
  isOwner = false,
  onEdit,
  onDelete,
  onHide,
  onReport,
}: PostActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const deleteRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setOpen(false);
    setConfirmDelete(false);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        rootRef.current?.contains(target) ||
        deleteRef.current?.contains(target)
      ) {
        return;
      }

      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => {
      setMessage("");
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/post/${postId}`
      );

      setCopied(true);
      setMessage("Link copied to clipboard");

      window.setTimeout(() => setCopied(false), 1500);
      closeMenu();
    } catch {
      setMessage("Couldn't copy the link. Please try again.");
    }
  };

  const handleAction = (
    callback: (() => void) | undefined,
    unavailableMessage: string
  ) => {
    if (!callback) {
      setMessage(unavailableMessage);
      return;
    }

    callback();
    closeMenu();
  };
  const handleDesktopMouseEnter = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      setOpen(true);
    }
  };

  const handleDesktopMouseLeave = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      setOpen(false);
      setConfirmDelete(false);
    }
  };
  const handleDelete = () => {
    if (!onDelete) {
      setMessage("Delete action isn't connected yet.");
      setConfirmDelete(false);
      return;
    }

    onDelete();
    closeMenu();
  };

  const menuItems = (
    <>
      <MenuItem
        icon={<Bookmark size={18} />}
        label={saved ? "Remove from saved" : "Save post"}
        onClick={() => {
          onToggleSave();
          closeMenu();
        }}
        active={saved}
      />

      <MenuItem
        icon={copied ? <Check size={18} /> : <Copy size={18} />}
        label="Copy link"
        onClick={() => void copyLink()}
      />

      <div className="my-1 h-px bg-neutral-800" />

      <MenuItem
        icon={<EyeOff size={18} />}
        label="Hide post"
        onClick={() =>
          handleAction(onHide, "Hide action isn't connected yet.")
        }
      />

      <MenuItem
        icon={<Flag size={18} />}
        label="Report post"
        onClick={() =>
          handleAction(onReport, "Report action isn't connected yet.")
        }
      />

      {isOwner && (
        <>
          <div className="my-1 h-px bg-neutral-800" />

          <MenuItem
            icon={<Pencil size={18} />}
            label="Edit post"
            onClick={() =>
              handleAction(onEdit, "Edit action isn't connected yet.")
            }
          />

          <MenuItem
            icon={<Trash2 size={18} />}
            label="Delete post"
            destructive
            onClick={() => setConfirmDelete(true)}
          />
        </>
      )}
    </>
  );

  return (
    <>
      <div
        ref={rootRef}
        className="relative"
        onMouseEnter={handleDesktopMouseEnter}
        onMouseLeave={handleDesktopMouseLeave}
      >
        {/* Your existing menu trigger button */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Post actions"
          className="group rounded-full p-2 transition-colors hover:bg-neutral-800 cursor-pointer"
        >
          <MoreHorizontal
            size={20}
            className={`
      transition-transform duration-300 ease-in-out
      group-hover:rotate-90
      ${open ? "rotate-90" : "rotate-0"}
    `}
          />
        </button>

        {/* Desktop dropdown */}
        <div
          className={`
      absolute right-0 top-full z-40 hidden w-64 pt-2 md:block
      transition-all duration-200 ease-out
      ${open
              ? "visible opacity-100"
              : "invisible pointer-events-none opacity-0"
            }
    `}
          aria-hidden={!open}
        >
          <div
            className={`
        origin-top-right rounded-2xl border border-neutral-800
        bg-neutral-950 p-2 text-white shadow-2xl
        transition-all duration-200 ease-out
        ${open
                ? "translate-y-0 scale-100"
                : "-translate-y-2 scale-[0.98]"
              }
      `}
          >
            {menuItems}
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-100 md:hidden">
          <button
            type="button"
            aria-label="Close post options"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full cursor-pointer
              animate-in fade-in duration-200 bg-black/65 backdrop-blur-[3px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Post options"
            className="absolute inset-x-0 bottom-0
              animate-in slide-in-from-bottom-8 fade-in duration-200
              rounded-t-3xl border border-neutral-800 bg-neutral-950
              px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]
              pt-3 text-white shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />

            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                <h2 className="text-base font-semibold">Post options</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Choose an action
                </p>
              </div>

              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="flex h-10 w-10 cursor-pointer items-center
                  justify-center rounded-full text-neutral-400
                  transition hover:bg-neutral-800 hover:text-white
                  active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {menuItems}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          ref={deleteRef}
          className="fixed inset-0 z-120 flex items-center justify-center
            bg-black/75 p-4 backdrop-blur-sm"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-post-title"
            aria-describedby="delete-post-description"
            className="w-full max-w-sm animate-in fade-in zoom-in-95
              duration-200 rounded-3xl border border-neutral-800
              bg-neutral-950 p-6 text-white shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center
              rounded-2xl bg-rose-500/10 text-rose-400">
              <ShieldAlert size={25} />
            </div>

            <h2
              id="delete-post-title"
              className="text-lg font-semibold"
            >
              Delete this post?
            </h2>

            <p
              id="delete-post-description"
              className="mt-2 text-sm leading-6 text-neutral-400"
            >
              This action may permanently remove your post. Make sure
              you want to continue.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 cursor-pointer rounded-xl border
                  border-neutral-700 px-4 py-3 text-sm font-medium
                  transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 cursor-pointer rounded-xl bg-rose-600
                  px-4 py-3 text-sm font-semibold text-white
                  transition hover:bg-rose-500 active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small action feedback */}
      {message && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-130
            -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2
            duration-200 rounded-full border border-neutral-700
            bg-neutral-900 px-4 py-3 text-center text-sm text-white
            shadow-xl"
        >
          {message}
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive = false,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-11 w-full cursor-pointer
        items-center gap-3 rounded-xl px-3 py-3 text-left text-sm
        font-medium transition-all duration-150
        hover:translate-x-0.5 active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-violet-400
        ${destructive
          ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          : active
            ? "bg-violet-500/10 text-violet-300 hover:bg-violet-500/15"
            : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
        }`}
    >
      <span
        className={`transition-transform duration-150 group-hover:scale-110 ${destructive ? "" : "group-hover:text-violet-300"
          }`}
      >
        {icon}
      </span>

      <span className="flex-1">{label}</span>

      <span className="text-neutral-600 transition-transform duration-150 group-hover:translate-x-0.5">
        →
      </span>
    </button>
  );
}
