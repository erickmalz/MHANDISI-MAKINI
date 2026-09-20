import { Card } from "@/components/ui/Card";
import { getT } from "@/lib/i18n/server";

const linkClass =
  "inline-flex min-h-12 items-center gap-2 rounded-lg border border-foreground bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted";

/**
 * "Export my data" (Slice 2.8 Part 3 / ticket 02) — available at any time,
 * not only from the deletion flow. A plain `<a>` to the Route Handler
 * (matching `DocumentDownloads`), not a Server Action or `Button href`
 * (`next/link`): the browser needs a real navigation to treat the response
 * as a file download (`Content-Disposition: attachment`).
 */
export async function DataExportCard() {
  const t = await getT();
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-foreground">{t("settings.export.title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("settings.export.intro")}
      </p>
      <div>
        <a href="/settings/export" className={linkClass}>
          {t("settings.export.button")}
        </a>
      </div>
    </Card>
  );
}
