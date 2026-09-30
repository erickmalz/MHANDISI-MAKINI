import Link from "next/link";
import { Info } from "@phosphor-icons/react/dist/ssr";

import { getT } from "@/lib/i18n/server";

/**
 * The standing note on a draft Funding Request / planned Purchase Order that a
 * Task save raised: its Task-derived lines are re-synced from the Task, so the
 * place to change them is the Task.
 */
export async function TaskSourceNote({
  projectId,
  taskId,
  kind,
}: {
  projectId: string;
  taskId: string;
  kind: "funding" | "procurement";
}) {
  const t = await getT();
  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg bg-health-blue-bg px-3 py-2 text-sm text-health-blue">
      <Info size={20} aria-hidden="true" className="mt-px shrink-0" />
      <p className="min-w-0">
        {kind === "funding" ? t("tasks.sourced.fundingNote") : t("tasks.sourced.poNote")}{" "}
        <Link
          href={`/projects/${projectId}/tasks/${taskId}/edit`}
          className="font-bold underline"
        >
          {t("tasks.sourced.viewTask")}
        </Link>
      </p>
    </div>
  );
}
