import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig `paths` so tests can import `@/…` the way the app does.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // DAL modules import `server-only` as a Next build guard; it throws
      // outside the react-server condition, so tests get an empty module.
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
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
    //  - tests/financials/** calls the Stage Financials read model against
    //    the same real PostgreSQL, through an RLS-scoped transaction.
    //  - tests/documents/** is a pure `renderToStaticMarkup` check with no I/O.
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
