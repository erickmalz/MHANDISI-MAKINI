import { describe, expect, it } from "vitest";

import { catalogues } from "@/lib/i18n/catalogues";
import { negotiateLocale } from "@/lib/i18n/locales";
import { createT, translateIfKey } from "@/lib/i18n/translate";

type Flat = Record<string, string>;

function flatten(node: unknown, prefix = "", out: Flat = {}): Flat {
  if (typeof node === "string") {
    out[prefix] = node;
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) flatten(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

const en = flatten(catalogues.en);
const sw = flatten(catalogues.sw);

/**
 * Strings that are legitimately identical in both languages (brand name,
 * tagline, currency, loanwords). Anything else identical is an untranslated
 * copy-paste and fails the test. Add the FULL KEY here on purpose.
 */
const SAME_IN_BOTH = new Set<string>([
  "chrome.brand.name",
  "chrome.brand.tagline",
  "common.documents.pdf",
  "common.documents.jpg",
  // Pure number/name/status templates: nothing to translate.
  "closeout.project.stageLink",
  "closeout.stage.taskLink",
]);

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

describe("catalogues", () => {
  it("Kiswahili has exactly the keys English has", () => {
    expect(Object.keys(sw).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty strings", () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(sw)]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("keeps the same {placeholders} in both languages", () => {
    for (const key of Object.keys(en)) {
      expect(placeholders(sw[key] ?? ""), key).toBe(placeholders(en[key]));
    }
  });

  it("does not leave English copied into Kiswahili", () => {
    const copied = Object.keys(en).filter((key) => en[key] === sw[key] && !SAME_IN_BOTH.has(key));
    expect(copied).toEqual([]);
  });
});

describe("createT", () => {
  const t = createT("sw", catalogues.sw, catalogues.en);
  it("returns the key for an unknown message so the gap is visible", () => {
    // @ts-expect-error deliberately not a real key
    expect(t("nope.missing")).toBe("nope.missing");
  });
});

describe("translateIfKey", () => {
  const t = createT("sw", catalogues.sw, catalogues.en);
  it("translates a catalogue key returned by the server", () => {
    expect(translateIfKey(t, "auth.validation.passwordTooShort")).toBe(sw["auth.validation.passwordTooShort"]);
  });
  it("leaves an English sentence alone", () => {
    expect(translateIfKey(t, "Enter your full name.")).toBe("Enter your full name.");
    expect(translateIfKey(t, "e.g. Foundation")).toBe("e.g. Foundation");
  });
});

describe("placeholders", () => {
  const t = createT("en", catalogues.en);
  it("fills {name} placeholders and leaves unknown ones visible", () => {
    expect(t("chrome.verifyBanner.default", { email: "a@b.co" })).toContain("a@b.co");
    expect(t("chrome.verifyBanner.default")).toContain("{email}");
  });
});

describe("negotiateLocale", () => {
  it("prefers Kiswahili when the browser does", () => {
    expect(negotiateLocale("sw-TZ,sw;q=0.9,en;q=0.5")).toBe("sw");
    expect(negotiateLocale("en-US,sw;q=0.5")).toBe("en");
  });
  it("falls back to English", () => {
    expect(negotiateLocale("fr-FR,de;q=0.5")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
});
