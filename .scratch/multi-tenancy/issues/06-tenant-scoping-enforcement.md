# Tenant-scoping enforcement: making cross-account access impossible

Type: grilling
Status: open
Blocked by: 05

## Question

This is the security-critical decision that follows from "shared database +
account key." One Engineer must **never** read or write another Engineer's
rows — not through a bug, a missing `where` clause, a crafted request, or an id
guessed from a URL (`/projects/[id]` today takes a bare id).

Decide:

- **Enforcement layer**: database row-level security (Postgres RLS, keyed off
  the session's account id); a single data-access module that every read and
  write must go through and that always injects the account filter; an ORM
  global scope / middleware; or defence in depth across more than one of these.
- **Where the current account id comes from** on each request, and how it is
  bound to the query context (server component, route handler, background job).
- **Id exposure**: do record ids stay sequential/guessable (with enforcement
  making guessing harmless) or become non-enumerable (UUID/nanoid)? The app
  currently routes on human-readable slugs like `mbezi-beach-residence`.
- **The failure mode**: what happens when a request references a record from
  another Account — 404 (don't reveal existence) vs 403.
- **How it is tested**: the check that proves isolation holds.

Resolve by fixing the enforcement mechanism and the id/failure-mode rules.
