import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowsClockwise,
  CaretRight,
  ChartBar,
  Package,
  Receipt,
  ShoppingCartSimple,
  Users,
} from "@phosphor-icons/react/dist/ssr";

import { getProjectOverview } from "@/lib/data";

/**
 * The Advanced Reporting Dashboard's landing page (Phase 4 ticket 06) — six
 * live, read-only, per-project report screens. Every report stays scoped to
 * this one open project, same as every other screen in the app (see the
 * Choose Project page's own doc comment).
 */

const REPORTS = [
  {
    href: "financial-summary",
    label: "Project Financial Summary",
    description: "Funding, fees, commitments, payments, float and forecast — stage by stage.",
    Icon: ChartBar,
  },
  {
    href: "material-cost",
    label: "Material Cost Report",
    description: "Estimated, revised and actual material cost against the take-off, by stage.",
    Icon: Package,
  },
  {
    href: "procurement",
    label: "Procurement Report",
    description: "Every Purchase Order against what the take-off requires — ordered, delivered, paid.",
    Icon: ShoppingCartSimple,
  },
  {
    href: "labour",
    label: "Labour Report",
    description: "Every Task's Subcontractor, agreed and revised labour, paid and outstanding.",
    Icon: Users,
  },
  {
    href: "funding",
    label: "Funding Report",
    description: "Every Funding Request — amount requested, deposited, balance and status.",
    Icon: Receipt,
  },
  {
    href: "variations",
    label: "Variation Report",
    description: "Every Variation's scope impact, additional cost, approval and funding status.",
    Icon: ArrowsClockwise,
  },
] as const;

export default async function ProjectReportsPage({
  params,
}: PageProps<"/projects/[id]/reports">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <header className="mb-6">
        <h1 className="text-[1.75rem] font-bold text-foreground">Reports</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          Live, always-current views of this project&rsquo;s figures — computed
          fresh on every visit, nothing stored. Not issued documents, so
          there is nothing to download here.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {REPORTS.map(({ href, label, description, Icon }) => (
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
                <h2 className="font-bold text-card-foreground">{label}</h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {description}
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
    </main>
  );
}
