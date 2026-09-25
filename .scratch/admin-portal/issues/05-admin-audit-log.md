# Audit log of Platform Admin actions

Type: grilling
Status: resolved

## Question

What gets logged, where, and who can see it, now that admin actions are
expanding beyond one reused mutation? (Named as undecided fog on the
original platform-admin map — "the app has no general audit-log mechanism
today.")

## Answer

**New `admin_audit_log` table**: `id`, `actorAuthUserId` (FK `auth_user.id`),
`action` (`schedule_deletion` | `cancel_deletion` | `add_admin` |
`remove_admin`), `targetAccountId` (nullable — set for account-scoped
actions), `targetAuthUserId` (nullable — set for admin-management actions),
`createdAt`. **Not RLS-scoped** — same posture as `platform_admins` itself
(no `account_id` to scope by; gated at the application layer, not Postgres
policy).

Every admin mutation (schedule/cancel deletion, add/remove admin) writes one
row, inside the same transaction/function as the mutation itself — mirrors
how the existing `SECURITY DEFINER` functions already re-check
`platform_admins` membership themselves; the log write belongs at that same
layer, not bolted on separately in the Server Action.

**Visibility**: an "Activity" view inside `/admin` only — chronological,
admin-only, never exposed to the Engineer whose Account it concerns.

**Retention**: indefinite, no purge — consistent with the app having no
general audit-log or data-retention mechanism elsewhere (Phase 4 ticket 05
already declined one for Engineer-facing activity; this scoped, admin-only
log doesn't reopen that).

### Consequences for the spec

- New migration: `admin_audit_log` table + `GRANT` for `app_runtime`.
- Every function/action from tickets 02–03 gains one `INSERT` into
  `admin_audit_log`.
- `/admin/activity` route, admin-only, read-only list.
