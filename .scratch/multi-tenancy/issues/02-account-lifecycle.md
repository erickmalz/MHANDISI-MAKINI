# Account lifecycle: sign up, sign in, reset, delete, first run

Type: grilling
Status: resolved
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

## Answer

The full end-to-end life of an Account. Every item below is a **product**
decision; the *implementation* (auth library vs. hand-rolled, hashing, the
transactional email provider) belongs to
[Auth implementation approach](./07-auth-implementation-approach.md), which now
inherits the session, password-rule, abuse-control and email-delivery items here
as fixed inputs rather than open questions.

### Sign up

- **Collected**: full name, email, phone number, password — all required.
- **Phone**: stored only, not verified (no SMS gateway in v1), never used for
  login or auth. A contact field, useful on generated reports and a future
  SMS-alerts feature; validated for plausible format only.
- **Email** is the sole identifier and the sole auth channel.
- **Password rules**: minimum 10 characters, no composition rules, rejected if
  it appears in the top ~1,000 common/breached passwords (NIST-style).
- **Terms / Privacy**: one required checkbox accepting the Terms of Service and
  Privacy Policy (the global legal pages). The acceptance timestamp and the
  policy version are recorded on the Account. The *content* of those pages and
  who drafts them is the data-protection ticket's concern, not this one.
- On signup, one email goes out carrying the verification link; it doubles as
  the welcome email.

### Email verification — a soft gate

- The Engineer signs in and works **immediately**: full read/write, including
  creating Projects and entering financials.
- Disabled while unverified: password reset, and changing the account email.
- A persistent "verify your email" banner shows throughout.
- **At 7 days still unverified**: login still succeeds but lands on a full-screen
  "Verify your email to continue" (a resend-link button and the support
  address); no further app access until the link is clicked. Nothing is ever
  deleted for non-verification — the Account simply waits.

### Sign in and sessions

- **7-day sliding session** (refreshes on each use). No "remember me" checkbox.
  No absolute maximum age.
- **Login failure message is always generic** — "Email or password is
  incorrect" — with no distinction between an unknown email and a wrong
  password, matching the no-enumeration stance on password reset.
- **Abuse controls**: an escalating throttle per account + IP after ~5 failed
  logins (cleared on success), no permanent account lockout (it would let anyone
  knowing an email lock out a real Engineer); per-IP hourly caps on signup,
  reset and resend requests; a ~60-second per-address cooldown on resends. No
  CAPTCHA in v1.
- **Devices list** in settings: each active session with a last-used time and a
  device/browser label, an individual "sign out" per row, and one "sign out all
  other devices" button.

### Expired session mid-task

- A failed **write** returns the Engineer to a full-page "Your session ended —
  please sign in again" screen with the entered values still recoverable on the
  page. A failed **read** is a plain redirect to login.
- This applies uniformly to **every** data-entry form and wizard, not just the
  multi-step ones. A write that did not land never shows "Saved" (the design
  system's honesty rule).

### Password reset

- The request screen always says "if that email is registered, a link is on its
  way" — no account enumeration. Unavailable while the email is unverified.
- The link is **single-use, 1-hour expiry**.
- On a successful reset: **all other sessions are revoked**, and the email is
  **marked verified** (a successful reset from that inbox proves control of it).

### Password change while signed in

- Requires re-entering the current password. On success, **all other sessions
  are revoked**; the device that made the change stays signed in.

### Email change

- Requires re-entering the current password to initiate.
- Takes effect only when the link sent to the **new** address is clicked; until
  then the old address remains the login. The old address receives a notice
  email. Sessions are **not** revoked by an email change.

### First run (a brand-new Account, zero Projects)

- The empty "Choose a project" screen, with one prominent "Create your first
  project" and a one-paragraph "what this app does".
- No seeded data, no sample Project, no setup wizard (consistent with the
  "nothing is seeded" decision on what an Account owns).

### Data export

- An "Export my data" action in settings, available at any time, **and** the
  same export generated as step one of the deletion flow.
- Format for v1: a single JSON file of the Account's rows. A readable PDF/CSV
  pack is a later nicety.

### Account deletion

- Self-serve from settings: re-enter the password **and** type a confirmation
  phrase; the data export is offered first.
- The Account is marked **scheduled for deletion** with a **30-day grace
  period**. Any sign-in within the window cancels the deletion. Sessions stay
  active during the window (signing in is the documented way to cancel).
- After 30 days: a **hard delete** of every row carrying that account key, and
  all sessions. A "deletion scheduled" email (with cancel instructions) and a
  "deletion completed" email are sent.

### Re-registering an email after deletion

- **During the 30-day grace window**: blocked — the email still belongs to the
  scheduled Account, and signing in reclaims it.
- **After the hard delete**: fully free to register a fresh, empty Account with
  no connection to the destroyed data.

### Dormant / abandoned accounts

- No automated deletion (silently destroying a client's financial history
  because an Engineer took a long break between Projects is unacceptable).
- A single reminder email at 6 months of inactivity. The 7-day unverified pause
  is separate and still applies.

### Lost access to the account email entirely

- **Not supported in v1**, stated plainly on the reset screen. A solo maintainer
  cannot safely run manual identity recovery for a free product holding
  third-party financial data, and any weak recovery channel is a takeover
  vector. The mitigations are the 7-day sliding session and the Devices list.

### The complete set of transactional emails (only these five)

1. Verify email / welcome — link, 24-hour expiry, resendable.
2. Password reset — link, 1-hour expiry, single-use.
3. Email change — verification link to the new address, plus a notice to the old.
4. Deletion scheduled (with cancel instructions) and deletion completed.
5. Dormancy reminder — at 6 months of inactivity.

No marketing or digest mail in v1.
