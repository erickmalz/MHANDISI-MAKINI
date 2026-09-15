import "server-only";

import { sql } from "drizzle-orm";

import { formatTZS } from "@/lib/finance";

import { withAccount, type AccountTx } from "./with-account";

/**
 * The Comprehensive Activity History feed (guidelines §40/§60 item 5; ticket
 * 05, `.scratch/phase4/issues/05-comprehensive-activity-history.md`).
 *
 * **Not** a `audit_events` write-interception log — no such table exists and
 * none is added here. Instead this assembles a read-only feed **live, on
 * demand, nothing stored** (same "compute-live-don't-store" posture as
 * `getStageReconciliationReport`) from the `created_at` columns and
 * lifecycle/status timestamp columns every record with a real lifecycle
 * already carries: Stage, Task, Variation, Purchase Order, Funding Request,
 * Deposit, Supplier Payment, Delivery Record, Labour Payment. A record's own
 * already-existing `display_number` (`FR-`, `PO-`, `VO-`) is used to compose
 * each event's human-readable `summary` — nothing is minted or stored here.
 *
 * Explicitly narrower than a literal §40 audit trail (recorded in the
 * ticket, not silently dropped): no field-level previous-value/new-value
 * diff, and no "Reason" capture — a `summary` is a sentence composed from the
 * record's own columns at read time, not a stored audit message. Where a
 * status value has no dedicated lifecycle timestamp column on the table (e.g.
 * Stage's `awaiting_funding` / `on_hold` / `ready_for_closeout` / `cancelled`,
 * Task's `on_hold` / `cancelled`), no event is emitted for that transition —
 * inventing one off `updated_at` would misattribute unrelated edits as status
 * changes, which is worse than an honest gap.
 */

export type ActivityRecordType =
  | "stage"
  | "task"
  | "variation"
  | "purchase_order"
  | "delivery"
  | "payment"
  | "labour_payment"
  | "funding_request"
  | "deposit";

export interface ActivityEvent {
  /** Unique across the whole feed: `{recordType}:{recordId}:{eventKey}`. */
  id: string;
  occurredAt: string;
  recordType: ActivityRecordType;
  recordId: string;
  stageId: string;
  stageName: string;
  summary: string;
  href: string;
}

const iso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : `${v}T00:00:00.000Z`;

/** `AND s.id = {stageId}`, or nothing when no Stage filter is requested. */
function stageFilter(stageId?: string) {
  return stageId ? sql`AND s.id = ${stageId}` : sql``;
}

// --- Stage -----------------------------------------------------------------

