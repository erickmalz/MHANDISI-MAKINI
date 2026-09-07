import "server-only";

import { Resend } from "resend";

/**
 * Transactional email. Phase 1 sends only the verification / welcome mail;
 * Phase 4 adds reset, email-change, deletion and dormancy (the five total from
 * ticket 02).
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
