# Site Diary

Type: grilling
Status: resolved

## Question

Guidelines §30 wants a lightweight daily site diary (weather, workers on
site, activities, materials received/used, equipment, delays, issues,
instructions, visitors, photos, notes) that is explicitly **not** meant to
become a full construction inspection system. `site_diary_entries` already
has a shape in the data model (§50) but nothing under `web/src/` references
it — it has never been built. Two things need deciding: what an entry is
keyed on, and whether it interacts with anything else already built,
specifically Phase 3's Stage Closeout workflow (four hard gates: no open
Task, no non-terminal Variation, no `ordered` Purchase Order, zero Open
Labour Commitments).

## Answer

One entry per **Project + Stage + Date**, holding exactly the §30 field list
as plain columns (`weather`, `workers_on_site`, `activities`,
`materials_used`, `equipment_used`, `delays`, `issues`, `instructions`,
`visitors`, `notes` — matching `site_diary_entries` in §50 almost verbatim;
`materials_received` folds into `materials_used` as one free-text field
rather than a separate structured line, since the diary is a narrative
record, not a Material Take-Off). No field is mandatory beyond Project,
Stage, and Date — a supervisor filling this in from a phone at day's end
should be able to leave any section blank. Multiple entries per Stage per
Date are allowed (edit-in-place is fine too; this is a low-stakes narrative
record, not a financial one, so none of the Phase 1–3 append-only/Issue
discipline applies).

**No Stage Closeout gate.** The diary stays purely informational, per the
guideline's own "not intended to become a full construction inspection
system" caveat. Extending Phase 3's four hard gates with a Site Diary
requirement would be new scope the guidelines never asked for, and would
retroactively block closing any stage that predates this feature.

Photos referenced from a diary entry (§30's "Photos" field) are **not** a
field on this table — they're `photos` rows (ticket 02) with
`site_diary_entry_id` set as their target, shown inline on the entry. This
keeps `site_diary_entries` a plain narrative table and avoids duplicating
photo storage/metadata here.

### Consequences for the spec

- New `site_diary_entries` table, close to §50's shape, one row per
  Project+Stage+Date+narrative capture, no uniqueness constraint beyond the
  normal account-scoped FK/RLS treatment.
- No new Stage Closeout gate; `stage-closeout.ts` / `closeStage` are
  untouched by this ticket.
- Depends on ticket 02 (Photos) for the "Photos" field's actual storage;
  the diary screen shows a photo upload/list wired to a `photos` row with
  `siteDiaryEntryId` set, not a column on this table.