async function stageEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      name: string;
      created_at: string;
      started_on: string | null;
      completed_on: string | null;
    }>(sql`
      SELECT s.id, s.name, s.created_at, s.started_on, s.completed_on
      FROM stages s
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (id: string) => `/projects/${projectId}/stages/${id}`;
  for (const r of rows) {
    events.push({
      id: `stage:${r.id}:created`,
      occurredAt: iso(r.created_at),
      recordType: "stage",
      recordId: r.id,
      stageId: r.id,
      stageName: r.name,
      summary: `Stage "${r.name}" created`,
      href: href(r.id),
    });
    if (r.started_on) {
      events.push({
        id: `stage:${r.id}:started`,
        occurredAt: iso(r.started_on),
        recordType: "stage",
        recordId: r.id,
        stageId: r.id,
        stageName: r.name,
        summary: `Stage "${r.name}" started`,
        href: href(r.id),
      });
    }
    if (r.completed_on) {
      events.push({
        id: `stage:${r.id}:completed`,
        occurredAt: iso(r.completed_on),
        recordType: "stage",
        recordId: r.id,
        stageId: r.id,
        stageName: r.name,
        summary: `Stage "${r.name}" completed`,
        href: href(r.id),
      });
    }
  }
  return events;
}

// --- Task --------------------------------------------------------------

async function taskEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      description: string;
      created_at: string;
      started_on: string | null;
      completed_on: string | null;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT t.id, t.description, t.created_at, t.started_on, t.completed_on,
             s.id AS stage_id, s.name AS stage_name
      FROM tasks t
      JOIN stages s ON s.id = t.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (id: string) => `/projects/${projectId}/tasks/${id}/edit`;
  for (const r of rows) {
    events.push({
      id: `task:${r.id}:created`,
      occurredAt: iso(r.created_at),
      recordType: "task",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: `Task "${r.description}" created`,
      href: href(r.id),
    });
    if (r.started_on) {
      events.push({
        id: `task:${r.id}:started`,
        occurredAt: iso(r.started_on),
        recordType: "task",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Task "${r.description}" started`,
        href: href(r.id),
      });
    }
    if (r.completed_on) {
      events.push({
        id: `task:${r.id}:completed`,
        occurredAt: iso(r.completed_on),
        recordType: "task",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Task "${r.description}" completed`,
        href: href(r.id),
      });
    }
  }
  return events;
}

// --- Variation ---------------------------------------------------------

async function variationEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      description: string;
      status: string;
      display_number: string | null;
      requested_at: string;
      approved_at: string | null;
      rejected_at: string | null;
      cancelled_at: string | null;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT v.id, v.description, v.status, v.display_number, v.requested_at,
             v.approved_at, v.rejected_at, v.cancelled_at,
             s.id AS stage_id, s.name AS stage_name
      FROM variations v
      JOIN stages s ON s.id = v.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (id: string) => `/projects/${projectId}/variations/${id}`;
  for (const r of rows) {
    events.push({
      id: `variation:${r.id}:drafted`,
      occurredAt: iso(r.requested_at),
      recordType: "variation",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: `Variation drafted: "${r.description}"`,
      href: href(r.id),
    });
    if (r.status === "approved" && r.approved_at) {
      events.push({
        id: `variation:${r.id}:approved`,
        occurredAt: iso(r.approved_at),
        recordType: "variation",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Variation ${r.display_number ?? ""} approved`.trim(),
        href: href(r.id),
      });
    }
    if (r.status === "rejected" && r.rejected_at) {
      events.push({
        id: `variation:${r.id}:rejected`,
        occurredAt: iso(r.rejected_at),
        recordType: "variation",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Variation rejected: "${r.description}"`,
        href: href(r.id),
      });
    }
    if (r.status === "cancelled" && r.cancelled_at) {
      events.push({
        id: `variation:${r.id}:cancelled`,
        occurredAt: iso(r.cancelled_at),
        recordType: "variation",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: r.display_number
          ? `Variation ${r.display_number} cancelled`
          : `Variation cancelled: "${r.description}"`,
        href: href(r.id),
      });
    }
  }
  return events;
}

// --- Purchase Order ------------------------------------------------------

async function purchaseOrderEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      status: string;
      display_number: string | null;
      created_at: string;
      ordered_at: string | null;
      cancelled_at: string | null;
      closed_at: string | null;
      reopened_at: string | null;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT po.id, po.status, po.display_number, po.created_at, po.ordered_at,
             po.cancelled_at, po.closed_at, po.reopened_at,
             s.id AS stage_id, s.name AS stage_name
      FROM purchase_orders po
      JOIN stages s ON s.id = po.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (id: string) => `/projects/${projectId}/procurement/${id}`;
  for (const r of rows) {
    events.push({
      id: `purchase_order:${r.id}:created`,
      occurredAt: iso(r.created_at),
      recordType: "purchase_order",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: "Purchase Order drafted",
      href: href(r.id),
    });
    if (r.ordered_at) {
      events.push({
        id: `purchase_order:${r.id}:ordered`,
        occurredAt: iso(r.ordered_at),
        recordType: "purchase_order",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Purchase Order ${r.display_number ?? ""} ordered`.trim(),
        href: href(r.id),
      });
    }
    if (r.status === "cancelled" && r.cancelled_at) {
      events.push({
        id: `purchase_order:${r.id}:cancelled`,
        occurredAt: iso(r.cancelled_at),
        recordType: "purchase_order",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: r.display_number
          ? `Purchase Order ${r.display_number} cancelled`
          : "Purchase Order cancelled",
        href: href(r.id),
      });
    }
    if (r.closed_at) {
      events.push({
        id: `purchase_order:${r.id}:closed`,
        occurredAt: iso(r.closed_at),
        recordType: "purchase_order",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Purchase Order ${r.display_number ?? ""} closed`.trim(),
        href: href(r.id),
      });
    }
    if (r.reopened_at) {
      events.push({
        id: `purchase_order:${r.id}:reopened`,
        occurredAt: iso(r.reopened_at),
        recordType: "purchase_order",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Purchase Order ${r.display_number ?? ""} reopened`.trim(),
        href: href(r.id),
      });
    }
  }
  return events;
}

