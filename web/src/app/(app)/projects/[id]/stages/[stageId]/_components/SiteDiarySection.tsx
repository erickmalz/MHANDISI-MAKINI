import { PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { deletePhotoAction, uploadSiteDiaryPhotoAction } from "@/app/actions/photos";
import { deleteSiteDiaryEntryAction } from "@/app/actions/site-diary";
import { PhotoStrip } from "@/components/photos/PhotoStrip";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/types";
import type { PhotoMeta } from "@/lib/photos";
import type { SiteDiaryEntry } from "@/lib/site-diary";
import { StatusBadge } from "@/components/ui/StatusBadge";

const FIELD_LABELS: { key: keyof SiteDiaryEntry; labelKey: MessageKey }[] = [
  { key: "weather", labelKey: "forms.diary.weather" },
  { key: "activities", labelKey: "forms.diary.activities" },
  { key: "materialsUsed", labelKey: "forms.diary.materials" },
  { key: "equipmentUsed", labelKey: "forms.diary.equipment" },
  { key: "delays", labelKey: "forms.diary.delays" },
  { key: "issues", labelKey: "forms.diary.issues" },
  { key: "instructions", labelKey: "forms.diary.instructions" },
  { key: "visitors", labelKey: "forms.diary.visitors" },
  { key: "notes", labelKey: "forms.common.notes" },
];

/**
 * The Site Diary section of the Stage detail page (Phase 4 Slice 4.1, ticket
 * 01) — every entry logged against this stage, most recent date first, each
 * with an inline photo strip (ticket 02's "shown inline on the entry").
 * Purely informational: no status, no Stage Closeout gate.
 */
export async function SiteDiarySection({
  projectId,
  stageId,
  entries,
  photosByEntry,
}: {
  projectId: string;
  stageId: string;
  entries: SiteDiaryEntry[];
  photosByEntry: Record<string, PhotoMeta[]>;
}) {
  const t = await getT();
  const locale = await getLocale();
  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("stages.diary.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("stages.diary.intro")}
          </p>
        </div>
        <Button variant="secondary" href={`/projects/${projectId}/stages/${stageId}/diary/new`}>
          <Plus size={20} aria-hidden="true" />
          {t("stages.diary.new")}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("stages.diary.none")}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-card-foreground">
                      {formatDate(entry.entryDate, locale)}
                    </span>
                    {entry.workersOnSite != null && (
                      <span className="ml-2"><StatusBadge tone="neutral" size="sm">
                        {t("stages.diary.workers", { count: entry.workersOnSite })}
                      </StatusBadge></span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" href={`/projects/${projectId}/stages/${stageId}/diary/${entry.id}/edit`}>
                      <PencilSimple size={16} aria-hidden="true" />
                      {t("stages.diary.edit")}
                    </Button>
                    <form
                      action={deleteSiteDiaryEntryAction.bind(null, projectId, stageId, entry.id)}
                    >
                      <button
                        type="submit"
                        className="min-h-12 cursor-pointer px-1 text-sm font-semibold text-destructive hover:underline rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
                      >
                        {t("stages.diary.delete")}
                      </button>
                    </form>
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {FIELD_LABELS.filter(({ key }) => entry[key]).map(({ key, labelKey }) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">{t(labelKey)}</dt>
                      <dd className="whitespace-pre-wrap text-card-foreground">
                        {String(entry[key])}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-sm font-bold text-muted-foreground">{t("stages.diary.photos")}</p>
                  <PhotoStrip
                    photos={photosByEntry[entry.id] ?? []}
                    uploadAction={uploadSiteDiaryPhotoAction.bind(
                      null,
                      projectId,
                      stageId,
                      entry.id,
                    )}
                    deleteAction={deletePhotoAction.bind(null, projectId, stageId)}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
