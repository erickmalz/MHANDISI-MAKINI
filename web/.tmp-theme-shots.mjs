import puppeteer from "puppeteer";

const BASE = "http://localhost:3001";
const stamp = Date.now();
const email = `theme-check-${stamp}@example.test`;
const password = "correct-horse-battery-9";

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
// Force a known starting point: the OS/browser prefers light, so the first
// load exercises the light-theme path (no stored choice yet).
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

// Dev mode keeps an HMR websocket open, so "networkidle0" never resolves —
// wait for the actual element instead.
await page.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[name="fullName"]', { timeout: 30000 });
await page.type('input[name="fullName"]', "Theme Check");
await page.type('input[name="email"]', email);
await page.type('input[name="phone"]', "+255712345678");
await page.type('input[name="password"]', password);
await page.click('input[name="acceptedTerms"]');
await Promise.all([
  page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }),
  page.click('button[type="submit"]'),
]);

console.log("Landed on:", page.url());
await page.waitForSelector("nav[aria-label='Main']", { timeout: 30000 });
await new Promise((r) => setTimeout(r, 400));

await page.screenshot({ path: "/tmp/theme-light.png" });
console.log("Saved light screenshot");

// Flip to dark via the real ThemeToggle button (sidebar footer), not a
// script shortcut, so this exercises the actual component + localStorage
// persistence path a person would use.
const toggled = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const btn = buttons.find((b) => /theme/i.test(b.textContent || ""));
  if (!btn) return false;
  btn.click();
  return true;
});
console.log("Clicked theme toggle:", toggled);
await new Promise((r) => setTimeout(r, 400));

await page.screenshot({ path: "/tmp/theme-dark.png" });
console.log("Saved dark screenshot");

// Reload to prove the dark choice persisted (localStorage) rather than only
// being an in-memory DOM flip.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav[aria-label='Main']", { timeout: 30000 });
const themeAfterReload = await page.evaluate(() =>
  document.documentElement.getAttribute("data-theme"),
);
console.log("data-theme after reload:", themeAfterReload);

console.log("Console/page errors:", errors.length ? errors : "none");

await browser.close();