// --- Delivery Record -----------------------------------------------------

async function deliveryEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      delivered_on: string;
      voided_at: string | null;
      po_id: string;
      po_display_number: string | null;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT dr.id, dr.delivered_on, dr.voided_at,
             po.id AS po_id, po.display_number AS po_display_number,
             s.id AS stage_id, s.name AS stage_name
      FROM delivery_records dr
      JOIN purchase_orders po ON po.id = dr.purchase_order_id
      JOIN stages s ON s.id = po.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (poId: string) => `/projects/${projectId}/procurement/${poId}`;
  for (const r of rows) {
    const poLabel = r.po_display_number ?? "Purchase Order";
    events.push({
      id: `delivery:${r.id}:recorded`,
      occurredAt: iso(r.delivered_on),
      recordType: "delivery",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: `Delivery recorded against ${poLabel}`,
      href: href(r.po_id),
    });
    if (r.voided_at) {
      events.push({
        id: `delivery:${r.id}:voided`,
        occurredAt: iso(r.voided_at),
        recordType: "delivery",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Delivery against ${poLabel} voided`,
        href: href(r.po_id),
      });
    }
  }
  return events;
}

// --- Supplier Payment ----------------------------------------------------

async function paymentEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      amount: string;
      paid_on: string;
      voided_at: string | null;
      po_id: string;
      po_display_number: string | null;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT p.id, p.amount, p.paid_on, p.voided_at,
             po.id AS po_id, po.display_number AS po_display_number,
             s.id AS stage_id, s.name AS stage_name
      FROM payment_records p
      JOIN purchase_orders po ON po.id = p.purchase_order_id
      JOIN stages s ON s.id = po.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (poId: string) => `/projects/${projectId}/procurement/${poId}`;
  for (const r of rows) {
    const poLabel = r.po_display_number ?? "Purchase Order";
    const amount = formatTZS(Number(r.amount));
    events.push({
      id: `payment:${r.id}:recorded`,
      occurredAt: iso(r.paid_on),
      recordType: "payment",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: `Payment of ${amount} recorded against ${poLabel}`,
      href: href(r.po_id),
    });
    if (r.voided_at) {
      events.push({
        id: `payment:${r.id}:voided`,
        occurredAt: iso(r.voided_at),
        recordType: "payment",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Payment of ${amount} against ${poLabel} voided`,
        href: href(r.po_id),
      });
    }
  }
  return events;
}

// --- Labour Payment --------------------------------------------------------

