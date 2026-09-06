# Auth implementation approach

Type: grilling
Status: open
Blocked by: 05

## Question

The method is fixed (email + password, with reset). Decide **how** it is built,
using ticket 04's findings and the store chosen in ticket 05.

The account-lifecycle ticket (02) has fixed the **product** parameters this
implementation must meet — treat these as given, not open:

- 7-day sliding session, no "remember me", no absolute cap; a revocable
  per-device session list ("sign out everywhere"); reset and deliberate password
  change both revoke all other sessions.
- Password rules: min 10 chars, no composition rules, top-~1,000 common-password
  block.
- Abuse controls: escalating throttle per account + IP on failed logins (no
  permanent lockout), per-IP hourly caps on signup / reset / resend, ~60s
  per-address resend cooldown; generic "email or password is incorrect".
- The five transactional emails and their token lifetimes (verify 24h, reset 1h
  single-use), and no-enumeration on reset.

Still to decide here:

- **Build vs. library vs. delegated**: hand-rolled against the chosen store; an
  auth library (Auth.js, better-auth, …); or the store's own auth
  (e.g. Supabase Auth) if ticket 05 lands there. Note the fixed parameters above
  lean toward DB-backed sessions (the per-device list) over a stateless JWT.
- **Session mechanism**: cookie-wrapped opaque session id vs. JWT, and how the
  check behaves across Next.js 16 server components, route handlers, and proxy.
- **The account id**: auth must yield a stable id that becomes the account key
  on every row (ticket 06). Confirm the chosen approach gives one that never
  changes for the life of the Account.
- **Password storage**: hashing (argon2/bcrypt) — self-managed or handled by the
  library/store.
- **Reset + verification email delivery**: which transactional email path
  (Resend, Postmark, SES, the store's built-in), given East African
  deliverability.

Resolve by naming the approach, the session mechanism, and the email path.
