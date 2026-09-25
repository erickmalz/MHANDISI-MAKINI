import "server-only";

import { Resend } from "resend";

import { formatDate } from "@/lib/format";

/**
 * Transactional email. Phase 1 sends verification / welcome and reset;
 * Slice 2.8 adds the two deletion emails. Email-change and dormancy (the
 * five total from ticket 02) are still outstanding.
 *
 * With no RESEND_API_KEY set (the default in development) the message is logged
 * to the server console instead of sent, so the whole signup flow works
 * offline. Deliverability in production depends on SPF/DKIM/DMARC on a
 * dedicated sending subdomain (ADR 0002), not on the provider.
 */
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Mhandisi Makini <no-reply@localhost>";
const resend = apiKey ? new Resend(apiKey) : null;

async function send(to: string, subject: string, text: string) {
  if (!resend) {
    console.info(
      `\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`,
    );
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, text });
  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }
}

export async function sendVerificationEmail(to: string, url: string) {
  await send(
    to,
    "Verify your email — Mhandisi Makini",
    [
      "Welcome to Mhandisi Makini.",
      "",
      "Confirm this is your email address by opening the link below. It is",
      "valid for 24 hours.",
      "",
      url,
      "",
      "You can keep using the app before verifying — this only unlocks",
      "password reset and changing your email.",
    ].join("\n"),
  );
}

export async function sendResetPasswordEmail(to: string, url: string) {
  await send(
    to,
    "Reset your password — Mhandisi Makini",
    [
      "Someone asked to reset the password for this account.",
      "If that was you, open the link below. It is valid for one hour and can",
      "be used once.",
      "",
      url,
      "",
      "If it was not you, no action is needed — your password is unchanged.",
    ].join("\n"),
  );
}

/**
 * Sent the moment self-serve deletion is requested (ticket 02 email #4).
 * `deleteAt` is the end of the 30-day grace period. There is no cancel link —
 * "sign back in" is the one documented way to cancel, so the instructions
 * just say that.
 */
export async function sendDeletionScheduledEmail(to: string, deleteAt: Date) {
  await send(
    to,
    "Your account is scheduled for deletion — Mhandisi Makini",
    [
      "You asked to delete your Mhandisi Makini account.",
      "",
      `Unless you sign back in before ${formatDate(deleteAt)}, your account`,
      "and every Project, financial record and document in it will be",
      "permanently deleted.",
      "",
      "Changed your mind? Just sign in again — that cancels the deletion.",
    ].join("\n"),
  );
}

/**
 * Sent when a Platform Admin (not the Engineer themselves) schedules the
 * deletion (`.scratch/admin-portal/` ticket 04) — deliberately a separate
 * function from `sendDeletionScheduledEmail` rather than a reused template,
 * since that one's copy assumes the Engineer asked for this themselves.
 */
export async function sendAdminScheduledDeletionEmail(to: string, deleteAt: Date) {
  await send(
    to,
    "Your account is scheduled for deletion — Mhandisi Makini",
    [
      "Mhandisi Makini support has scheduled your account for deletion.",
      "",
      `Unless you sign back in before ${formatDate(deleteAt)}, your account`,
      "and every Project, financial record and document in it will be",
      "permanently deleted.",
      "",
      "Changed your mind, or think this was a mistake? Sign in again to",
      "cancel it, or reply to this email.",
    ].join("\n"),
  );
}

/** The admin-triggered mirror of the above, sent when a Platform Admin cancels a scheduled deletion (ticket 04). There is no self-serve equivalent — signing in already cancels it silently — so this is the only "cancel" email in the app. */
export async function sendAdminCancelledDeletionEmail(to: string) {
  await send(
    to,
    "Your account deletion has been cancelled — Mhandisi Makini",
    [
      "Mhandisi Makini support has cancelled the scheduled deletion of your",
      "account. It is no longer set to be deleted.",
      "",
      "If you have any questions, reply to this email.",
    ].join("\n"),
  );
}

/** Sent by the maintenance sweep right before the row is hard-deleted (email #4b). */
export async function sendDeletionCompletedEmail(to: string) {
  await send(
    to,
    "Your account has been deleted — Mhandisi Makini",
    [
      "Your Mhandisi Makini account and everything in it have now been",
      "permanently deleted, as you requested.",
      "",
      "You're welcome to create a new account at any time.",
    ].join("\n"),
  );
}
