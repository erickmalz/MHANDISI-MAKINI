import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createStageTemplateAction } from "@/app/actions/stage-templates";
import { StageTemplateForm } from "../_components/StageTemplateForm";

export default function NewStageTemplatePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/stage-templates"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Stage templates
      </Link>

      <h1 className="mb-1 text-[1.75rem] font-bold text-foreground">New template</h1>
      <p className="mb-6 text-muted-foreground">
        Names and units only — no quantities, prices, or costs. Those are
        filled in per-project after applying the template.
      </p>

      <StageTemplateForm
        action={createStageTemplateAction}
        submitLabel="Save template"
        cancelHref="/stage-templates"
      />
    </main>
  );
}
