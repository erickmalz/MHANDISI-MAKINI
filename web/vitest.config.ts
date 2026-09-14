import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig `paths` so tests can import `@/…` the way the app does.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // The document templates are `.tsx`; render them with the automatic JSX
  // runtime so no `import React` is needed.
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  test: {
    // Two kinds of suite live here:
    //  - tests/isolation/** talks to a real PostgreSQL (Testcontainers locally,
    //    a postgres service in CI) — RLS does not exist in a mock. Containers
    //    are slow to boot, so give the suite room and run its files serially.
    //  - tests/documents/** is a pure `renderToStaticMarkup` check with no I/O.
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
