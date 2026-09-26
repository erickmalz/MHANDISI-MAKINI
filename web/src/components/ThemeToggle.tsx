"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";

import { useT } from "@/lib/i18n/client";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/**
 * A tiny external store over `document.documentElement`'s `data-theme`
 * attribute (module-scoped, not React state) so every mounted `ThemeToggle`
 * — the desktop sidebar's and the mobile drawer's render at once whenever
 * the drawer is open — reads and updates the same live value instead of
 * drifting out of sync with each other.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/**
 * `THEME_INIT_SCRIPT` (see `app/layout.tsx`) already resolves and sets the
 * real theme before hydration, so this server guess is only ever visible for
 * the first paint of server-rendered HTML — matched here on purpose, not
 * "light" as a preference, since the client corrects it immediately.
 */
function getServerSnapshot(): Theme {
  return "light";
}

function setTheme(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private browsing or storage blocked: the toggle still works for this
    // visit, it just won't be remembered next time.
  }
  listeners.forEach((onChange) => onChange());
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useT();
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={`flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm font-bold text-foreground hover:bg-muted ${className}`}
    >
      <Icon size={18} aria-hidden="true" />
      {t("chrome.theme.switchTo", { theme: t(next === "dark" ? "chrome.theme.dark" : "chrome.theme.light") })}
    </button>
  );
}
