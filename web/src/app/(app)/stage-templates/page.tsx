import Link from "next/link";
import { ArrowLeft, PencilSimple, Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { deleteStageTemplateAction } from "@/app/actions/stage-templates";
import { listStageTemplates } from "@/lib/data";
import { Button } from "@/components/ui/Button";

/**
 * The per-Account Stage Template register (Operational Control decision 2).
 * Starts empty, like Suppliers/Subcontractors — a template is a starting
 * point applied at "Create Project," never a live link to any project.
 */
export default async function StageTemplatesPage() {
  const templates = await listStageTemplates();

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
          <h1 className="text-[1.75rem] font-bold text-foreground">Stage templates</h1>
          <p className="mt-1 text-muted-foreground">
            Reusable Stage → Task → Material lists. Apply one when creating a
            project, or build one from scratch.
          </p>
        </div>
        <Button variant="primary" href="/stage-templates/new">
          <Plus size={20} aria-hidden="true" />
          New template
        </Button>
      </header>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          No templates yet. Build one from scratch, or open a project and use
          &ldquo;Save as template&rdquo; to copy its stages and tasks.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-bold text-card-foreground">{t.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.stageCount} stage{t.stageCount === 1 ? "" : "s"} ·{" "}
                  {t.taskCount} task{t.taskCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/stage-templates/${t.id}/edit`}
                  className="inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  <PencilSimple size={16} aria-hidden="true" />
                  Edit
                </Link>
                <form action={deleteStageTemplateAction.bind(null, t.id)}>
                  <button
                    type="submit"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-destructive"
                  >
                    <Trash size={16} aria-hidden="true" />
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
