import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateSubcontractorAction } from "@/app/actions/subcontractors";
import { getSubcontractorInput } from "@/lib/data";
import { SubcontractorForm } from "../../_components/SubcontractorForm";

export default async function EditSubcontractorPage({
  params,
}: PageProps<"/subcontractors/[id]/edit">) {
  const { id } = await params;
  const subcontractor = await getSubcontractorInput(id);
  if (!subcontractor) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/subcontractors"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Subcontractor register
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Edit {subcontractor.name}
      </h1>

      <SubcontractorForm
        action={updateSubcontractorAction.bind(null, id)}
        initial={subcontractor}
        submitLabel="Save changes"
        cancelHref="/subcontractors"
      />
    </main>
  );
}
