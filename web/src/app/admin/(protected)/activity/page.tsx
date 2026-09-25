import type { Metadata } from "next";

import { requirePlatformAdmin } from "@/lib/auth/session";
import { listAdminAuditLog } from "@/lib/data/platform-admin";
import { formatDate } from "@/lib/format";
import { PageFrame } from "@/components/ui/PageFrame";

export const metadata: Metadata = { title: "Activity" };

const ACTION_LABEL: Record<string, string> = {
  schedule_deletion: "scheduled deletion of",
  cancel_deletion: "cancelled deletion of",
  add_admin: "added admin",
  remove_admin: "removed admin",
};

/**
 * Read-only audit trail (`.scratch/admin-portal/` ticket 05) of every
 * Platform Admin action — never exposed to the Engineer an entry concerns.
 */
export default async function AdminActivityPage() {
  const { user } = await requirePlatformAdmin();
  const entries = await listAdminAuditLog(user.id);

  return (
    <PageFrame width="working">
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-bold text-foreground">Activity</h1>
        <p className="mt-1 text-muted-foreground">
          Every Platform Admin action, newest first.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          No admin activity yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
              <span className="font-bold text-card-foreground">{e.actorEmail}</span>{" "}
              {ACTION_LABEL[e.action] ?? e.action}{" "}
              <span className="font-bold text-card-foreground">
                {e.targetAccountName ?? e.targetUserEmail ?? "—"}
              </span>
              <span className="ml-2 text-muted-foreground">{formatDate(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
