import type { Stage } from "./types";

/**
 * Illustrative task/material/labour breakdown for the Funding Request
 * Builder prototype. Not real data — derived deterministically from a
 * stage's remaining requirement so the wizard works for any stage without
 * a full take-off/labour-agreement backend yet.
 */
export interface MaterialLine {
  item: string;
  qty: number;
  unit: string;
  unitCost: number;
}

export interface LabourLine {
  subcontractor: string;
  amount: number;
}

export interface TaskLine {
  id: string;
  name: string;
  material: MaterialLine[];
  labour: LabourLine[];
}

const TASK_NAMES_BY_STAGE: Record<string, [string, string]> = {
  Roofing: ["Roof Trusses & Purlins", "Roofing Sheets & Fixing"],
  Foundation: ["Excavation & Footings", "Foundation Wall"],
  "Ground Floor": ["Blockwork", "Reinforcement & Slab"],
  "First Floor": ["Blockwork", "Reinforcement & Slab"],
  Finishes: ["Plastering", "Tiling & Painting"],
};

export function materialTotal(t: TaskLine): number {
  return t.material.reduce((sum, m) => sum + m.qty * m.unitCost, 0);
}

export function labourTotal(t: TaskLine): number {
  return t.labour.reduce((sum, l) => sum + l.amount, 0);
}

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
