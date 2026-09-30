import { describe, expect, it } from "vitest";

import {
  buildTaskDraftLines,
  stockKey,
  type TaskDraftSource,
  type TaskDraftTakeOffLine,
} from "@/lib/task-drafts";

const line = (patch: Partial<TaskDraftTakeOffLine>): TaskDraftTakeOffLine => ({
  item: "Cement",
  description: null,
  unit: "bag",
  qtyOriginal: 10,
  qtyRevised: null,
  estUnitCostOriginal: 18_000,
  estUnitCostRevised: null,
  ...patch,
});

const source = (patch: Partial<TaskDraftSource>): TaskDraftSource => ({
  description: "Foundation blockwork",
  subcontractorName: null,
  labourAmount: null,
  takeOff: [],
  drawnFromStock: new Map(),
  ...patch,
});

describe("buildTaskDraftLines", () => {
  it("turns take-off lines into material FR lines and PO lines", () => {
    const { fundingLines, poLines } = buildTaskDraftLines(
      source({ takeOff: [line({}), line({ item: "Sand", unit: "ton", qtyOriginal: 2, estUnitCostOriginal: 45_000 })] }),
    );
    expect(fundingLines).toEqual([
      { category: "material", item: "Cement", description: undefined, qty: 10, unit: "bag", unitCost: 18_000, amount: 180_000 },
      { category: "material", item: "Sand", description: undefined, qty: 2, unit: "ton", unitCost: 45_000, amount: 90_000 },
    ]);
    expect(poLines).toEqual([
      { item: "Cement", description: undefined, unit: "bag", qtyOrdered: 10, unitPrice: 18_000 },
      { item: "Sand", description: undefined, unit: "ton", qtyOrdered: 2, unitPrice: 45_000 },
    ]);
  });

  it("adds one labour FR line, naming the subcontractor, and no PO line", () => {
    const { fundingLines, poLines } = buildTaskDraftLines(
      source({ labourAmount: 600_000, subcontractorName: "Juma Fundi" }),
    );
    expect(fundingLines).toEqual([
      { category: "labour", item: "Labour — Foundation blockwork (Juma Fundi)", amount: 600_000 },
    ]);
    expect(poLines).toEqual([]);
  });

  it("uses the revised figures once a line is revised", () => {
    const { fundingLines, poLines } = buildTaskDraftLines(
      source({ takeOff: [line({ qtyRevised: 12, estUnitCostRevised: 20_000 })] }),
    );
    expect(fundingLines[0]).toMatchObject({ qty: 12, unitCost: 20_000, amount: 240_000 });
    expect(poLines[0]).toMatchObject({ qtyOrdered: 12, unitPrice: 20_000 });
  });

  it("asks only for the shortfall after stock drawn into the task", () => {
    const { fundingLines, poLines } = buildTaskDraftLines(
      source({
        takeOff: [line({})],
        drawnFromStock: new Map([[stockKey(" cement ", "Bag"), 4]]),
      }),
    );
    expect(fundingLines[0]).toMatchObject({ qty: 6, amount: 108_000 });
    expect(poLines[0]).toMatchObject({ qtyOrdered: 6 });
  });

  it("uses the stock draw up across lines of the same material, not once per line", () => {
    const { poLines } = buildTaskDraftLines(
      source({
        takeOff: [line({ qtyOriginal: 3 }), line({ qtyOriginal: 5 })],
        drawnFromStock: new Map([[stockKey("Cement", "bag"), 4]]),
      }),
    );
    expect(poLines.map((l) => l.qtyOrdered)).toEqual([4]);
  });

  it("drops a line fully covered by stock, or with no quantity", () => {
    const { fundingLines, poLines } = buildTaskDraftLines(
      source({
        takeOff: [line({ qtyOriginal: 4 }), line({ item: "Nails", unit: "kg", qtyOriginal: null })],
        drawnFromStock: new Map([[stockKey("Cement", "bag"), 4]]),
      }),
    );
    expect(fundingLines).toEqual([]);
    expect(poLines).toEqual([]);
  });

  it("puts an unpriced line on the PO at 0 but leaves it off the FR", () => {
    const { fundingLines, poLines } = buildTaskDraftLines(
      source({ takeOff: [line({ estUnitCostOriginal: null })] }),
    );
    expect(fundingLines).toEqual([]);
    expect(poLines).toEqual([
      { item: "Cement", description: undefined, unit: "bag", qtyOrdered: 10, unitPrice: 0 },
    ]);
  });

  it("raises nothing for a task with no labour and no materials", () => {
    expect(buildTaskDraftLines(source({ labourAmount: 0 }))).toEqual({ fundingLines: [], poLines: [] });
  });

  it("caps the labour line's name at the FR item limit", () => {
    const { fundingLines } = buildTaskDraftLines(
      source({ description: "x".repeat(300), labourAmount: 1 }),
    );
    expect(fundingLines[0].item.length).toBe(160);
  });
});
