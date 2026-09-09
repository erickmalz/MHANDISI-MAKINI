import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app ships as one long-running Node container with a volume (ADR 0001),
  // not a serverless target.
  output: "standalone",
  // Native / Node-only packages the server bundle must not try to bundle.
  // `puppeteer` ships its own Chromium and resolves binaries from its package
  // dir at runtime (ticket 10 / ADR 0005) — it must stay external.
  serverExternalPackages: ["@node-rs/argon2", "pg", "puppeteer"],
  // Dev only: let a phone on the LAN reach the dev server by IP for a mobile
  // preview. Next otherwise blocks cross-origin requests to dev assets.
  allowedDevOrigins: ["192.168.100.207"],
};

export default nextConfig;
