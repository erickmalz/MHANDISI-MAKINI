import { Plus } from "@phosphor-icons/react/dist/ssr";
import { listProjects } from "@/lib/data";
import { financialHealth } from "@/lib/finance";
import { getT, pageTitle } from "@/lib/i18n/server";
import { getCurrentStage } from "@/lib/project-view";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import type { PickerItem } from "@/lib/project-picker";
import { ProjectPicker } from "./_components/ProjectPicker";

export const generateMetadata = pageTitle("picker.pageTitle");

/**
 * The engineer works one project at a time. After signing in they land here to
 * choose which project to open; the picker identifies each project and flags
 * which ones need attention, but never shows project figures side by side.
 *
 * Projects are RLS-scoped to the signed-in engineer's Account (ticket 08 §3).
 */
export default async function ChooseProjectPage() {
  const t = await getT();
  const projects = await listProjects();
  const items: PickerItem[] = projects.map((project) => {
    const currentStage = getCurrentStage(project);
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      clientName: project.clientName,
      site: project.site,
      health: currentStage ? financialHealth(currentStage.financials) : null,
      alertCount: project.alerts.length,
    };
  });

  return (
    <PageFrame width="reading">
      <PageHeader
        title={t("picker.title")}
        subtitle={t("picker.subtitle")}
        actions={
          projects.length > 0 ? (
            <Button variant="secondary" href="/projects/new">
              <Plus size={20} aria-hidden="true" />
              {t("picker.newProject")}
            </Button>
          ) : undefined
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-card p-8 text-center">
          <h2 className="text-lg font-bold text-card-foreground">{t("picker.empty.title")}</h2>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            {t("picker.empty.body")}
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="primary" href="/projects/new">
              <Plus size={20} aria-hidden="true" />
              {t("picker.empty.action")}
            </Button>
          </div>
        </div>
      ) : (
        <ProjectPicker projects={items} />
      )}
    </PageFrame>
  );
}
