import Link from "next/link";
import { PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { deletePhotoAction, uploadSiteDiaryPhotoAction } from "@/app/actions/photos";
import { deleteSiteDiaryEntryAction } from "@/app/actions/site-diary";
import { PhotoStrip } from "@/components/photos/PhotoStrip";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import type { PhotoMeta } from "@/lib/photos";
import type { SiteDiaryEntry } from "@/lib/site-diary";

const FIELD_LABELS: { key: keyof SiteDiaryEntry; label: string }[] = [
  { key: "weather", label: "Weather" },
  { key: "activities", label: "Main activities" },
  { key: "materialsUsed", label: "Materials received / used" },
  { key: "equipmentUsed", label: "Equipment used" },
  { key: "delays", label: "Delays" },
  { key: "issues", label: "Issues" },
  { key: "instructions", label: "Instructions given" },
  { key: "visitors", label: "Visitors" },
  { key: "notes", label: "Notes" },
];

/**
 * The Site Diary section of the Stage detail page (Phase 4 Slice 4.1, ticket
 * 01) — every entry logged against this stage, most recent date first, each
 * with an inline photo strip (ticket 02's "shown inline on the entry").
 * Purely informational: no status, no Stage Closeout gate.
 */
export function SiteDiarySection({
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
  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Site Diary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A lightweight daily record — not a construction inspection log.
          </p>
        </div>
        <Button variant="secondary" href={`/projects/${projectId}/stages/${stageId}/diary/new`}>
          <Plus size={20} aria-hidden="true" />
          New diary entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          No diary entries logged against this stage yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-card-foreground">
                      {formatDate(entry.entryDate)}
                    </span>
                    {entry.workersOnSite != null && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                        {entry.workersOnSite} worker{entry.workersOnSite === 1 ? "" : "s"} on site
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/projects/${projectId}/stages/${stageId}/diary/${entry.id}/edit`}
                      className="inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
                    >
                      <PencilSimple size={16} aria-hidden="true" />
                      Edit
                    </Link>
                    <form
                      action={deleteSiteDiaryEntryAction.bind(null, projectId, stageId, entry.id)}
                    >
                      <button
                        type="submit"
                        className="min-h-12 cursor-pointer px-1 text-sm font-semibold text-destructive hover:underline rounded-md transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {FIELD_LABELS.filter(({ key }) => entry[key]).map(({ key, label }) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="whitespace-pre-wrap text-card-foreground">
                        {String(entry[key])}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">Photos</p>
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
