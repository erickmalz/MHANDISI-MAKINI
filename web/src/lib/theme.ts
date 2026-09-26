export type Theme = "light" | "dark";

/** localStorage key for the person's explicit theme choice. Shared by the
 * inline boot script below and `ThemeToggle.tsx` so they never drift apart. */
export const THEME_STORAGE_KEY = "mm-theme";

/**
 * Runs before hydration (`next/script strategy="beforeInteractive"` in
 * `app/layout.tsx`) so the correct theme is on `<html>` before first paint —
 * without it, the page would briefly flash the wrong theme, or worse, paint
 * with the server's light-only guess while the stylesheet's dark media query
 * already disagrees with a stored dark choice.
 *
 * An explicit stored choice always wins; otherwise this falls back to the OS
 * preference, matching the `@media (prefers-color-scheme: dark)` block in
 * globals.css. Failure (private browsing, storage blocked) just leaves
 * `data-theme` unset, which is the same as an explicit light choice.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
