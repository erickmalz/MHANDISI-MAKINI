# Admin entry point, login page & session model

Type: grilling
Status: resolved

## Question

How does a Platform Admin reach the portal — a visible button, a distinct
login page — and what does "its own separate authentication" mean
architecturally, given v1's silent flag-based redirect on the shared
`/sign-in` form?

## Answer

**Entry point**: add a small, unobtrusive link on the existing `/sign-in`
page (e.g. "Admin sign in" — exact copy/placement is a UI-polish detail for
whoever builds it) routing to a new `/admin/login` page.

**`/admin/login`**: its own route and form — own layout (consistent with
`/admin`'s existing route-group styling, not `AppChrome`), not mixed into
the Engineer sign-in form. Submits through the same `authClient.signIn.email`
(better-auth) call `/sign-in` already uses. **No new credential store** — a
Platform Admin is still one `auth_user` row, just reached through a
different door. On success, `/admin/login` routes unconditionally to
`/admin`, skipping `resolvePostSignInRedirect`'s Choose-Project branch
entirely (anyone submitting this form is explicitly trying to reach the
portal). If the authenticated identity isn't flagged in `platform_admins`,
same no-enumeration posture as everywhere else: redirect to `/`, no distinct
error revealing whether the account exists or is an admin.

**`/sign-in`'s existing silent redirect stays** — a Platform Admin who signs
in the normal way still lands on `/admin`. The new page is an *additional*
front door, not a replacement; one person can be both an Engineer and an
admin.

**Session/credential mechanism is unchanged**: same better-auth session,
same `requirePlatformAdmin()` guard, no separate cookie or session shape. No
MFA, IP allowlisting, or shortened session lifetime in this rebuild — real
security value there would come from having more than one admin in practice
or riskier mutations than exist today; revisit as its own ticket if that
changes.

**Closes a known gap** (`status.md`'s "known gaps"): `proxy.ts`'s optimistic
cookie-presence redirect currently sends any authenticated visitor away from
an auth page to `/`, which dead-ends a Platform-Admin-only identity (no
Engineer Account) in `NotAuthenticatedError`. With `/admin/login` now the
purpose-built door for that identity, `proxy.ts`'s optimistic check should
send an authenticated visitor hitting `/admin/login` to `/admin` instead of
`/`.

**Housekeeping, not a decision**: `requirePlatformAdmin()` (`session.ts`)
still has the `TEMP DIAGNOSTIC — remove after confirming production
behaviour` `console.error` from the original build. Remove it while this
route is touched.

### Consequences for the spec

- Two files: `src/app/admin/login/page.tsx` (or similar), and a small edit
  to `src/app/sign-in/page.tsx` for the link.
- `resolvePostSignInRedirect` gets a sibling (or a parameter) for the
  unconditional `/admin`-on-success path from the new form.
- `proxy.ts` gains one more path check.
