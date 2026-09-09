import Link from "next/link";
import { ArrowLeft, PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { listSuppliers } from "@/lib/data";
import { Button } from "@/components/ui/Button";

/**
 * The per-Account Supplier Register (guidelines §25). Reference data reused
 * across every project — a Purchase Order names a supplier from here.
 */
export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Choose a project
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold text-foreground">
            Supplier register
          </h1>
          <p className="mt-1 text-muted-foreground">
            Businesses you buy materials from. Reused across every project.
          </p>
        </div>
        <Button variant="primary" href="/suppliers/new">
          <Plus size={20} aria-hidden="true" />
          Add supplier
        </Button>
      </header>

      {suppliers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          No suppliers yet. Add the first one — you can also add a supplier while
          raising a purchase order.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {suppliers.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-card-foreground">{s.name}</span>
                  {s.status === "inactive" && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {[s.contactPerson, s.phone, s.location].filter(Boolean).join(" · ") ||
                    "No contact details"}
                </p>
              </div>
              <Link
                href={`/suppliers/${s.id}/edit`}
                className="inline-flex min-h-12 shrink-0 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                <PencilSimple size={16} aria-hidden="true" />
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
