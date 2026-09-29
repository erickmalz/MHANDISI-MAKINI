import Link from "next/link";
import { X } from "@phosphor-icons/react/dist/ssr";

import { ShareButton } from "@/components/share/ShareButton";
import { controlClass } from "@/components/ui/Field";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { reportExportHref, type ExportFormat } from "@/lib/reports/export-href";
import { reportExportFilename } from "@/lib/reports/export-filename";
import {
  REPORT_DIMENSIONS,
  hasActiveFilters,
  type ActiveFilter,
  type ReportFilterState,
  type ReportKind,
} from "@/lib/reports/filters";

import { filteredHref, hrefWithout } from "./filter-links";
import { FiltersSheet } from "./FiltersSheet";
import { MoreMenu } from "./MoreMenu";

/** Which date each report's range filters on (ticket "Which filters each report gets"). */
const DATE_RANGE_LABEL = {
  procurement: "reportToolbar.dateRange.issued",
  funding: "reportToolbar.dateRange.issued",
  variations: "reportToolbar.dateRange.requested",
  "supplier-statement": "reportToolbar.dateRange.dated",
  "subcontractor-statement": "reportToolbar.dateRange.dated",
} as const satisfies Partial<Record<ReportKind, string>>;

/** The date fieldset's heading in the filter sheet, e.g. "Issued between". */
function dateRangeLabel(kind: ReportKind, t: Translator): string {
  return kind in DATE_RANGE_LABEL
    ? t(DATE_RANGE_LABEL[kind as keyof typeof DATE_RANGE_LABEL])
    : t("reportToolbar.dimensions.from");
}

/**
 * "Stage: Walling". A collapsed from/to entry already reads as a whole phrase
 * ("Issued 1–30 Sep 2026"), so it is shown as-is.
 */
function describe(filter: ActiveFilter, t: Translator): string {
  if (filter.dimension === "from" || filter.dimension === "to") return filter.label;
  return `${t(`reportToolbar.dimensions.${filter.dimension}`)}: ${filter.label}`;
}

/**
 * The toolbar on every Report and Statement (Report toolbar layout, variant A,
 * confirmed by the user): one row with "Filters (n)", a yellow Share (the one
 * primary action) and "More" (Export PDF / JPG / CSV, Print), then the active
 * filters as removable chips and the "Filtered: …" line.
 *
 * Every action reproduces exactly what is on screen: export, share and print
 * all carry the current filters (ticket "Export formats and whether filters
 * carry into them"). Print opens the PDF.
 */
export async function ReportToolbar({
  state,
  scopeId,
  basePath,
  shareTitle,
  scopeLabel,
}: {
  state: ReportFilterState;
  /** The project id for a report, the supplier / subcontractor id for a statement. */
  scopeId: string;
  /** This screen's path, without search params. */
  basePath: string;
  /** Sent as the share title, e.g. "Procurement — PRJ-2026-001". */
  shareTitle: string;
  /** The project code for a report, the party's name for a statement (filename). */
  scopeLabel: string;
}) {
  const t = await getT();
  const { kind, filters } = state;
  const href = (format: ExportFormat) => reportExportHref(kind, scopeId, format, filters);
  const file = (format: ExportFormat) =>
    reportExportFilename({ kind, scopeLabel, format, filtered: hasActiveFilters(filters) });

  const dimensions = REPORT_DIMENSIONS[kind];
  const selectDims = dimensions.filter((d) => d !== "from" && d !== "to");
  const hasDates = dimensions.includes("from");
  const hasAnyField = hasDates || selectDims.some((d) => (state.options[d]?.length ?? 0) > 0);

  return (
    <section aria-label={t("reportToolbar.label")} className="mb-6 flex flex-col gap-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <FiltersSheet
          action={basePath}
          activeCount={state.active.length}
          clearHref={basePath}
        >
          {!hasAnyField && (
            <p className="text-sm text-muted-foreground">{t("reportToolbar.sheet.empty")}</p>
          )}
          {selectDims.map((dim) => {
            const options = state.options[dim] ?? [];
            const current = filters[dim];
            if (options.length === 0) {
              // No choices to offer; keep an already-applied value when the form is re-submitted.
              return current ? <input key={dim} type="hidden" name={dim} value={current} /> : null;
            }
            return (
              <label key={dim} className="flex flex-col gap-1">
                <span className="text-sm font-bold text-card-foreground">
                  {t(`reportToolbar.dimensions.${dim}`)}
                </span>
                <select name={dim} defaultValue={current ?? ""} className={controlClass}>
                  <option value="">{t("reportToolbar.sheet.all")}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          {hasDates && (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-bold text-card-foreground">
                {dateRangeLabel(kind, t)}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">
                    {t("reportToolbar.dimensions.from")}
                  </span>
                  <input
                    type="date"
                    name="from"
                    defaultValue={filters.from ?? ""}
                    className={controlClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">
                    {t("reportToolbar.dimensions.to")}
                  </span>
                  <input
                    type="date"
                    name="to"
                    defaultValue={filters.to ?? ""}
                    className={controlClass}
                  />
                </label>
              </div>
            </fieldset>
          )}
        </FiltersSheet>

        <div className="ml-auto flex items-center gap-2">
          {/* ShareButton renders nothing where the browser can't share files; its menu anchors here. */}
          <div className="relative">
            <ShareButton
              title={shareTitle}
              files={(["pdf", "jpg", "csv"] as const).map((format) => ({
                format,
                label: t(`share.formats.${format}`),
                href: href(format),
                filename: file(format),
              }))}
            />
          </div>
          <MoreMenu
            label={t("reportToolbar.more")}
            items={[
              {
                label: t("reportToolbar.exportPdf"),
                hint: t("reportToolbar.exportPdfHint"),
                href: href("pdf"),
                mode: "download",
              },
              { label: t("reportToolbar.exportJpg"), href: href("jpg"), mode: "download" },
              { label: t("reportToolbar.exportCsv"), href: href("csv"), mode: "download" },
              { label: t("reportToolbar.print"), href: href("pdf"), mode: "new-tab" },
            ]}
          />
        </div>
      </div>

      {state.active.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-2">
            {state.active.map((a) => (
              <li key={a.dimension}>
                <Link
                  href={hrefWithout(basePath, filters, a.dimension)}
                  aria-label={t("reportToolbar.removeFilter", { label: describe(a, t) })}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-foreground bg-card px-4 text-sm font-bold text-foreground hover:bg-muted"
                >
                  {a.label}
                  <X size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{t("reportToolbar.filtered")}</span>{" "}
            {state.active.map((a) => describe(a, t)).join(" · ")}
            {state.dateRangeActive && <> · {t("reportToolbar.asOfToday")}</>}
            {" · "}
            <Link href={filteredHref(basePath, {})} className="font-bold text-foreground underline">
              {t("reportToolbar.clear")}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

/** "Nothing matches these filters" with a way back — for a filtered-to-empty list. */
export async function NoMatch() {
  const t = await getT();
  return <p className="text-sm text-muted-foreground">{t("reportToolbar.noMatch")}</p>;
}
