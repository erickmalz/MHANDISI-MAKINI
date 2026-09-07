import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The isolation suite talks to a real PostgreSQL (Testcontainers locally,
    // a postgres service in CI) — RLS does not exist in a mock. Containers are
    // slow to boot, so give the suite room and run its files serially.
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
