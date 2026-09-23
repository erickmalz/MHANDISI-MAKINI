"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SurveySweepLoader } from "./PageLoaders";

const SHOW_DELAY_MS = 150;

/**
 * A global route-transition cue: on an internal link click, the current page
 * blurs and the branded spinner appears on top of it, rather than waiting
 * for the destination route's `loading.tsx` skeleton to replace the page
 * outright (that skeleton still renders underneath — Suspense requires it —
 * it's just hidden behind the blur and backdrop). Clears the moment the new
 * route has mounted (`pathname` changes). The short delay before showing
 * avoids a flash on navigations Next.js resolves instantly from the
 * prefetch cache.
 */
export function RouteLoadingOverlay({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [committedPathname, setCommittedPathname] = useState(pathname);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The new route has mounted — clear the pending cue. Adjusted during
  // render (React's recommended pattern for state derived from a prop
  // change) rather than in an effect, so it takes effect before paint
  // instead of causing an extra render pass. Refs aren't touched here —
  // that happens below, in an effect, where ref access is sanctioned.
  if (pathname !== committedPathname) {
    setCommittedPathname(pathname);
    setPending(false);
  }

  useEffect(() => {
    // Cancel a "show" timer left over from the navigation that just
    // finished, so it can't flip the overlay back on after the new route
    // has already mounted.
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      showTimer.current = setTimeout(() => setPending(true), SHOW_DELAY_MS);
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (showTimer.current) clearTimeout(showTimer.current);
    };
  }, []);

  return (
    <>
      <div
        className={`flex flex-1 flex-col motion-safe:transition-[filter] motion-safe:duration-200 ${pending ? "blur-sm" : ""}`}
      >
        {children}
      </div>
      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/50">
          <SurveySweepLoader />
        </div>
      )}
    </>
  );
}
