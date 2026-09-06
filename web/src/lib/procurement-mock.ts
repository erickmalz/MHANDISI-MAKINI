import type { Project, Stage } from "./types";

/**
 * Illustrative Purchase Order / Delivery / Supplier Payment data for the
 * Procurement prototype (guidelines §21-§25). Not real data — deterministically
 * generated from a stage's financials so the screens work for any stage
 * without a real take-off/procurement backend yet. Mirrors the pattern in
 * funding-mock.ts.
 */

export type POStatus =
  | "Issued"
  | "Confirmed"
  | "Partially Delivered"
  | "Delivered"
  | "Partially Paid"
  | "Paid"
  | "Cancelled"
  | "Closed";

export interface POMaterialLine {
  id: string;
  item: string;
  unit: string;
  qtyOrdered: number;
  unitPrice: number;
  qtyDelivered: number;
  qtyAccepted: number;
  qtyRejected: number;
}

export type PaymentMethod = "Bank Transfer" | "Mobile Money" | "Cash" | "Cheque";
export type PaymentType = "Deposit" | "Partial" | "Final";

export interface DeliveryRecord {
  id: string;
  date: string;
  noteNumber: string;
  siteNotes?: string;
  /** qty delivered/accepted/rejected in this delivery, per line id. */
  lines: { lineId: string; qtyDelivered: number; qtyAccepted: number; qtyRejected: number }[];
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  type: PaymentType;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  stageId: string;
  stageName: string;
  supplier: string;
  date: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  notes?: string;
  lines: POMaterialLine[];
  deliveries: DeliveryRecord[];
  payments: PaymentRecord[];
  confirmed: boolean;
  cancelled: boolean;
  closed: boolean;
}

export function orderedTotal(po: PurchaseOrder): number {
  return po.lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitPrice, 0);
}

export function acceptedValue(po: PurchaseOrder): number {
  return po.lines.reduce((sum, l) => sum + l.qtyAccepted * l.unitPrice, 0);
}

