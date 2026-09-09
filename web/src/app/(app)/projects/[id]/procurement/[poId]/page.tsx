import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getPurchaseOrder } from "@/lib/data";
import { PurchaseOrderDetail } from "./_components/PurchaseOrderDetail";

export default async function PurchaseOrderPage({ params }: PageProps<"/projects/[id]/procurement/[poId]">) {
  const { id, poId } = await params;

  const po = await getPurchaseOrder(poId);
  if (!po || po.projectId !== id) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/procurement`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Purchase orders
      </Link>

      <PurchaseOrderDetail po={po} />
    </main>
  );
}
