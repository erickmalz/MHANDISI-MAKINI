import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowsClockwise,
  CaretRight,
  ChartBar,
  Package,
  Receipt,
  ShoppingCartSimple,
  Users,
} from "@phosphor-icons/react/dist/ssr";

import { getProjectOverview } from "@/lib/data";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("reports.pageTitle");

/**
 * The Advanced Reporting Dashboard's landing page (Phase 4 ticket 06) — six
 * live, read-only, per-project report screens. Every report stays scoped to
 * this one open project, same as every other screen in the app (see the
 * Choose Project page's own doc comment).
 */

const REPORTS = [
  { href: "financial-summary", key: "financialSummary", Icon: ChartBar },
  { href: "material-cost", key: "materialCost", Icon: Package },
  { href: "procurement", key: "procurement", Icon: ShoppingCartSimple },
  { href: "labour", key: "labour", Icon: Users },
  { href: "funding", key: "funding", Icon: Receipt },
  { href: "variations", key: "variations", Icon: ArrowsClockwise },
] as const;

export default async function ProjectReportsPage({
  params,
}: PageProps<"/projects/[id]/reports">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();
  const t = await getT();

  return (
    <PageFrame width="working">
      <PageHeader
        title={t("reports.pageTitle")}
        subtitle={t("reports.index.subtitle")}
      />

      <ul className="flex flex-col gap-3">
        {REPORTS.map(({ href, key, Icon }) => (
          <li key={href}>
            <Link
              href={`/projects/${project.id}/reports/${href}`}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong"
            >
              <Icon
                size={24}
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-card-foreground">{t(`reports.${key}.label`)}</h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {t(`reports.${key}.description`)}
                </p>
              </div>
              <CaretRight
                size={20}
                className="hidden shrink-0 text-muted-foreground sm:block"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
