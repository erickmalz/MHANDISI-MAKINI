import { Flag, MapPin, PencilSimple, Stack } from "@phosphor-icons/react/dist/ssr";

import { ActionMenu, ActionMenuItem } from "@/components/ActionMenu";
import { ProjectNav } from "@/components/ProjectNav";
import { getT } from "@/lib/i18n/server";

/**
 * Who the project is, its sections as tabs, and the rarely used project
 * actions in one menu. Presentational: the project layout supplies the data.
 */
export async function ProjectBar({
  project,
}: {
  project: { id: string; code: string; name: string; clientName: string; site: string };
}) {
  const id = project.id;
  const t = await getT();
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-foreground">{project.name}</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-0 text-sm text-muted-foreground">
              <span>{project.code}</span>
              <span>{project.clientName}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={16} aria-hidden="true" />
                {project.site}
              </span>
            </p>
          </div>
          <ActionMenu label={t("chrome.project.actions")}>
            <ActionMenuItem
              href={`/projects/${id}/edit`}
              icon={<PencilSimple size={20} aria-hidden="true" />}
            >
              {t("chrome.project.edit")}
            </ActionMenuItem>
            <ActionMenuItem
              href={`/projects/${id}/save-as-template`}
              icon={<Stack size={20} aria-hidden="true" />}
            >
              {t("chrome.project.saveAsTemplate")}
            </ActionMenuItem>
            <ActionMenuItem
              href={`/projects/${id}/closeout`}
              icon={<Flag size={20} aria-hidden="true" />}
            >
              {t("chrome.project.closeout")}
            </ActionMenuItem>
          </ActionMenu>
        </div>
        <ProjectNav projectId={id} />
      </div>
    </div>
  );
}
