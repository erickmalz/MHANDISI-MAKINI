"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { GearSix, House, List, Stack, Truck, Users, X } from "@phosphor-icons/react/dist/ssr";

import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { SignOutButton } from "./SignOutButton";

const NAV_ITEMS: { href: string; label: MessageKey; Icon: typeof House }[] = [
  { href: "/", label: "chrome.header.projects", Icon: House },
  { href: "/suppliers", label: "chrome.registers.suppliers", Icon: Truck },
  { href: "/subcontractors", label: "chrome.registers.subcontractors", Icon: Users },
  { href: "/stage-templates", label: "chrome.registers.stageTemplates", Icon: Stack },
  { href: "/settings", label: "chrome.header.settings", Icon: GearSix },
];

const SWITCH_PROJECT_CLASS =
  "inline-flex min-h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-on-inverse/40 px-3 text-sm font-bold text-on-inverse hover:bg-on-inverse/10";

const isWithin = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * The shared app sidebar — brand chrome on every authenticated screen
 * (rendered by `app/(app)/layout.tsx`; the bare `/welcome` and `/sign-in`
 * screens are outside that group, and `/admin` deliberately keeps its own
 * chrome, and get no chrome, or their own).
 *
 * A persistent 240px sidebar from `lg` (1024px) up; below that a compact bar
 * with a slide-in drawer holding the same content, so the full nav is
 * always one tap away. The engineer works one project at a time — when a
 * project is open, "Switch project" sits above the nav list.
 */
export function AppChrome({ userEmail }: { userEmail: string }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Closing the drawer on navigation is a state adjustment in response to a
  // prop change, not a side effect — computed during render, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();

  const inProject = /^\/projects\/[^/]+/.test(pathname);
  const isHome = !NAV_ITEMS.slice(1).some((item) => isWithin(pathname, item.href));

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        openRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeAndReturnFocus() {
    setOpen(false);
    openRef.current?.focus();
  }

  function navList() {
    return (
      <ul className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const current = href === "/" ? isHome : isWithin(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-lg border-l-[3px] px-3 text-sm font-bold ${
                  current
                    ? "border-accent bg-on-inverse/10 text-on-inverse"
                    : "border-transparent text-on-inverse/80 hover:bg-on-inverse/10 hover:text-on-inverse"
                }`}
              >
                <Icon size={20} aria-hidden="true" className={current ? "text-accent" : undefined} />
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  function footer() {
    return (
      <div className="flex flex-col gap-3 border-t border-on-inverse/15 px-4 py-4">
        <span className="truncate text-sm text-on-inverse/70">{userEmail}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="header" />
          <SignOutButton variant="header" />
        </div>
        <p className="text-sm text-on-inverse/55">{t("chrome.brand.tagline")}</p>
      </div>
    );
  }

  const logo = (heightClass: string) => (
    <Image
      src="/brand/logo-horizontal-reversed-notag.png"
      alt=""
      width={1600}
      height={561}
      priority
      className={`w-auto ${heightClass}`}
    />
  );

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-30 focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-lg focus:bg-accent focus:px-4 focus:font-bold focus:text-on-accent"
      >
        {t("chrome.skipToMain")}
      </a>

      {/* Desktop: persistent sidebar */}
      <nav
        aria-label="Main"
        className="hidden shrink-0 flex-col justify-between bg-surface-inverse text-on-inverse print:hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60"
      >
        <div className="flex flex-col gap-3 px-4 pt-6">
          <Link href="/" className="inline-flex min-h-12 items-center" aria-label={t("chrome.homeLink")}>
            {logo("h-8")}
          </Link>
          {inProject && (
            <Link href="/" className={SWITCH_PROJECT_CLASS}>
              {t("chrome.header.switchProject")}
            </Link>
          )}
        </div>
        {navList()}
        {footer()}
      </nav>

      {/* Phones and tablets: compact bar + drawer */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-surface-inverse px-4 py-2 text-on-inverse print:hidden lg:hidden">
        <button
          ref={openRef}
          type="button"
          aria-expanded={open}
          aria-controls={open ? drawerId : undefined}
          aria-label={t("chrome.header.openMenu")}
          onClick={() => setOpen(true)}
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg hover:bg-on-inverse/10"
        >
          <List size={22} aria-hidden="true" />
        </button>
        <Link href="/" className="inline-flex min-h-12 items-center" aria-label={t("chrome.homeLink")}>
          {logo("h-7")}
        </Link>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={closeAndReturnFocus}
            aria-hidden="true"
          />
          <nav
            id={drawerId}
            aria-label="Main"
            className="fixed inset-y-0 left-0 z-40 flex w-[272px] max-w-[80%] flex-col justify-between bg-surface-inverse text-on-inverse lg:hidden"
          >
            <div className="flex flex-col gap-3 px-4 pt-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="inline-flex min-h-12 items-center" aria-label={t("chrome.homeLink")}>
                  {logo("h-7")}
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label={t("chrome.header.closeMenu")}
                  onClick={closeAndReturnFocus}
                  className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg hover:bg-on-inverse/10"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              {inProject && (
                <Link href="/" className={SWITCH_PROJECT_CLASS}>
                  {t("chrome.header.switchProject")}
                </Link>
              )}
            </div>
            {navList()}
            {footer()}
          </nav>
        </>
      )}
    </>
  );
}
