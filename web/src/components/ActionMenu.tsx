"use client";

import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { buttonClassName } from "@/components/ui/Button";

/**
 * A disclosure menu for the rarely used actions, so they do not compete with
 * the page's one primary action. Closes on Escape (focus returns to the
 * button), on a click outside, and when an item is chosen.
 */
export function ActionMenu({
  label,
  children,
  triggerClassName,
}: {
  label: string;
  children: ReactNode;
  /** Replaces the default secondary-button look, e.g. for a trigger on the charcoal header. */
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName ?? buttonClassName("secondary")}
      >
        {label}
        <CaretDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={panelId}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className="absolute right-0 z-30 mt-2 flex w-64 flex-col rounded-lg border border-control-border bg-card p-1 shadow-mm-float"
        >
          {children}
        </ul>
      )}
    </div>
  );
}

export function ActionMenuItem({
  href,
  icon,
  current = false,
  children,
}: {
  href: string;
  icon?: ReactNode;
  /** The screen the person is on: marked with `aria-current` and a bar, not colour alone. */
  current?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={`flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm font-bold text-foreground hover:bg-muted ${
          current ? "border-l-[3px] border-foreground bg-muted pl-[9px]" : ""
        }`}
      >
        {icon}
        {children}
      </Link>
    </li>
  );
}
