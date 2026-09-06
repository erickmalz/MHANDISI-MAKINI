# Data store: category and the constraints it must meet

Type: grilling
Status: open
Blocked by: 04

## Question

Phase 1 bucketed the data store into "tech/architecture specifics — a future
implementation-planning effort." That future is now. Using ticket 04's findings,
decide the **category** and the **hard constraints**, not necessarily the exact
product.

- **Category**: managed Postgres + ORM, a backend-as-a-service, or something
  else. Weigh against: the isolation model is fixed (shared DB + account key),
  online-required, free product, a solo maintainer, East African users.
- **Row-level tenant enforcement**: is database-enforced isolation (Postgres
  RLS) a requirement, or is application-layer scoping acceptable if it is the
  single funnel for all data access? (Feeds ticket 06.)
- **Constraints the store must satisfy**: runs with the Next.js 16 app's
  server; supports transactions (the financial model needs them); backups;
  a migration story; affordable at zero and at modest scale.
- **Lock-in tolerance**: how portable must the choice be — is being tied to one
  provider's proprietary features acceptable for speed, or must it stay
  swappable?

Resolve by naming the category, the enforcement requirement, and the constraint
list. Picking the specific product can be a fast-follow once the category is set.
