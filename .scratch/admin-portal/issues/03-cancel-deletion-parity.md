# Deletion-action parity — cancel scheduled deletion

Type: grilling
Status: resolved

## Question

Admin can schedule an Account's deletion (v1) but not undo it — should
"cancel" become an admin action too?

## Answer

**Yes.** Add `cancelAccountDeletionForAdmin` in
`src/lib/data/platform-admin.ts`, mirroring how
`scheduleAccountDeletionForAdmin` already invokes its own
`SECURITY DEFINER` counterpart — this one invokes the existing
`app.cancel_account_deletion` function (migration `0005`) the same way the
self-serve "cancel by signing in" flow does. A `cancelAccountDeletionAction`
Server Action surfaces on the Account detail page as a "Cancel scheduled
deletion" button whenever `deletionScheduledAt` is set. No new lifecycle
decision — this wires an action that already exists for the Engineer's own
self-serve cancel through to the admin side.

### Consequences for the spec

- `src/app/admin/actions.ts` gains `cancelAccountDeletionAction`.
- Account detail page conditionally renders "Schedule deletion" or "Cancel
  scheduled deletion" based on `deletionScheduledAt`.
