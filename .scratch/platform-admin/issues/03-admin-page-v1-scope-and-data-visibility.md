# Admin page v1 scope: Account list/detail & data-visibility boundary

Type: grilling
Status: resolved

## Question

What does the Platform Admin actually see and do on `/admin` for v1, and
where's the line on seeing an Engineer's own data?

## Answer

**v1 is a read-only Account list and detail view, plus one action:
triggering the Account's existing self-serve deletion-scheduling**
(`accounts.deletionScheduledAt`, per
`web/src/lib/data/schema/accounts.ts`) — no new mutation path, just admin
access to the one that already exists for Engineers themselves. No hard
delete, no direct editing of an Engineer's data, no impersonation — those
are real, separate, higher-risk questions left as fog (see the map's Not
yet specified), not folded into this ticket.

**List view**: every Account, showing Engineer full name, phone
(`accounts.fullName`, `accounts.phone`), the linked `auth_user`'s email,
`created_at`, a live-computed project count, and whether deletion is
scheduled (and for when).

**Detail view**: the same facts at Account grain, plus Terms/Privacy
acceptance (`acceptedTermsVersion`, `acceptedTermsAt`) and the
deletion-scheduling action.

**The Platform Admin never sees an Engineer's actual domain data** — no
Projects, Stages, Tasks, Purchase Orders, Funding Requests, financial
figures, or documents. Everything shown is Account-level metadata already
present on the `accounts` row (or trivially derived, like a count), never
the content beneath it. Seeing that content for support purposes
(impersonation) is a distinct, later question.

### Consequences for the spec

- No new Account-shaped mutation beyond what the self-serve deletion flow
  already does — the admin action calls the same underlying operation,
  just invoked by a Platform Admin instead of the Engineer themselves.
- The admin list/detail queries read across every Account with no
  `account_id` scoping — a deliberate, sole exception to the
  one-Account-at-a-time/RLS-scoped pattern every other query in the app
  follows, because this is the one screen whose entire job is to see
  across Accounts. It runs under the Platform Admin's own session check,
  not the `app.current_account_id` RLS GUC.
- Whether the Engineer is notified when an admin (vs. themselves)
  schedules their deletion is not decided here — flagged in Not yet
  specified.
