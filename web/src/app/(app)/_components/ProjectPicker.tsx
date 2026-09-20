"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CaretRight, MapPin } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { useT } from "@/lib/i18n/client";
import {
  FILTER_THRESHOLD,
  filterProjects,
  groupByAttention,
  type PickerItem,
} from "@/lib/project-picker";

/**
 * The list of projects to open. Projects that need attention come first; once
 * there are more than a handful, a filter appears. Each row is identity, health
 * and alert count only — the engineer works one project at a time, so no
 * project's figures are ever shown beside another's.
 */
export function ProjectPicker({ projects }: { projects: PickerItem[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const filterable = projects.length > FILTER_THRESHOLD;
  const visible = filterable ? filterProjects(projects, query) : projects;
  const { attention, rest } = groupByAttention(visible);
  const showHeadings = attention.length > 0 && rest.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {filterable && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Field label={t("picker.filter.label")} hint={t("picker.filter.hint")}>
                <input
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={controlClass}
                />
              </Field>
            </div>
            {query !== "" && (
              <Button variant="ghost" type="button" onClick={() => setQuery("")}>
                {t("picker.filter.clear")}
              </Button>
            )}
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {query.trim() === ""
              ? ""
              : t("picker.filter.showing", { shown: visible.length, total: projects.length })}
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-center">
          <p className="font-bold text-card-foreground">
            {t("picker.noMatch.title", { query: query.trim() })}
          </p>
          <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
            {t("picker.noMatch.body", { count: projects.length })}
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" type="button" onClick={() => setQuery("")}>
              {t("picker.filter.clear")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ProjectGroup
            heading={showHeadings ? t("picker.groups.attention") : t("picker.groups.all")}
            visibleHeading={showHeadings}
            items={attention}
          />
          <ProjectGroup
            heading={showHeadings ? t("picker.groups.other") : t("picker.groups.all")}
            visibleHeading={showHeadings}
            items={rest}
          />
        </>
      )}
    </div>
  );
}

function ProjectGroup({
  heading,
  visibleHeading,
  items,
}: {
  heading: string;
  visibleHeading: boolean;
  items: PickerItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2
        className={
          visibleHeading
            ? "mb-3 text-base font-bold text-foreground"
            : "sr-only"
        }
      >
        {heading}
        {visibleHeading && (
          <span className="ml-2 font-normal text-muted-foreground">
            {items.length}
          </span>
        )}
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((project) => (
          <li key={project.id}>
            <ProjectRow project={project} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectRow({ project }: { project: PickerItem }) {
  const t = useT();
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{project.code}</p>
        <h3 className="text-lg font-bold text-card-foreground">{project.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{project.clientName}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={16} aria-hidden="true" />
          {project.site}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {project.health ? (
          <HealthBadge health={project.health} />
        ) : (
          <span className="text-sm text-muted-foreground">{t("picker.row.noStage")}</span>
        )}
        {project.alertCount > 0 && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Bell size={16} aria-hidden="true" />
            {t("picker.row.alerts", { count: project.alertCount })}
          </span>
        )}
      </div>
      <CaretRight
        size={20}
        className="hidden shrink-0 text-muted-foreground sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}
