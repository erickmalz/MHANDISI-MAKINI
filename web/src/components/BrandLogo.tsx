type BrandLogoProps = {
  /**
   * Rendered width in px. The design-system floor for the stacked lockup is
   * 160 px on screen; below that the checkmark and gear gaps lose clarity.
   */
  width: number;
  /** Extra classes on the wrapper — e.g. `mx-auto` to centre it. */
  className?: string;
  /** Pass `priority` when the logo is above the fold (auth screens). */
  priority?: boolean;
};

// The stacked artboard's own aspect ratio (viewBox 324 x 364).
const ASPECT_W = 324;
const ASPECT_H = 364;

/**
 * The stacked MHANDISI MAKINI signature, theme-aware, drawn from the vector
 * masters so it stays crisp at every size and keeps the tagline legible.
 *
 * Light backgrounds get the full-colour lockup (`logo-stacked.svg`); dark
 * backgrounds get the reversed lockup (`logo-stacked-reversed.svg` — yellow
 * hard hat, near-white `#EFEFEF` gear, wordmark and tagline, no white holding
 * panel). Both files are the same artwork, cropped to matching framing so the
 * mark does not shift between themes — see `web/design-system/mhandisi-makini/MASTER.md`
 * for the full logo file inventory and usage rules.
 *
 * The swap is driven by `prefers-color-scheme`, the same signal the dark theme
 * in `globals.css` uses — so the mark always matches its surface with no
 * client-side theme state. Plain `<img>` (not `next/image`): an SVG needs no
 * resizing pipeline and this keeps `dangerouslyAllowSVG` off.
 */
export function BrandLogo({ width, className = "", priority = false }: BrandLogoProps) {
  const shared = {
    width: ASPECT_W,
    height: ASPECT_H,
    decoding: "async" as const,
    ...(priority
      ? { loading: "eager" as const, fetchPriority: "high" as const }
      : { loading: "lazy" as const }),
  };
  return (
    <span className={`block ${className}`} style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...shared}
        src="/brand/logo-stacked.svg"
        alt="Mhandisi Makini"
        className="h-auto w-full dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...shared}
        src="/brand/logo-stacked-reversed.svg"
        alt=""
        aria-hidden
        className="hidden h-auto w-full dark:block"
      />
    </span>
  );
}
