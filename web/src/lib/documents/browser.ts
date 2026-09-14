import "server-only";

import type { Browser } from "puppeteer";

/**
 * The warm in-container Chromium (ADR 0005 / ticket 10 §1, §5).
 *
 * `puppeteer` (the full package) pins its own Chromium, so there is nothing to
 * bump separately in the image. One browser is launched lazily on the first
 * render and kept for the life of the Node process; it is relaunched
 * automatically if it crashes or disconnects. The ~1 GB container memory floor
 * and the `fonts-dejavu-core` requirement this implies are documented in
 * `web/Dockerfile` and fed to the deployment-shape decision.
 */

let browserPromise: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      // The container runs as an unprivileged user with no user namespaces.
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // `/dev/shm` is tiny in most containers; force Chromium to use /tmp.
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });
  browser.on("disconnected", () => {
    // Next call to getBrowser() relaunches.
    browserPromise = null;
  });
  return browser;
}

/** The shared browser, launching it on first use. */
export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launch().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

/** Close the browser (used by tests / graceful shutdown). */
export async function closeBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = null;
  if (pending) {
    try {
      const browser = await pending;
      await browser.close();
    } catch {
      // Already gone — nothing to do.
    }
  }
}
