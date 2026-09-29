# Mobile file-sharing support

Type: research
Label: wayfinder:research
Status: resolved
Assignee: —
Blocked by: —

## Question

Engineers use the app mostly on phones, and they share with clients over
WhatsApp. What can a web page actually do today to hand a generated file
(PDF, JPG, maybe CSV) straight to the phone's share sheet?

- Web Share API Level 2 (`navigator.share({ files })` /
  `navigator.canShare`): support on Android Chrome, iOS Safari (incl.
  installed PWA), desktop Chrome/Edge/Safari/Firefox.
- Allowed MIME types, size limits, and whether a user gesture is needed. Can
  the file be fetched from a server route after the tap without losing the
  gesture?
- What is the sensible fallback where it's unsupported (download, a
  `wa.me` link with text only, copy link)?

Primary sources only (MDN, W3C spec, WebKit/Chromium docs and release notes,
caniuse). This fact gates the "What share means for a report" ticket.

## Answer

Full findings with primary-source citations: branch `research/mobile-file-sharing`
(commit `7e19ea8`), file `.scratch/reports-toolbar/research/mobile-file-sharing.md`.

- **The phone's share sheet can take a file directly.** `navigator.share({ files })`
  works on Android Chrome 76+, Samsung Internet 11+ and every iOS browser 14+,
  which covers this app's audience. PDF, JPEG and CSV are all allowed if the
  file extension and exact MIME type match. Limits: 10 files, 50 MB.
- **The tap only lasts about 5 seconds, and sharing uses it up.** The file must be
  generated or fetched *before* the tap (or a second "Ready, tap to share" tap is
  needed). Fetching and then sharing on a slow network fails.
- **`canShare()` is only a feature test.** Chromium doesn't check type or size
  there, so `share()` rejections must be caught: ignore `AbortError`, fall back
  on `NotAllowedError`.
- **Fallbacks are needed** for Firefox, unsupported desktops, and Android
  in-app browsers (a page opened from inside WhatsApp or Facebook has no Web
  Share at all): download the file, plus copy-link.
- **`wa.me/?text=` carries text or a link only, never a file.** It's useful only
  if a report has a shareable URL.
- **Still to check on a real phone:** home-screen (PWA) mode on iOS has no
  source confirming it.
