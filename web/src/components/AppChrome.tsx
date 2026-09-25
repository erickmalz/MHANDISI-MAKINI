"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stack, Truck, Users } from "@phosphor-icons/react/dist/ssr";

import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";

import { ActionMenu, ActionMenuItem } from "./ActionMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SignOutButton } from "./SignOutButton";

const REGISTERS: { href: string; label: MessageKey; Icon: typeof Truck }[] = [
  { href: "/suppliers", label: "chrome.registers.suppliers", Icon: Truck },
  { href: "/subcontractors", label: "chrome.registers.subcontractors", Icon: Users },
  { href: "/stage-templates", label: "chrome.registers.stageTemplates", Icon: Stack },
];

/** Header controls on the charcoal: 48px tall, white text, a subtle outline. */
const HEADER_CONTROL =
  "inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-bold text-on-inverse hover:bg-on-inverse/10";
/** The section the person is in gets a stronger outline, a wash and an underline — never colour alone. */
const HEADER_ACTIVE = "border-on-inverse bg-on-inverse/10 underline decoration-2 underline-offset-4";
const HEADER_IDLE = "border-on-inverse/40";

const isWithin = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * The shared charcoal app header — brand chrome on every authenticated screen
 * (rendered by `app/(app)/layout.tsx`; the bare `/welcome` and `/sign-in`
 * screens are outside that group and get no chrome).
 *
 * The engineer works one project at a time. When a project is open the header
 * offers a way back to the picker; the project's own name and figures live on
 * the page. The header carries the reversed horizontal lockup (no tagline)
 * directly on the charcoal — the supplied artwork, never retyped as text.
 *
 * The three shared reference registers (suppliers, subcontractors, stage
 * templates) live in a "Registers" menu so they are one tap away from every
 * screen, not only the project picker.
 *
 * Width plan (content box = viewport minus the 16/24/32px gutters, and the
 * logo takes about 103px plus a 16px gap):
 * - `md` and up (768px+): everything inline — Switch project, Registers,
 *   Settings, Sign out (about 450px against 600px+ available). The email joins
 *   at `lg`.
 * - Below `md`: those four controls no longer fit beside the logo at 390px
 *   (they need about 400px, 240px is free), so one "Menu" button holds them
 *   all — nothing is dropped, and the whole header stays on one 64px row.
 */
export function AppChrome({ userEmail }: { userEmail: string }) {
  const t = useT();
  const pathname = usePathname();
  const inProject = /^\/projects\/[^/]+/.test(pathname);
  const inRegisters = REGISTERS.some((r) => isWithin(pathname, r.href));
  const inSettings = isWithin(pathname, "/settings");

  return (
    <header className="sticky top-0 z-20 bg-surface-inverse text-on-inverse">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-30 focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-lg focus:bg-accent focus:px-4 focus:font-bold focus:text-on-accent"
      >
        {t("chrome.skipToMain")}
      </a>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-12 shrink-0 items-center rounded-lg"
          aria-label={t("chrome.homeLink")}
        >
          <Image
            src="/brand/logo-horizontal-reversed-notag.png"
            alt=""
            width={1600}
            height={561}
            priority
            className="h-9 w-auto"
          />
          <span className="sr-only">{t("chrome.brand.name").toUpperCase()}</span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          {/* Wide screens: everything inline. */}
          <div className="hidden items-center gap-3 md:flex">
            {inProject && (
              <Link href="/" className={`${HEADER_CONTROL} ${HEADER_IDLE}`}>
                {t("chrome.header.switchProject")}
              </Link>
            )}
            <ActionMenu
              label={t("chrome.header.registers")}
              triggerClassName={`${HEADER_CONTROL} ${inRegisters ? HEADER_ACTIVE : HEADER_IDLE}`}
            >
              {REGISTERS.map(({ href, label, Icon }) => (
                <ActionMenuItem
                  key={href}
                  href={href}
                  current={isWithin(pathname, href)}
                  icon={<Icon size={20} aria-hidden="true" />}
                >
                  {t(label)}
                </ActionMenuItem>
              ))}
            </ActionMenu>
            <span className="hidden max-w-[16ch] truncate text-sm text-on-inverse/70 lg:block">
              {userEmail}
            </span>
            <Link
              href="/settings"
              aria-current={inSettings ? "page" : undefined}
              className={`inline-flex min-h-12 shrink-0 items-center rounded-lg px-3 text-sm font-bold text-on-inverse hover:bg-on-inverse/10 ${
                inSettings ? "bg-on-inverse/10 underline decoration-2 underline-offset-4" : ""
              }`}
            >
              {t("chrome.header.settings")}
            </Link>
            <LanguageSwitcher variant="header" />
            <SignOutButton />
          </div>

          {/* Phones and small tablets: one menu holds all of it. */}
          <div className="md:hidden">
            <ActionMenu
              label={t("chrome.header.menu")}
              triggerClassName={`${HEADER_CONTROL} ${inRegisters || inSettings ? HEADER_ACTIVE : HEADER_IDLE}`}
            >
              <li
                role="presentation"
                className="truncate px-3 py-2 text-sm text-muted-foreground"
              >
                {userEmail}
              </li>
              {inProject && (
                <ActionMenuItem href="/">{t("chrome.header.switchProject")}</ActionMenuItem>
              )}
              <li
                role="presentation"
                className="mt-1 border-t border-border px-3 pb-1 pt-3 text-sm font-bold text-muted-foreground"
              >
                {t("chrome.header.registers")}
              </li>
              {REGISTERS.map(({ href, label, Icon }) => (
                <ActionMenuItem
                  key={href}
                  href={href}
                  current={isWithin(pathname, href)}
                  icon={<Icon size={20} aria-hidden="true" />}
                >
                  {t(label)}
                </ActionMenuItem>
              ))}
              <li role="presentation" className="mt-1 border-t border-border pt-1">
                <ul className="flex flex-col">
                  <ActionMenuItem href="/settings" current={inSettings}>
                    {t("chrome.header.settings")}
                  </ActionMenuItem>
                  <li>
                    <LanguageSwitcher variant="menu" />
                  </li>
                  <li>
                    <SignOutButton variant="menu" />
                  </li>
                </ul>
              </li>
            </ActionMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
