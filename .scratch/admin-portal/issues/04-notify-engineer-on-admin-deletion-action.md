# Notify the Engineer when an admin schedules or cancels their deletion

Type: grilling
Status: resolved

## Question

Today's self-serve deletion email assumes the Engineer scheduled it
themselves — wrong copy when a Platform Admin did it instead. Should a
notification go out, and what does it say? (Named as a known gap in
`status.md` and left undecided by the original platform-admin map.)

## Answer

**Yes** — send an email on both admin-triggered schedule and admin-triggered
cancel, parity with whatever the self-serve flow already sends for its own
schedule/cancel (`sendDeletionScheduledEmail` and its cancel counterpart).

**New copy variant**, not a reuse of the self-serve template: states plainly
that MHANDISI MAKINI support scheduled/cancelled the deletion on the
Engineer's account (not the Engineer's own action), keeps the same
30-day-grace-period and "sign in to cancel" framing as the self-serve email
where it still applies, and adds a support-contact line for questions.
**English-only, plain-text**, matching every existing email in
`src/lib/auth/emails.ts` — the whole transactional-email layer is
hardcoded English with no i18n catalogue involvement, unlike the app's UI.

Sent via the existing email-sending mechanism the self-serve flow already
uses — no new provider/infra decision.

### Consequences for the spec

- New i18n message keys (EN + SW) for the admin-triggered variant.
- `scheduleAccountDeletionForAdmin` / `cancelAccountDeletionForAdmin` (or the
  Server Actions that call them) trigger the email send.
