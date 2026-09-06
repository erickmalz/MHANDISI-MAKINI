import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getProject } from "@/lib/mock-data";
import { FundingRequestBuilder } from "./_components/FundingRequestBuilder";

export default async function NewFundingRequestPage({
  params,
}: PageProps<"/projects/[id]/funding/new">) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Create funding request
      </h1>

      <FundingRequestBuilder project={project} />
    </main>
  );
}
