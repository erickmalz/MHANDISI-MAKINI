"use client";

import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";

import { Card } from "@/components/ui/Card";
import { useT } from "@/lib/i18n/client";

export interface DocumentLink {
  /** e.g. "Funding request FR-PRJ-2026-001-004 v2" */
  label: string;
  pdfHref: string;
  jpgHref: string;
}

const linkClass =
  "inline-flex min-h-12 items-center gap-2 rounded-lg border border-foreground bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted";

/**
 * The download block on an issued record's detail screen (multi-tenancy ticket
 * 10). Each row offers the PDF (authoritative) and the JPG (previews inline on
 * WhatsApp). Both are rendered on demand from the frozen snapshot — nothing is
 * stored.
 */
export function DocumentDownloads({
  title,
  links,
}: {
  title?: string;
  links: DocumentLink[];
}) {
  const t = useT();
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{title ?? t("common.documents.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("common.documents.note")}
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {links.map((link) => (
          <div key={link.label} className="flex flex-col gap-2">
            <span className="text-sm font-bold text-card-foreground">
              {link.label}
            </span>
            <div className="flex flex-wrap gap-3">
              <a href={link.pdfHref} className={linkClass}>
                <DownloadSimple size={16} aria-hidden="true" />
                {t("common.documents.pdf")}
              </a>
              <a href={link.jpgHref} className={linkClass}>
                <DownloadSimple size={16} aria-hidden="true" />
                {t("common.documents.jpg")}
              </a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
