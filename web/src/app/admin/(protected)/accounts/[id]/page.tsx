import type { Metadata } from "next";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cancelAccountDeletionAction,
  scheduleAccountDeletionAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { getAccountForAdmin } from "@/lib/data/platform-admin";
import { formatDate } from "@/lib/format";
import { PageFrame } from "@/components/ui/PageFrame";

export const metadata: Metadata = { title: "Account" };

/**
 * The Account detail (`.scratch/platform-admin/` ticket 03) — the same
 * Account-level metadata as the list, plus Terms/Privacy acceptance and the
 * one admin-triggerable action: scheduling deletion.
 */
export default async function AdminAccountDetailPage({
  params,
}: PageProps<"/admin/accounts/[id]">) {
  const { id } = await params;
  const { user } = await requirePlatformAdmin();
  const account = await getAccountForAdmin(user.id, id);
  if (!account) notFound();

  return (
    <PageFrame width="reading">
      <Link
        href="/admin"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Accounts
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        {account.fullName}
      </h1>

      <Card className="mb-6 flex flex-col gap-2">
        <Row label="Email" value={account.email} />
        <Row label="Phone" value={account.phone} />
        <Row label="Projects" value={String(account.projectCount)} />
        <Row label="Joined" value={formatDate(account.createdAt)} />
        <Row
          label="Terms accepted"
          value={
            account.acceptedTermsVersion && account.acceptedTermsAt
              ? `${account.acceptedTermsVersion} on ${formatDate(account.acceptedTermsAt)}`
              : "Not recorded"
          }
        />
        <Row
          label="Deletion"
          value={
            account.deletionScheduledAt
              ? `Scheduled for ${formatDate(account.deletionScheduledAt)}`
              : "Not scheduled"
          }
        />
      </Card>

      {!account.deletionScheduledAt ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-card-foreground">
            Danger zone
          </h2>
          <p className="text-sm text-muted-foreground">
            Schedules this Account for permanent deletion 30 days from now —
            the same grace period the Engineer&rsquo;s own self-serve
            deletion uses. Signing back in before then cancels it. The
            Engineer is notified by email either way.
          </p>
          <form action={scheduleAccountDeletionAction.bind(null, account.accountId)}>
            <Button variant="danger-quiet" type="submit">
              Schedule deletion
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-card-foreground">
            Deletion scheduled
          </h2>
          <p className="text-sm text-muted-foreground">
            Cancelling notifies the Engineer by email that support undid it.
          </p>
          <form action={cancelAccountDeletionAction.bind(null, account.accountId)}>
            <Button variant="secondary" type="submit">
              Cancel scheduled deletion
            </Button>
          </form>
        </Card>
      )}
    </PageFrame>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold text-card-foreground">{value}</span>
    </div>
  );
}
