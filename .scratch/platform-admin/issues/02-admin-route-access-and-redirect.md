# Admin route access, redirect & unauthorized handling

Type: grilling
Status: resolved

## Question

How does someone actually reach the admin page through the existing
sign-in flow, and what happens if a non-admin (or an unauthenticated
visitor) ends up at the admin route directly?

## Answer

**Same sign-in form, same better-auth session — no separate admin auth
flow.** After `authClient.signIn.email` succeeds
(`web/src/app/sign-in/page.tsx`), the sign-in flow checks whether the
signed-in `auth_user` has a row in `platform_admins` (ticket 01). If it
does, redirect to `/admin`; otherwise redirect to `/` (Choose Project),
exactly as today. "Accessed at the login page" means literally that: the
same email/password form is the only entry point, and the destination
after it branches on the flag.

**`/admin` is protected the same way every other authenticated route
already is** — through the single authoritative `getSession()`-backed,
`server-only`, `React.cache()`-wrapped DAL helper (ADR 0002), extended to
also check `platform_admins`, not the optimistic `proxy.ts`
cookie-presence check alone.

**A non-admin (including an unauthenticated visitor) hitting `/admin`
directly is redirected to `/`** — no distinct 403/404 page. Same
no-enumeration instinct already used for the sign-in form's generic "Email
or password is incorrect" error: nothing about the response reveals that
`/admin` exists or is protected differently from any other route.

### Consequences for the spec

- The sign-in Server Action / client handler gains a branch: check
  `platform_admins` for the just-authenticated user before choosing the
  redirect target.
- The DAL session-check helper gains a variant (or an added field on its
  return value) exposing "is this session a Platform Admin," consumed by
  `/admin`'s layout or page to redirect non-admins to `/` server-side.
- No new middleware/proxy logic — `proxy.ts` stays an optimistic
  cookie-presence check only, per ADR 0002; the authoritative check still
  happens in the DAL helper.
