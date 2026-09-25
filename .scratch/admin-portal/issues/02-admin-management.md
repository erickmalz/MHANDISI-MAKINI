# Admin-management — create, list, remove Platform Admins

Type: grilling
Status: resolved

## Question

Now that there's a real portal, can a Platform Admin manage other admins
from inside it, and what does the `platform_admins` table need to support
that?

## Answer

**`/admin` gains an "Admins" view**: lists every current `platform_admins`
row (email via joined `auth_user`, `createdAt`), an **Add admin** action
(enter an existing `auth_user`'s email; insert into `platform_admins` if
found, generic "not found" error otherwise — same no-enumeration instinct
used elsewhere), and a **Remove** action per row (hard-delete the row —
mirrors the table's existing no-soft-delete design; nothing else references
it).

**Guard rail**: an admin cannot remove their own row from the UI (prevents
accidental self-lockout). Removing the *last* remaining admin is still
allowed if done by someone else — provisioning the very first admin is
already a deliberate, out-of-band act, so the table being briefly emptied by
a human choice isn't a new risk this needs to prevent.

**Bootstrapping stays out-of-band**: the first Platform Admin is still
provisioned by hand (the documented manual `INSERT` in `status.md`) — nobody
can grant themselves the flag before one exists.

**Schema change**: `platform_admins` gains `added_by` (nullable `text` FK to
`auth_user.id`; null for the out-of-band-provisioned first row) for
provenance. Feeds the audit log (ticket 05) rather than duplicating it.

### Consequences for the spec

- New DAL functions: `listPlatformAdmins`, `addPlatformAdmin(email)`,
  `removePlatformAdmin(authUserId)`.
- Migration: `ALTER TABLE platform_admins ADD COLUMN added_by ...`.
- `/admin/admins` route (list + add + remove), guarded by
  `requirePlatformAdmin()` like every other admin route.
