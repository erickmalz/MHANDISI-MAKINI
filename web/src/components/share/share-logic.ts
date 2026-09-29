/**
 * The pure half of the Share control (ticket "What 'share' means for a
 * report"; facts from the research note "Mobile file-sharing support"). No
 * DOM, no React — so the rules are unit-tested on their own.
 *
 * The browser rules this encodes:
 *  - `navigator.share({ files })` needs a `File` whose extension *and* exact
 *    MIME type are on the browser's allowlist (PDF, JPEG, CSV all are).
 *  - A tap grants roughly 5 s of transient activation and `share()` uses it
 *    up, so a file that took longer than the budget to fetch waits for a
 *    second tap ("Ready: tap to share") instead of failing silently.
 *  - `AbortError` means the Engineer closed the sheet — say nothing.
 *    Anything else falls back to downloading the same file.
 */

export type ShareFormat = "pdf" | "jpg" | "csv";

const MIME: Record<ShareFormat, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  csv: "text/csv",
};

/** The exact MIME type a browser's share allowlist expects for each format. */
export function mimeFor(format: ShareFormat): string {
  return MIME[format];
}

/** A filename that ends in the extension the share allowlist checks. */
export function filenameFor(format: ShareFormat, filename: string): string {
  const ext = `.${format}`;
  return filename.toLowerCase().endsWith(ext) ? filename : `${filename}${ext}`;
}

/**
 * How long after the tap a fetched file can still be shared on that same tap.
 * Chromium and WebKit both allow ~5 s; a 1 s margin covers building the File.
 */
export const ACTIVATION_BUDGET_MS = 4_000;

/** Whether the tap that started a fetch can still open the share sheet. */
export function withinActivation(startedAt: number, now: number): boolean {
  return now - startedAt <= ACTIVATION_BUDGET_MS;
}

export type ShareOutcome = "cancelled" | "fallback";

/** `AbortError` (sheet dismissed) is silent; every other failure downloads instead. */
export function classifyShareError(error: unknown): ShareOutcome {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  return name === "AbortError" ? "cancelled" : "fallback";
}

type ShareCapableNavigator = {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; title?: string }) => Promise<void>;
};

/**
 * Feature test only: whether this browser can share files at all. Chromium's
 * `canShare` does not check type or size, so `share()` can still reject —
 * callers must handle that (see `classifyShareError`).
 */
export function canShareFiles(nav: ShareCapableNavigator | undefined): boolean {
  if (!nav || typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    const probe = new File(["x"], "probe.pdf", { type: mimeFor("pdf") });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * One format's state inside the Share menu.
 *  - `idle`: not fetched yet.
 *  - `fetching`: the tap started a fetch.
 *  - `ready`: fetched, but too late for the first tap — the next tap shares.
 *  - `failed`: the fetch itself failed (network, 5xx) — the next tap retries.
 */
export type ItemState = "idle" | "fetching" | "ready" | "failed";

export type ItemEvent =
  | { type: "tap"; cached: boolean }
  | { type: "fetched"; inTime: boolean }
  | { type: "fetch-failed" }
  | { type: "shared" };

/**
 * What a tap on a format should do, given its state and whether the file is
 * already in the page's cache.
 *  - `share`: share now, on this tap (the file is in hand).
 *  - `fetch`: fetch it, then share if it arrives in time.
 *  - `wait`: a fetch is already running — ignore the double tap.
 */
export function actionForTap(state: ItemState, cached: boolean): "share" | "fetch" | "wait" {
  if (state === "fetching") return "wait";
  return cached ? "share" : "fetch";
}

export function nextItemState(state: ItemState, event: ItemEvent): ItemState {
  switch (event.type) {
    case "tap":
      if (state === "fetching") return state;
      return event.cached ? "idle" : "fetching";
    case "fetched":
      return event.inTime ? "idle" : "ready";
    case "fetch-failed":
      return "failed";
    case "shared":
      return "idle";
  }
}
