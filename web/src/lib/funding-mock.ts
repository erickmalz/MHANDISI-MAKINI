import type { TaskLine } from "./funding";
import type { Stage } from "./types";

/**
 * The deterministic sample generator for the Funding Request Builder prototype
 * — derives an illustrative task / material / labour breakdown from a stage's
 * remaining requirement so the wizard works without a real take-off backend.
 *
 * Not real data. The domain types (`TaskLine`, `MaterialLine`, `LabourLine`)
 * and the pure helpers (`materialTotal`, `labourTotal`) were promoted to
 * `@/lib/funding` in Slice 2.3; this file keeps only the throwaway generator
 * and is deleted when Slice 2.5 rebuilds the builder on the DAL (ticket 08 §5).
 */

const TASK_NAMES_BY_STAGE: Record<string, [string, string]> = {
  Roofing: ["Roof Trusses & Purlins", "Roofing Sheets & Fixing"],
  Foundation: ["Excavation & Footings", "Foundation Wall"],
  "Ground Floor": ["Blockwork", "Reinforcement & Slab"],
  "First Floor": ["Blockwork", "Reinforcement & Slab"],
  Finishes: ["Plastering", "Tiling & Painting"],
};

export function tasksForStage(stage: Stage): TaskLine[] {
  const [nameA, nameB] = TASK_NAMES_BY_STAGE[stage.name] ?? [
    "Primary Works",
    "Secondary Works",
  ];
  const { remainingMaterial, remainingLabour } = stage.financials;

  const materialA = Math.round(remainingMaterial * 0.6);
  const materialB = remainingMaterial - materialA;
  const labourA = Math.round(remainingLabour * 0.55);
  const labourB = remainingLabour - labourA;

  return [
    {
      id: `${stage.id}-task-a`,
      name: nameA,
      material: [
        { item: "Cement", qty: Math.max(1, Math.round(materialA / 25000)), unit: "bag", unitCost: 25_000 },
      ],
      labour: [{ subcontractor: "M. Kileo Construction Crew", amount: labourA }],
    },
    {
      id: `${stage.id}-task-b`,
      name: nameB,
      material: [
        { item: "Assorted materials", qty: 1, unit: "lot", unitCost: materialB },
      ],
      labour: [{ subcontractor: "J. Ndosi Labour Team", amount: labourB }],
    },
  ];
}
