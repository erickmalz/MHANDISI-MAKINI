import localFont from "next/font/local";

/**
 * The brand typeface, self-hosted so every device renders the same family the
 * PDFs use (Regular 400 for body, Bold 700 for headings — nothing else).
 * Latin subset of DejaVu Sans; licence in ./DejaVu-LICENSE.txt.
 * `--font-dejavu` feeds `--mm-font` in globals.css. Shared by the root layout
 * and `global-error.tsx`, which replaces the layout and must load it itself.
 */
export const dejaVu = localFont({
  src: [
    { path: "./DejaVuSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./DejaVuSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-dejavu",
  display: "swap",
  adjustFontFallback: "Arial",
});
