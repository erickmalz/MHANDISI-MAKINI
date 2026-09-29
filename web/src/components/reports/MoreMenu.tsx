"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

import { buttonClassName } from "@/components/ui/Button";

export interface MoreMenuItem {
  label: string;
  /** A second, quieter line, e.g. "Best for long reports". */
  hint?: string;
  href: string;
  /** Plain download (Export) vs. open in a new tab (Print). */
  mode: "download" | "new-tab";
}

/**
 * The "More ▾" menu (Report toolbar layout, variant A): Export PDF / JPG / CSV
 * and Print. Every item is a plain link, so it works without JavaScript once
 * open; the script only handles open/close, Escape, outside clicks and arrow
 * keys, returning focus to the trigger on close.
 */
export function MoreMenu({ label, items }: { label: string; items: MoreMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLAnchorElement>('[role="menuitem"]')?.focus();
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const links = [
      ...(root.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []),
    ];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === "ArrowDown" ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
    links[next]?.focus();
  }

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className={buttonClassName("secondary", "px-4")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <CaretDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-20 mt-2 flex w-64 flex-col rounded-lg border border-border bg-card p-1 shadow-xl"
        >
          {items.map((item) => (
            <a
              key={item.href + item.label}
              role="menuitem"
              href={item.href}
              {...(item.mode === "download"
                ? { download: "" }
                : { target: "_blank", rel: "noopener" })}
              onClick={() => setOpen(false)}
              className="flex min-h-12 flex-col justify-center rounded-md px-3 py-2 text-base font-bold text-card-foreground hover:bg-muted focus-visible:bg-muted"
            >
              {item.label}
              {item.hint && (
                <span className="text-sm font-normal text-muted-foreground">{item.hint}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
