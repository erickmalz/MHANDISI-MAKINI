# Account lifecycle: sign up, sign in, reset, delete, first run

Type: grilling
Status: open
Blocked by: —

## Question

Decide the full lifecycle of an Account, end to end.

- **Sign up**: what is collected — name, email, password only? Anything else
  (company, phone, country)? Is email **verification** required before the
  Engineer can use the app, or can they start immediately and verify later?
- **Sign in / out**: session lifetime, "remember me", what happens on an
  expired session mid-task (the design system's honesty rules matter here —
  never claim a save that didn't happen).
- **Password reset**: email link flow. Any lockout / rate-limiting stance.
- **First run**: a brand-new Account has zero projects. What does the Engineer
  see on first login — the empty "Choose a project" screen with a prominent
  "Create your first project", a short guided setup, or a sample project they
  can explore and delete? (Ties to ticket 08.)
- **Account deletion**: an open product must let an Engineer delete their
  Account. With a shared database this means hard-deleting every row with their
  account key. Immediate, or a grace period? Is an export offered first?
- **Dormant / abandoned accounts**: any policy, or none for v1?

Resolve by specifying each step concretely enough that a build can implement it
without further product input.
