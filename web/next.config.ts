import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app ships as one long-running Node container with a volume (ADR 0001),
  // not a serverless target.
  output: "standalone",
  // Native / Node-only packages the server bundle must not try to bundle.
  serverExternalPackages: ["@node-rs/argon2", "pg"],
};

export default nextConfig;
