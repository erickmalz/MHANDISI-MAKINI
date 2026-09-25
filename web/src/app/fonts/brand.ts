import { Inter, Manrope } from "next/font/google";

/**
 * Design-system typefaces (Sep 2026 revision): Manrope for headings, Inter
 * for all UI and body text. `next/font/google` self-hosts both at build time
 * — no runtime request to Google Fonts, same guarantee the old self-hosted
 * DejaVu Sans gave. `--font-manrope`/`--font-inter` feed `--mm-font-heading`/
 * `--mm-font-body` in globals.css. Shared by the root layout and
 * `global-error.tsx`, which replaces the layout and must load them itself.
 */
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
