import "server-only";

import type { Page } from "puppeteer";

import { getBrowser } from "./browser";

/**
 * PDF + JPG rendering off the warm browser (ticket 10 §1, §4, §6).
 *
 * Guard rails owned here, per §5: a hard per-render timeout, and an in-process
 * concurrency gate with a short waiting line so a burst cannot exhaust browser
 * memory. Exceeding either throws `RenderUnavailableError`, which the route
 * handlers turn into an HTTP 503 "try again".
 */

const MAX_CONCURRENT = 2;
const MAX_WAITING = 4;
const RENDER_TIMEOUT_MS = 20_000;

/** A4 at 96dpi — the JPG viewport width; height grows with `fullPage`. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export class RenderUnavailableError extends Error {
  constructor(reason: "busy" | "timeout") {
    super(
      reason === "busy"
        ? "The document service is busy."
        : "Rendering the document took too long.",
    );
    this.name = "RenderUnavailableError";
  }
}

// --- Concurrency gate --------------------------------------------------
let active = 0;
const waiting: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return;
  }
  if (waiting.length >= MAX_WAITING) {
    throw new RenderUnavailableError("busy");
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  // A slot was handed straight to us — `active` is unchanged on purpose.
}

function release(): void {
  const next = waiting.shift();
  if (next) {
    next();
  } else {
    active -= 1;
  }
}

async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  await acquire();
  let page: Page | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    const scopedPage = page;
    return await Promise.race([
      fn(scopedPage),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new RenderUnavailableError("timeout")),
          RENDER_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (page) {
      await page.close().catch(() => {});
    }
    release();
  }
}

const FOOTER_TEMPLATE = `
  <div style="font-family: Arial, sans-serif; font-size: 8px; color: #56616B;
              width: 100%; padding: 0 16mm; display: flex;
              justify-content: space-between;">
    <span class="title"></span>
    <span>Let&rsquo;s build together &nbsp;&middot;&nbsp;
      <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

/** Render an HTML string to an A4 PDF. */
export async function renderPdf(html: string): Promise<Uint8Array> {
  return withPage(async (page) => {
    await page.setContent(html, { waitUntil: "networkidle0" });
    return page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: FOOTER_TEMPLATE,
      margin: { top: "16mm", bottom: "20mm", left: "16mm", right: "16mm" },
    });
  });
}

/**
 * Render an HTML string to one continuous JPG of the whole document, regardless
 * of page count — the WhatsApp-shareable version (ticket 10 §4). The caller
 * passes HTML built with `screenshot: true` so page furniture is suppressed.
 */
export async function renderJpg(html: string): Promise<Uint8Array> {
  return withPage(async (page) => {
    await page.setViewport({
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: "networkidle0" });
    return page.screenshot({ type: "jpeg", quality: 90, fullPage: true });
  });
}
