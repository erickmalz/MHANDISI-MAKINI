# Translations (English and Kiswahili)

The interface is available in English (`en`, the source) and Kiswahili (`sw`).
The reader's choice is saved in the `mm_locale` cookie (no `/sw/` in URLs);
`getLocale()` falls back to the browser's `Accept-Language`, then English.

## Where strings live

`messages/en/<namespace>.ts` defines keys with literal strings (`as const`).
`messages/sw/<namespace>.ts` has the same keys, typed `Widen<typeof enX>`, so
the compiler fails until every English key has a Kiswahili one.

```ts
// messages/en/funding.ts
export const funding = {
  pageTitle: "Funding requests",
  alerts: { one: "{count} alert", other: "{count} alerts" }, // plural
  raisedFor: "Raised for {name}",                            // placeholder
} as const;

// messages/sw/funding.ts
import type { funding as enFunding } from "../en/funding";
import type { Widen } from "../../types";
export const funding: Widen<typeof enFunding> = {
  pageTitle: "Maombi ya fedha",
  alerts: { one: "Tahadhari {count}", other: "Tahadhari {count}" },
  raisedFor: "Imeombwa kwa {name}",
};
```

Add a namespace only if none fits: create both files and add one line to
`messages/en/index.ts` and `messages/sw/index.ts`.

## Using them

- Server Component / Server Action: `const t = await getT();` from
  `@/lib/i18n/server`. Locale only: `await getLocale()`.
- Client Component: `const t = useT();` from `@/lib/i18n/client`.
- Page title: `export const generateMetadata = pageTitle("funding.pageTitle");`
- Plural: `t("funding.alerts", { count: n })`. Placeholders: `t("funding.raisedFor", { name })`.
- Dates: `formatDate(value, locale)` (Swahili months come out as `06 Ago 2026`).
- Components used in both server and client trees that need text
  (`Field`, `HealthBadge`, …) are marked `"use client"` and call `useT()`.

## Rules

- Key names describe the place and meaning (`picker.filter.label`), not the
  English words. Group by screen or component.
- Never build a sentence by concatenating translated pieces; use one message
  with placeholders so word order can differ.
- Keep untranslated: the name `Mhandisi Makini`, the tagline `Let's build
  together` (brand: English unless a translation is approved), currency code
  `TZS`, units, user-entered data, and status values stored in the database.
  Translate the *label* of a status, never the stored value.
- Sentence case, plain verbs, describe the problem and the next step, never
  blame (see the brand voice file). Swahili runs longer: never rely on a fixed
  width; let text wrap.
- A Kiswahili string identical to English must be listed in
  `tests/ui/i18n.test.ts` (`SAME_IN_BOTH`) or it fails the test: that is how
  an untranslated copy-paste is caught.
- Every Kiswahili string is a **draft for review by native-speaking site
  engineers** before release (brand guidelines, "Review Swahili terminology
  with intended users").

## Not translated yet (known gaps)

Messages produced by the **server** are still English:

| Where | How to close it |
|---|---|
| Validation errors returned by Server Actions (`state.error`, `fieldErrors`) | Make the schema message a catalogue key, as `lib/auth/password-schema.ts` now does (`error: "auth.validation.nameRequired"`). `Field` and `Notice` translate a string that looks like a key, so no action or caller changes. Signup is done; the other `lib/validation/*.ts` schemas are next. |
| Alert texts built in `lib/data/alerts.ts` (shown on the Overview) | Return `{ key, params }` instead of a sentence and translate where it is rendered. |
| Activity history events (`lib/data/activity.ts`), reconciliation findings (`lib/data/reconciliation.ts`) | Same: keys plus params from the data layer. |
| Issued PDFs and JPGs, e-mails | Decide whose language they use (the engineer's, or the client's) before translating; today `formatDate` defaults to English so they are unchanged. |
| Legal pages (terms, privacy) | Need a proper legal translation, not a draft. |
| Platform admin screens | English only, for platform staff. |

## Glossary — use these terms everywhere

| English | Kiswahili |
|---|---|
| Project / Choose a project | Mradi / Chagua mradi |
| Stage | Hatua |
| Task | Kazi |
| Variation | Badiliko la kazi (plural: Mabadiliko ya kazi) |
| Client | Mteja |
| Site | Eneo la kazi |
| Funding request | Ombi la fedha (plural: Maombi ya fedha) |
| Additional funding request | Ombi la fedha la ziada |
| Deposit / Client deposited | Amana / Amana ya mteja |
| Available Float | Fedha zinazopatikana |
| Commitments | Ahadi za malipo |
| Remaining expected | Gharama zilizosalia |
| Funding shortfall / surplus | Upungufu wa fedha / Ziada ya fedha |
| Supervision fee | Ada ya usimamizi |
| Fee invoice / Invoice | Ankara ya ada / Ankara |
| Supplier | Msambazaji |
| Subcontractor | Mkandarasi msaidizi |
| Purchase order | Oda ya ununuzi |
| Delivery / Delivered | Uwasilishaji / Imewasilishwa |
| Accepted / Rejected | Imekubaliwa / Imekataliwa |
| Materials | Vifaa |
| Labour | Vibarua |
| Material stock | Akiba ya vifaa |
| Quantity / Unit / Unit cost | Kiasi / Kipimo / Bei ya kipimo |
| Item | Kipengee |
| Total / Balance | Jumla / Salio |
| Paid / Partially paid / Outstanding | Imelipwa / Imelipwa sehemu / Kilichobaki kulipwa |
| Draft | Rasimu |
| Issued | Imetumwa |
| Approved / Cancelled / Closed | Imeidhinishwa / Imeghairiwa / Imefungwa |
| Planned / In progress / Completed | Imepangwa / Inaendelea / Imekamilika |
| Overview | Muhtasari |
| Reports | Ripoti |
| Activity history | Historia ya shughuli |
| Settings | Mipangilio |
| Alerts / Action needed / Attention / Note | Tahadhari / Hatua inahitajika / Angalizo / Maelezo |
| Comfortable / Tight / Underfunded / Funding pending | Hali nzuri / Finyu / Fedha hazitoshi / Fedha zinasubiriwa |
| Site diary | Shajara ya eneo la kazi |
| Closeout (project / stage) | Kufunga (mradi / hatua) |
| Financial check | Ukaguzi wa fedha |
| Template | Kiolezo |
| Register (supplier register) | Orodha (Orodha ya wasambazaji) |
| Statement of account | Taarifa ya akaunti |
| Sign in / Sign out / Create an account | Ingia / Toka / Fungua akaunti |
| Email / Password / Phone | Barua pepe / Nywila / Simu |
| Save changes / Cancel / Edit / Delete | Hifadhi mabadiliko / Ghairi / Hariri / Futa |
| Add / Create (a record) / Remove / Void | Ongeza / Andaa / Ondoa / Batilisha |
| Back / Close / Try again | Rudi / Funga / Jaribu tena |
| Notes / Date / Status / Name | Maelezo / Tarehe / Hali / Jina |

From the brand string table (authoritative): "Report saved." = "Ripoti
imehifadhiwa."; "Enter the project name." = "Weka jina la mradi."; "Report not
submitted. Try again." = "Ripoti haijatumwa. Jaribu tena."; "No tasks yet. Add
your first task." = "Hakuna kazi bado. Ongeza kazi yako ya kwanza."
Address the reader directly with plain imperatives ("Weka…", "Chagua…").
