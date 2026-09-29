# What "share" means for a report

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: erickmalz (Claude subagent, 2026-09-29)
Blocked by: 01, 03, 04

## Question

What does "Share" do on a report?

- Hand the exported file to the phone's share sheet (WhatsApp, email, etc.)?
- Or produce a link someone else can open? A link that works without signing
  in would expose one Account's data outside its owner. That runs against
  the Account isolation rule, so it would need an expiring, read-only token
  and its own decision on revocation.

Who is the intended recipient: the client, a site partner, or only the
engineer themselves on another device? The answer depends on whether
exports are client-facing (01), which formats exist (04), and what browsers
can actually share (03).

## Answer

**Share sends the exported file itself to the phone's share sheet (WhatsApp,
email, anything installed). It never creates a link.** The Engineer picks the
format, and the recipient is whoever they choose in the share sheet. Resolved
by the grilling design-tree method. Each round's firm recommendation was
taken as the decision, per the standing preference in this map's Notes. Facts
come from [Mobile file-sharing support](./03-mobile-file-sharing-support.md)
(research note on branch `research/mobile-file-sharing`).

### Round 1: share a file or a link?

**A file.** A link someone can open without signing in would put one
Account's figures outside the Account. The multi-tenancy map deliberately
deferred that ("v1 sharing is download-only … a tokenised public link is
deferred", ticket 09 §6), and nothing here justifies reopening it. A link
would also be *live*: it would show different figures every time it is
opened, which contradicts [What an exported report is](./01-what-an-exported-report-is.md)
(a Report Export is a dated copy). A file is dated, self-contained, and works
the way engineers already send documents on WhatsApp. **Shareable report links
are ruled out of scope** for this effort.

### Round 2: who receives it

**Whoever the Engineer picks in the share sheet.** The app has no recipient
field, contact list or send log. The share sheet already has the Engineer's
WhatsApp chats and email, and ticket 01 settled that anyone may receive a
Report Export.

### Round 3: which format

**The Engineer picks, from a small Share menu:** **PDF** (listed first, the
main copy), **Image (JPG)** ("previews in the chat"), and **Spreadsheet
(CSV)**. There is no automatic default: a short report reads best as an
image in WhatsApp, a long one as a PDF, and only the Engineer knows which
this is. The menu uses the same labels as Export, including the "PDF is
better for long reports" hint from
[Export formats and whether filters carry into them](./04-export-formats-and-filters.md).
The file is exactly that export: same filters, same "As of" line, same
filename.

### Round 4: the 5-second tap window

A tap allows about 5 seconds, and `share()` uses the tap up. The PDF and JPG
are rendered on the server by Chromium, which can exceed that on a slow
connection. So:

1. **Tapping a format starts fetching that one file.** Formats are not
   pre-fetched when the menu opens, because every PDF/JPG costs a server
   Chromium render and most taps want only one.
2. **If the file arrives within ~4 s,** the share sheet opens straight away
   on that same tap.
3. **If not,** the menu item turns into **"Ready: tap to share"** once the
   file arrives, and a second tap opens the sheet. This is the reliable path
   on slow networks. It is one extra tap, and the result is never silently
   lost.
4. **The file is kept in the page for the rest of the visit,** keyed by
   format plus the current filters. Sharing again (e.g. to a second chat)
   opens immediately. Changing a filter discards it.
5. `AbortError` (the Engineer closed the sheet) is silent. `NotAllowedError`
   falls back to download (Round 5).

### Round 5: where sharing files isn't supported

- **Share is shown only where the browser can share files** (a
  `canShare({ files })` feature test on load). That covers Android Chrome,
  Samsung Internet, every iOS browser and newer desktop Chrome/Edge/Safari.
  Elsewhere (Firefox, pages opened inside WhatsApp's or Facebook's in-app
  browser on Android) the Share button is not shown at all. Export (download)
  is still there. A Share button that only downloads would be a broken
  promise.
- **If a share fails anyway** (`NotAllowedError`), the same file downloads
  instead, with a note: "Saved to your downloads. Attach it in WhatsApp
  from there."
- **Inside an Android in-app browser**, where downloads can also fail, the
  toolbar shows one line: "To share or download, open this page in your
  browser."
- **No `wa.me` link and no copy-link.** Both carry only text or a URL, and
  Round 1 rules out a report URL.

### Round 6: text sent with the file

**Only a `title`, no `text` or `url`:** "{Report} · {project name} · as of
{date}". Some share targets drop the file when text comes with it (flagged by
the research as needing a device check). The document already says
everything the recipient needs. The Engineer can type a message in WhatsApp.

### Round 7: Issued Documents

The same Share would suit Funding Requests, Fee Invoices, Purchase Orders and
the closeout reports (`DocumentDownloads` is download-only today). But they
are outside this map's destination, which is the six Reports. **Out of
scope here**, recorded as a natural follow-up: the Share control should be
built as a reusable component taking a file URL so that follow-up is a
drop-in.

### Round 8: vocabulary

No new domain terms. "Share" is an action on a Report Export, not a new
thing. `CONTEXT.md` is unchanged.

### Consequences

- [Report toolbar layout](./06-report-toolbar-layout.md): Share is a menu of
  three formats with a "Ready: tap to share" second state. It is hidden where
  unsupported, so the toolbar must also look right without it.
- **Device checks for the build** (not decisions): an iOS home-screen app
  sharing a file, WhatsApp keeping the file when a `title` is passed, and
  download behaviour inside the Android WhatsApp in-app browser.