async function labourPaymentEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      amount: string;
      paid_on: string;
      voided_at: string | null;
      task_id: string;
      task_description: string;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT lp.id, lp.amount, lp.paid_on, lp.voided_at,
             t.id AS task_id, t.description AS task_description,
             s.id AS stage_id, s.name AS stage_name
      FROM labour_payments lp
      JOIN tasks t ON t.id = lp.task_id
      JOIN stages s ON s.id = t.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (taskId: string) => `/projects/${projectId}/tasks/${taskId}/edit`;
  for (const r of rows) {
    const amount = formatTZS(Number(r.amount));
    events.push({
      id: `labour_payment:${r.id}:recorded`,
      occurredAt: iso(r.paid_on),
      recordType: "labour_payment",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: `Labour payment of ${amount} recorded for "${r.task_description}"`,
      href: href(r.task_id),
    });
    if (r.voided_at) {
      events.push({
        id: `labour_payment:${r.id}:voided`,
        occurredAt: iso(r.voided_at),
        recordType: "labour_payment",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Labour payment of ${amount} for "${r.task_description}" voided`,
        href: href(r.task_id),
      });
    }
  }
  return events;
}

// --- Funding Request -----------------------------------------------------

async function fundingRequestEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      kind: string;
      status: string;
      display_number: string | null;
      created_at: string;
      issued_at: string | null;
      superseded_at: string | null;
      cancelled_at: string | null;
      closed_at: string | null;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT fr.id, fr.kind, fr.status, fr.display_number, fr.created_at,
             fr.issued_at, fr.superseded_at, fr.cancelled_at, fr.closed_at,
             s.id AS stage_id, s.name AS stage_name
      FROM funding_requests fr
      JOIN stages s ON s.id = fr.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (id: string) => `/projects/${projectId}/funding/${id}`;
  const kindLabel = (kind: string) =>
    kind === "additional" ? "Additional Funding Request" : "Funding Request";
  for (const r of rows) {
    const label = kindLabel(r.kind);
    events.push({
      id: `funding_request:${r.id}:drafted`,
      occurredAt: iso(r.created_at),
      recordType: "funding_request",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: `${label} drafted`,
      href: href(r.id),
    });
    if (r.issued_at) {
      events.push({
        id: `funding_request:${r.id}:issued`,
        occurredAt: iso(r.issued_at),
        recordType: "funding_request",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `${label} ${r.display_number ?? ""} issued`.trim(),
        href: href(r.id),
      });
    }
    if (r.status === "superseded" && r.superseded_at) {
      events.push({
        id: `funding_request:${r.id}:superseded`,
        occurredAt: iso(r.superseded_at),
        recordType: "funding_request",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `${label} ${r.display_number ?? ""} superseded`.trim(),
        href: href(r.id),
      });
    }
    if (r.status === "cancelled" && r.cancelled_at) {
      events.push({
        id: `funding_request:${r.id}:cancelled`,
        occurredAt: iso(r.cancelled_at),
        recordType: "funding_request",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: r.display_number
          ? `${label} ${r.display_number} cancelled`
          : `${label} cancelled`,
        href: href(r.id),
      });
    }
    if (r.closed_at) {
      events.push({
        id: `funding_request:${r.id}:closed`,
        occurredAt: iso(r.closed_at),
        recordType: "funding_request",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `${label} ${r.display_number ?? ""} closed`.trim(),
        href: href(r.id),
      });
    }
  }
  return events;
}

// --- Deposit ---------------------------------------------------------------

async function depositEvents(
  tx: AccountTx,
  projectId: string,
  stageId: string | undefined,
): Promise<ActivityEvent[]> {
  const rows = (
    await tx.execute<{
      id: string;
      amount: string;
      received_on: string;
      voided_at: string | null;
      fr_id: string;
      fr_display_number: string | null;
      stage_id: string;
      stage_name: string;
    }>(sql`
      SELECT d.id, d.amount, d.received_on, d.voided_at,
             fr.id AS fr_id, fr.display_number AS fr_display_number,
             s.id AS stage_id, s.name AS stage_name
      FROM deposits d
      JOIN funding_requests fr ON fr.id = d.funding_request_id
      JOIN stages s ON s.id = fr.stage_id
      WHERE s.project_id = ${projectId}
      ${stageFilter(stageId)}
    `)
  ).rows;

  const events: ActivityEvent[] = [];
  const href = (frId: string) => `/projects/${projectId}/funding/${frId}`;
  for (const r of rows) {
    const frLabel = r.fr_display_number ?? "its Funding Request";
    const amount = formatTZS(Number(r.amount));
    events.push({
      id: `deposit:${r.id}:received`,
      occurredAt: iso(r.received_on),
      recordType: "deposit",
      recordId: r.id,
      stageId: r.stage_id,
      stageName: r.stage_name,
      summary: `Deposit of ${amount} received against ${frLabel}`,
      href: href(r.fr_id),
    });
    if (r.voided_at) {
      events.push({
        id: `deposit:${r.id}:voided`,
        occurredAt: iso(r.voided_at),
        recordType: "deposit",
        recordId: r.id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        summary: `Deposit of ${amount} against ${frLabel} voided`,
        href: href(r.fr_id),
      });
    }
  }
  return events;
}

/**
 * Every derived Activity event for a Project (guidelines §40/§60 item 5),
 * optionally filtered to one Stage, merged and sorted newest-first. Computed
 * fresh on every call — nothing stored (see module header).
 */
export async function getProjectActivity(
  projectId: string,
  options?: { stageId?: string },
): Promise<ActivityEvent[]> {
  return withAccount(async (tx) => {
    const stageId = options?.stageId;
    const groups = await Promise.all([
      stageEvents(tx, projectId, stageId),
      taskEvents(tx, projectId, stageId),
      variationEvents(tx, projectId, stageId),
      purchaseOrderEvents(tx, projectId, stageId),
      deliveryEvents(tx, projectId, stageId),
      paymentEvents(tx, projectId, stageId),
      labourPaymentEvents(tx, projectId, stageId),
      fundingRequestEvents(tx, projectId, stageId),
      depositEvents(tx, projectId, stageId),
    ]);

    const events = groups.flat();
    events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return events;
  });
}