export function paidTotal(po: PurchaseOrder): number {
  return po.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function outstandingValue(po: PurchaseOrder): number {
  return orderedTotal(po) - paidTotal(po);
}

export function derivePOStatus(po: PurchaseOrder): POStatus {
  if (po.cancelled) return "Cancelled";
  if (po.closed) return "Closed";

  const total = orderedTotal(po);
  const paid = paidTotal(po);
  const fullyDelivered = po.lines.every((l) => l.qtyAccepted >= l.qtyOrdered);
  const anyDelivered = po.lines.some((l) => l.qtyAccepted > 0);
  const fullyPaid = total > 0 && paid >= total;
  const anyPaid = paid > 0;

  if (fullyPaid) return "Paid";
  if (anyPaid) return "Partially Paid";
  if (fullyDelivered) return "Delivered";
  if (anyDelivered) return "Partially Delivered";
  if (po.confirmed) return "Confirmed";
  return "Issued";
}

interface MaterialSpec {
  item: string;
  unit: string;
  unitPrice: number;
  supplier: string;
}

const MATERIAL_SETS: Record<string, MaterialSpec[]> = {
  Foundation: [
    { item: "Cement", unit: "bag", unitPrice: 25_000, supplier: "Twiga Cement Depot - Mbezi" },
    { item: "Reinforcement Steel (Y12)", unit: "ton", unitPrice: 2_850_000, supplier: "Tanzania Steel Suppliers Ltd." },
    { item: "Coarse Aggregate", unit: "ton", unitPrice: 85_000, supplier: "Kunduchi Quarry & Aggregates" },
  ],
  "Ground Floor": [
    { item: "Cement", unit: "bag", unitPrice: 25_000, supplier: "Twiga Cement Depot - Mbezi" },
    { item: 'Concrete Blocks (6")', unit: "piece", unitPrice: 2_200, supplier: "Mlandizi Block Makers" },
    { item: "Reinforcement Steel (Y10)", unit: "ton", unitPrice: 2_750_000, supplier: "Tanzania Steel Suppliers Ltd." },
  ],
  "First Floor": [
    { item: "Cement", unit: "bag", unitPrice: 25_000, supplier: "Twiga Cement Depot - Mbezi" },
    { item: 'Concrete Blocks (6")', unit: "piece", unitPrice: 2_200, supplier: "Mlandizi Block Makers" },
    { item: "Reinforcement Steel (Y10)", unit: "ton", unitPrice: 2_750_000, supplier: "Tanzania Steel Suppliers Ltd." },
  ],
  Roofing: [
    { item: "Roofing Sheets (Gauge 28)", unit: "sheet", unitPrice: 45_000, supplier: "Alaf Roofing Distributors" },
    { item: "Timber Purlins (2x3)", unit: "piece", unitPrice: 12_000, supplier: "Mbezi Timber Yard" },
    { item: "Roofing Nails & Fixings", unit: "lot", unitPrice: 180_000, supplier: "Alaf Roofing Distributors" },
  ],
  Finishes: [
    { item: "Ceramic Floor Tiles", unit: "m²", unitPrice: 32_000, supplier: "Keda Tiles Showroom - Dar" },
    { item: "Emulsion Paint", unit: "20L drum", unitPrice: 140_000, supplier: "Sadolin Paint Centre" },
    { item: "Sanitary Fittings", unit: "set", unitPrice: 650_000, supplier: "Doniss Sanitaryware" },
  ],
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function poNumber(project: Project, seq: number): string {
  return `PO-2026-${project.code.slice(-3)}-${String(seq).padStart(3, "0")}`;
}

/** Round to the nearest whole unit of `unitPrice`, at least 1. */
function qtyForValue(targetValue: number, unitPrice: number): number {
  return Math.max(1, Math.round(targetValue / unitPrice));
}

function makeLine(spec: MaterialSpec, qtyOrdered: number, deliveredFraction: number, rejectFraction = 0): POMaterialLine {
  const qtyDelivered = Math.round(qtyOrdered * deliveredFraction);
  const qtyRejected = Math.round(qtyDelivered * rejectFraction);
  return {
    id: `${spec.item}`,
    item: spec.item,
    unit: spec.unit,
    qtyOrdered,
    unitPrice: spec.unitPrice,
    qtyDelivered,
    qtyAccepted: qtyDelivered - qtyRejected,
    qtyRejected,
  };
}

/**
 * Overridable per-project quirks so a couple of Project Alerts (mock-data.ts)
 * have a real Purchase Order behind them.
 */
const NUMBER_OVERRIDES: Record<string, Record<number, string>> = {
  "mbezi-beach-residence": { 2: "PO-2026-001-034" },
  "msasani-office-extension": { 2: "PO-2026-003-006" },
};

const NOTE_OVERRIDES: Record<string, Record<number, string>> = {
  "mbezi-beach-residence": { 2: "Supplier receipt for the last payment is still outstanding — chase before Stage Closeout." },
  "msasani-office-extension": { 2: "Delivery note not yet received from supplier for the last batch delivered." },
};

export function purchaseOrdersForStage(stage: Stage, project: Project): PurchaseOrder[] {
  if (stage.status === "Awaiting Funding" || stage.status === "Planned") return [];

  const materials = MATERIAL_SETS[stage.name] ?? MATERIAL_SETS.Foundation;
  const overrides = NUMBER_OVERRIDES[project.id] ?? {};
  const notes = NOTE_OVERRIDES[project.id] ?? {};
  const f = stage.financials;
  const orders: PurchaseOrder[] = [];
  let seq = 10 * stage.seq + 1;

  // PO 1 — settled history: fully delivered and fully paid.
  const historyValue = Math.max(600_000, Math.round((f.paidPurchases || 2_000_000) * 0.55));
  const spec1 = materials[0];
  const line1 = makeLine(spec1, qtyForValue(historyValue, spec1.unitPrice), 1);
  const total1 = line1.qtyOrdered * line1.unitPrice;
  orders.push({
    id: `${stage.id}-po-1`,
    number: overrides[1] ?? poNumber(project, seq++),
    stageId: stage.id,
    stageName: stage.name,
    supplier: spec1.supplier,
    date: daysAgo(45),
    expectedDeliveryDate: daysAgo(38),
    paymentTerms: "50% deposit, balance on delivery",
    notes: notes[1],
    lines: [line1],
    deliveries: [
      {
        id: `${stage.id}-po-1-d1`,
        date: daysAgo(37),
        noteNumber: `DN-${stage.id}-01`,
        lines: [{ lineId: line1.id, qtyDelivered: line1.qtyOrdered, qtyAccepted: line1.qtyOrdered, qtyRejected: 0 }],
      },
    ],
    payments: [
      { id: `${stage.id}-po-1-p1`, date: daysAgo(45), amount: Math.round(total1 * 0.5), method: "Mobile Money", reference: `MP${stage.seq}0145`, type: "Deposit" },
      { id: `${stage.id}-po-1-p2`, date: daysAgo(36), amount: total1 - Math.round(total1 * 0.5), method: "Bank Transfer", reference: `BT${stage.seq}0201`, type: "Final" },
    ],
    confirmed: true,
    cancelled: false,
    closed: stage.status === "Completed",
  });

  // PO 2 — in progress: partially delivered, partially paid. Only while there's an open commitment.
  if (f.openPurchaseCommitments > 0) {
    const spec2 = materials[1] ?? materials[0];
    const inProgressValue = Math.max(400_000, f.openPurchaseCommitments);
    const line2 = makeLine(spec2, qtyForValue(inProgressValue, spec2.unitPrice), 0.6, 0.1);
    const total2 = line2.qtyOrdered * line2.unitPrice;
    orders.push({
      id: `${stage.id}-po-2`,
      number: overrides[2] ?? poNumber(project, seq++),
      stageId: stage.id,
      stageName: stage.name,
      supplier: spec2.supplier,
      date: daysAgo(14),
      expectedDeliveryDate: daysFromNow(3),
      paymentTerms: "30% deposit, balance on delivery",
      notes: notes[2],
      lines: [line2],
      deliveries: [
        {
          id: `${stage.id}-po-2-d1`,
          date: daysAgo(6),
          noteNumber: `DN-${stage.id}-02`,
          siteNotes: "First batch delivered; remainder expected next week.",
          lines: [{ lineId: line2.id, qtyDelivered: line2.qtyDelivered, qtyAccepted: line2.qtyAccepted, qtyRejected: line2.qtyRejected }],
        },
      ],
      payments: [
        { id: `${stage.id}-po-2-p1`, date: daysAgo(14), amount: Math.round(total2 * 0.3), method: "Bank Transfer", reference: `BT${stage.seq}0188`, type: "Deposit" },
      ],
      confirmed: true,
      cancelled: false,
      closed: false,
    });
  }

  // PO 3 — just issued, awaiting supplier confirmation and delivery.
  if (stage.status === "Active" && f.remainingMaterial > 0) {
    const spec3 = materials[2] ?? materials[0];
    const upcomingValue = Math.max(300_000, Math.round(f.remainingMaterial * 0.4));
    const line3 = makeLine(spec3, qtyForValue(upcomingValue, spec3.unitPrice), 0);
    orders.push({
      id: `${stage.id}-po-3`,
      number: overrides[3] ?? poNumber(project, seq++),
      stageId: stage.id,
      stageName: stage.name,
      supplier: spec3.supplier,
      date: daysAgo(2),
      expectedDeliveryDate: daysFromNow(10),
      paymentTerms: "Full payment on delivery",
      notes: notes[3],
      lines: [line3],
      deliveries: [],
      payments: [],
      confirmed: false,
      cancelled: false,
      closed: false,
    });
  }

  return orders;
}

export function allPurchaseOrders(project: Project): PurchaseOrder[] {
  return project.stages
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .flatMap((stage) => purchaseOrdersForStage(stage, project));
}

export function findPurchaseOrder(project: Project, poId: string): PurchaseOrder | undefined {
  return allPurchaseOrders(project).find((po) => po.id === poId);
}
