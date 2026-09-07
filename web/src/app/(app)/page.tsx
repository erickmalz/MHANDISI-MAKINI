import Link from "next/link";
import { MapPin, Bell, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { projects, getCurrentStage } from "@/lib/mock-data";
import { financialHealth } from "@/lib/finance";
import { HealthBadge } from "@/components/ui/HealthBadge";

/**
 * The engineer works one project at a time. After signing in they land here to
 * choose which project to open; the picker identifies each project and flags
 * which ones need attention, but never shows project figures side by side.
 */
export default function ChooseProjectPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-bold text-foreground">Choose a project</h1>
        <p className="mt-1 text-muted-foreground">
          Open one project to work on it. You can switch project at any time.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {projects.map((project) => {
          const health = financialHealth(getCurrentStage(project).financials);
          const alertCount = project.alerts.length;
          return (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{project.code}</p>
                  <h2 className="text-lg font-bold text-card-foreground">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.clientName}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin size={16} aria-hidden="true" />
                    {project.site}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <HealthBadge health={health} />
                  {alertCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Bell size={16} aria-hidden="true" />
                      {alertCount} alert{alertCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <CaretRight
                  size={20}
                  className="hidden shrink-0 text-muted-foreground sm:block"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
