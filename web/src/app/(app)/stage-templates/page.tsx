import { PencilSimple, Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { deleteStageTemplateAction } from "@/app/actions/stage-templates";
import { listStageTemplates } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("stageTemplates.pageTitle");

/**
 * The per-Account Stage Template register (Operational Control decision 2).
 * Starts empty, like Suppliers/Subcontractors — a template is a starting
 * point applied at "Create Project," never a live link to any project.
 */
export default async function StageTemplatesPage() {
  const [templates, t] = await Promise.all([listStageTemplates(), getT()]);

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("stageTemplates.crumbProjects"), href: "/" }]}
        title={t("stageTemplates.pageTitle")}
        subtitle={t("stageTemplates.list.subtitle")}
        actions={
          <>
            <Button variant="primary" href="/stage-templates/new">
              <Plus size={20} aria-hidden="true" />
              {t("stageTemplates.list.new")}
            </Button>
          </>
        }
      />

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("stageTemplates.list.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((tpl) => (
            <li
              key={tpl.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-bold text-card-foreground">{tpl.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("stageTemplates.list.stages", { count: tpl.stageCount })} ·{" "}
                  {t("stageTemplates.list.tasks", { count: tpl.taskCount })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" href={`/stage-templates/${tpl.id}/edit`}>
                  <PencilSimple size={16} aria-hidden="true" />
                  {t("stageTemplates.list.edit")}
                </Button>
                <form action={deleteStageTemplateAction.bind(null, tpl.id)}>
                  <button
                    type="submit"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-destructive rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                  >
                    <Trash size={16} aria-hidden="true" />
                    {t("stageTemplates.list.delete")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
