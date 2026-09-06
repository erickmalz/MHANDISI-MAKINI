# Auth implementation approach

Type: grilling
Status: open
Blocked by: 05

## Question

The method is fixed (email + password, with reset). Decide **how** it is built,
using ticket 04's findings and the store chosen in ticket 05.

- **Build vs. library vs. delegated**: hand-rolled against the chosen store; an
  auth library (Auth.js, Lucia, better-auth, …); or the store's own auth
  (e.g. Supabase Auth) if ticket 05 lands there.
- **Session model**: cookie session vs. JWT; lifetime; refresh; how it behaves
  across Next.js 16 server components, route handlers, and middleware.
- **The account id**: auth must yield a stable id that becomes the account key
  on every row (ticket 06). Confirm the chosen approach gives one that never
  changes for the life of the Account.
- **Password storage**: hashing (argon2/bcrypt) — self-managed or handled by the
  library/store.
- **Reset + verification email delivery**: which transactional email path
  (Resend, Postmark, SES, the store's built-in), given East African
  deliverability.
- **Abuse controls**: rate-limiting sign-in and reset; minimum password rules.

Resolve by naming the approach, the session model, and the email path.
