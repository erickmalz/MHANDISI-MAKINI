import Link from "next/link";

import { requirePlatformAdmin } from "@/lib/auth/session";
import { listAccountsForAdmin } from "@/lib/data/platform-admin";
import { formatDate } from "@/lib/format";

/**
 * The Account list (`.scratch/platform-admin/` ticket 03) — read-only,
 * Account-level metadata only. No Project/financial content is ever
 * queried or shown here.
 */
export default async function AdminAccountsPage() {
  const { user } = await requirePlatformAdmin();
  const accounts = await listAccountsForAdmin(user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-bold text-foreground">Accounts</h1>
        <p className="mt-1 text-muted-foreground">
          Every Engineer&rsquo;s Account across the service.
        </p>
      </header>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          No Accounts yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {accounts.map((a) => (
            <li
              key={a.accountId}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/accounts/${a.accountId}`}
                    className="font-bold text-card-foreground hover:underline"
                  >
                    {a.fullName}
                  </Link>
                  {a.deletionScheduledAt && (
                    <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                      Deletion scheduled
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {a.email} · {a.phone} · {a.projectCount}{" "}
                  {a.projectCount === 1 ? "project" : "projects"} · joined{" "}
                  {formatDate(a.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
