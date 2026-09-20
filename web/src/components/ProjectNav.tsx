"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";

const TABS: { label: MessageKey; segment: string }[] = [
  { label: "chrome.project.tabs.overview", segment: "" },
  { label: "chrome.project.tabs.funding", segment: "funding" },
  { label: "chrome.project.tabs.procurement", segment: "procurement" },
  { label: "chrome.project.tabs.materialStock", segment: "material-stock" },
  { label: "chrome.project.tabs.reports", segment: "reports" },
  { label: "chrome.project.tabs.activity", segment: "activity" },
];

const SECTION_SEGMENTS = new Set<string>(
  TABS.map((t) => t.segment).filter(Boolean),
);

/**
 * The project's sections as tabs. The active section is shown with a heavy
 * charcoal underline AND bold weight (never colour alone) and is announced
 * with `aria-current`. Stages, tasks, variations and closeout belong to the
 * Overview, so it stays active on those screens. On a phone the row scrolls
 * sideways, fades at the edges, and keeps every tab at 48px.
 */
export function ProjectNav({ projectId }: { projectId: string }) {
  const t = useT();
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const segment = pathname.split("/")[3] ?? "";
  const activeSegment = SECTION_SEGMENTS.has(segment) ? segment : "";
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Centre the active tab on a phone. Set the scroll position directly:
    // `scrollIntoView` also moves the browser's keyboard-navigation starting
    // point, which would make the first Tab press skip the skip link.
    const ul = list.current;
    const tab = ul?.querySelector<HTMLElement>("[aria-current]");
    if (!ul || !tab) return;
    ul.scrollLeft = tab.offsetLeft - (ul.clientWidth - tab.offsetWidth) / 2;
  }, [activeSegment]);

  return (
    <nav aria-label={t("chrome.project.sections")} className="-mb-px">
      <ul
        ref={list}
        className="-ml-4 flex overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-24px),transparent)] sm:[mask-image:none]"
      >
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = tab.segment === activeSegment;
          const exact = pathname === href;
          return (
            <li key={tab.label} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? (exact ? "page" : "true") : undefined}
                className={`inline-flex min-h-12 items-center whitespace-nowrap border-b-[3px] px-4 text-sm font-bold ${
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
                }`}
              >
                {t(tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
