import type { Metadata } from "next";

import { removeAdminAction } from "@/app/admin/actions";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { listPlatformAdmins } from "@/lib/data/platform-admin";
import { formatDate } from "@/lib/format";
import { PageFrame } from "@/components/ui/PageFrame";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AddAdminForm } from "./AddAdminForm";

export const metadata: Metadata = { title: "Admins" };

/**
 * Admin-management (`.scratch/admin-portal/` ticket 02) — list every
 * Platform Admin, add one by email, remove one. The caller can't remove
 * their own row (the button is simply omitted for it, same "guard by not
 * offering the control" idiom as elsewhere in this app — no confirmation
 * dialog anywhere in the codebase, so none is introduced here either).
 */
export default async function AdminAdminsPage() {
  const { user } = await requirePlatformAdmin();
  const admins = await listPlatformAdmins(user.id);

  return (
    <PageFrame width="working">
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-bold text-foreground">Admins</h1>
        <p className="mt-1 text-muted-foreground">
          Everyone with Platform Admin access.
        </p>
      </header>

      <Card className="mb-6">
        <AddAdminForm />
      </Card>

      <ul className="flex flex-col gap-3">
        {admins.map((a) => (
          <li
            key={a.authUserId}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="font-bold text-card-foreground">{a.email}</div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                Added {formatDate(a.createdAt)}
                {a.addedByEmail ? ` by ${a.addedByEmail}` : " (out-of-band)"}
              </p>
            </div>
            {a.authUserId !== user.id && (
              <form action={removeAdminAction.bind(null, a.authUserId)}>
                <Button variant="danger-quiet" type="submit">
                  Remove
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
