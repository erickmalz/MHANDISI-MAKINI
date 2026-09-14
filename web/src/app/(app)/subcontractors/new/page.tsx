import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createSubcontractorAction } from "@/app/actions/subcontractors";
import { SubcontractorForm } from "../_components/SubcontractorForm";

export default function NewSubcontractorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/subcontractors"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Subcontractor register
      </Link>

      <h1 className="mb-1 text-[1.75rem] font-bold text-foreground">
        Add subcontractor
      </h1>
      <p className="mb-6 text-muted-foreground">
        Only the name is required. Everything else can be filled in later.
      </p>

      <SubcontractorForm
        action={createSubcontractorAction}
        submitLabel="Add subcontractor"
        cancelHref="/subcontractors"
      />
    </main>
  );
}
