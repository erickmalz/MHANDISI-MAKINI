import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getProject } from "@/lib/mock-data";
import { PurchaseOrderBuilder } from "./_components/PurchaseOrderBuilder";

export default async function NewPurchaseOrderPage({ params }: PageProps<"/projects/[id]/procurement/new">) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${project.id}/procurement`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Purchase orders
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Create purchase order
      </h1>

      <PurchaseOrderBuilder project={project} />
    </main>
  );
}
