/**
 * The Stage Template register — view-model types, no data access, safe to
 * import from client components (Operational Control decision 2, Slice 6).
 *
 * A template stores **names and units only** — no quantities, prices, or
 * costs — as a `Stage → Task → typical Material Line` tree. Applying one at
 * project creation copies those names into real rows; editing a template
 * never touches a project already created from it.
 */

export interface StageTemplateMaterialLine {
  item: string;
  unit: string;
}

export interface StageTemplateTask {
  description: string;
  materialLines: StageTemplateMaterialLine[];
}

export interface StageTemplateStage {
  name: string;
  tasks: StageTemplateTask[];
}

/** The register list row — no need to ship every template's full tree to list them. */
export interface StageTemplateSummary {
  id: string;
  name: string;
  stageCount: number;
  taskCount: number;
}
