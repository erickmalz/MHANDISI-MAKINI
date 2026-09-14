import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateStageTemplateAction } from "@/app/actions/stage-templates";
import { getStageTemplateInput } from "@/lib/data";
import { StageTemplateForm } from "../../_components/StageTemplateForm";

export default async function EditStageTemplatePage({
  params,
}: PageProps<"/stage-templates/[id]/edit">) {
  const { id } = await params;
  const template = await getStageTemplateInput(id);
  if (!template) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/stage-templates"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Stage templates
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Edit {template.name}
      </h1>
      <p className="mb-6 -mt-4 text-muted-foreground">
        Changes here never affect a project already created from this
        template.
      </p>

      <StageTemplateForm
        action={updateStageTemplateAction.bind(null, id)}
        initial={template}
        submitLabel="Save changes"
        cancelHref="/stage-templates"
      />
    </main>
  );
}
