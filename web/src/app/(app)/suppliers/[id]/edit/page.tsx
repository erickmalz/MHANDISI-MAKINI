import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateSupplierAction } from "@/app/actions/suppliers";
import { getSupplierInput } from "@/lib/data";
import { SupplierForm } from "../../_components/SupplierForm";

export default async function EditSupplierPage({
  params,
}: PageProps<"/suppliers/[id]/edit">) {
  const { id } = await params;
  const supplier = await getSupplierInput(id);
  if (!supplier) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/suppliers"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Supplier register
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Edit {supplier.name}
      </h1>

      <SupplierForm
        action={updateSupplierAction.bind(null, id)}
        initial={supplier}
        submitLabel="Save changes"
        cancelHref="/suppliers"
      />
    </main>
  );
}
