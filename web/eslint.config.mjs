import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Brand floor: labels and metadata are never smaller than 14px (`text-sm`).
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\btext-(xs|\\[(\\d|1[0-3])px\\])/]",
          message: "Brand minimum type size is 14px — use text-sm or larger.",
        },
        {
          selector: "TemplateElement[value.raw=/\\btext-(xs|\\[(\\d|1[0-3])px\\])/]",
          message: "Brand minimum type size is 14px — use text-sm or larger.",
        },
      ],
    },
  },
  // Translation progress: hardcoded text in JSX should come from the catalogue
  // (see src/lib/i18n/README.md). A warning, so it measures without blocking.
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    ignores: [
      "src/app/admin/**",
      "src/app/legal/**",
      "src/app/loading-studies/**",
    ],
    rules: {
      "react/jsx-no-literals": [
        "warn",
        {
          noStrings: false,
          ignoreProps: true,
          allowedStrings: ["·", "—", "–", "/", "|", "(", ")", ":", ",", ".", "%", "&", "+", "-", "•", "…", "×", "→", "TZS"],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Fly.io's generated launch wrapper — plain CommonJS run directly via
    // `node dbsetup.js`, not application source.
    "dbsetup.js",
  ]),
]);

export default eslintConfig;
