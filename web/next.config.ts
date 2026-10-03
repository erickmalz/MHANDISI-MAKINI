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
  // Security headers on every response. Nothing in the app frames itself, so
  // framing is denied outright (clickjacking on admin and ledger actions).
  // The CSP carries only `frame-ancestors` — a full script/style policy would
  // break Next's inline scripts. `nosniff` keeps user-uploaded attachments and
  // photos served inline from being sniffed into HTML/script. HSTS is sent in
  // production only (Fly terminates TLS with force_https) so plain-http dev,
  // including a phone on the LAN, is never pinned to https.
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      });
    }
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
