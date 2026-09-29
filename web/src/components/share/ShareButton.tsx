"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CircleNotch, ShareNetwork } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useT } from "@/lib/i18n/client";

import { fetchShareFile } from "./fetch-share-file";
import {
  actionForTap,
  canShareFiles,
  classifyShareError,
  nextItemState,
  type ItemState,
  type ShareFormat,
} from "./share-logic";

/**
 * Share a file to the phone's share sheet (ticket "What 'share' means for a
 * report"). It sends the file itself, never a link, with a `title` only.
 *
 * - Hidden entirely where the browser cannot share files (checked after
 *   hydration, so server and first client render agree).
 * - The Engineer picks a format. Tapping it fetches that one file; if it
 *   arrives inside the tap's activation window the sheet opens straight away,
 *   otherwise the item turns into "Ready: tap to share" for a second tap.
 * - Fetched files are kept for the visit, keyed by URL, so sharing again is
 *   instant. New URLs (e.g. a changed filter) discard the old files.
 * - Closing the sheet is silent; any other failure downloads the same file.
 *
 * Takes plain file URLs, so Issued Documents can reuse it unchanged.
 */
export interface ShareFile {
  format: ShareFormat;
  /** Menu label, e.g. "PDF". */
  label: string;
  href: string;
  filename: string;
}

export function ShareButton({
  files,
  title,
  variant = "primary",
}: {
  files: ShareFile[];
  /** Sent as the share `title` only (no text), e.g. "Procurement — PRJ-2026-001". */
  title: string;
  variant?: "primary" | "secondary";
}) {
  const t = useT();
  const menuId = useId();
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const cache = useRef(new Map<string, File>());
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Feature-test after hydration: the server can't know, and rendering the
  // button on the server only to remove it would flash.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot browser capability read
    setSupported(canShareFiles(navigator));
  }, []);

  // New URLs (a filter changed) make every kept file stale.
  const hrefKey = files.map((f) => f.href).join("|");
  useEffect(() => {
    cache.current.clear();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per-file state when the file set changes
    setStates({});
  }, [hrefKey]);

  // Close on a tap outside the control.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  if (!supported || files.length === 0) return null;

  const setState = (href: string, state: ItemState) =>
    setStates((prev) => ({ ...prev, [href]: state }));

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setNotice(t("share.downloaded"));
  }

  // Must be called synchronously from the tap (or within its activation window).
  function shareNow(file: File, href: string) {
    navigator
      .share({ files: [file], title })
      .then(() => {
        setState(href, nextItemState(states[href] ?? "idle", { type: "shared" }));
        setOpen(false);
      })
      .catch((error: unknown) => {
        setState(href, "idle");
        if (classifyShareError(error) === "fallback") download(file);
      });
  }

  async function select(item: ShareFile) {
    setNotice(null);
    const state = states[item.href] ?? "idle";
    const cached = cache.current.get(item.href);
    const action = actionForTap(state, cached != null);
    if (action === "wait") return;
    if (action === "share" && cached) {
      shareNow(cached, item.href);
      return;
    }

    setState(item.href, nextItemState(state, { type: "tap", cached: false }));
    try {
      const { file, inTime } = await fetchShareFile(item);
      cache.current.set(item.href, file);
      setState(item.href, nextItemState("fetching", { type: "fetched", inTime }));
      if (inTime) shareNow(file, item.href);
    } catch {
      setState(item.href, nextItemState("fetching", { type: "fetch-failed" }));
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <Button
        ref={triggerRef}
        type="button"
        variant={variant}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <ShareNetwork size={20} aria-hidden="true" />
        {t("share.action")}
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("share.menuLabel")}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-30 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {files.map((item, index) => {
            const state = states[item.href] ?? "idle";
            const sub =
              state === "fetching"
                ? t("share.preparing")
                : state === "ready"
                  ? t("share.ready")
                  : state === "failed"
                    ? t("share.retry")
                    : t(`share.hints.${item.format}`);
            return (
              <button
                key={item.href}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                aria-busy={state === "fetching"}
                onClick={() => void select(item)}
                className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none ${
                  state === "ready" ? "bg-accent/15" : ""
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold text-card-foreground">{item.label}</span>
                  <span
                    className={`text-sm ${
                      state === "failed" ? "text-destructive" : "text-muted-foreground"
                    } ${state === "ready" ? "font-bold text-foreground" : ""}`}
                  >
                    {sub}
                  </span>
                </span>
                {state === "fetching" && (
                  <CircleNotch size={18} aria-hidden="true" className="shrink-0 animate-spin" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {notice && (
        <div className="absolute right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)]">
          <Notice tone="info">{notice}</Notice>
        </div>
      )}
    </div>
  );
}
