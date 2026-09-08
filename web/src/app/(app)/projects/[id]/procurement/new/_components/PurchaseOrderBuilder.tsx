"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import type { Project } from "@/lib/types";
import { Money } from "@/components/ui/Money";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { formatDate, today } from "@/lib/format";

const STEP_LABELS = ["Supplier", "Materials", "Terms", "Review"] as const;

const NEXT_LABEL: Record<number, string> = {
  1: "Continue to materials",
  2: "Continue to terms",
  3: "Continue to review",
};

interface DraftLine {
  key: string;
  item: string;
  unit: string;
  qty: string;
  unitPrice: string;
}

function emptyLine(): DraftLine {
  return { key: crypto.randomUUID(), item: "", unit: "", qty: "1", unitPrice: "0" };
}

export function PurchaseOrderBuilder({ project }: { project: Project }) {
  const stages = project.stages.slice().sort((a, b) => a.seq - b.seq);
  const [stageId, setStageId] = useState(
    project.currentStageId ?? stages[0]?.id ?? "",
  );
  const stage = stages.find((s) => s.id === stageId) ?? stages[0];

  const [supplier, setSupplier] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("50% deposit, balance on delivery");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const [step, setStep] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [issued, setIssued] = useState(false);
  const [poNumber] = useState(
    () =>
      `PO-${new Date().getFullYear()}-${project.code.slice(-3)}-${String(
        Math.floor(Math.random() * 90) + 10
      ).padStart(3, "0")}`
  );

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const parsedLines = lines.map((l) => ({
    ...l,
    qtyNum: Number(l.qty) || 0,
    unitPriceNum: Number(l.unitPrice) || 0,
  }));
  const total = parsedLines.reduce((sum, l) => sum + l.qtyNum * l.unitPriceNum, 0);

  const supplierMissing = supplier.trim().length === 0;
  const deliveryMissing = !expectedDeliveryDate;
  const canProceedFromSupplier = !supplierMissing && !deliveryMissing;
  const canProceedFromMaterials = parsedLines.every(
    (l) => l.item.trim() && l.unit.trim() && l.qtyNum > 0 && l.unitPriceNum > 0
  );

  function goNext() {
    setAttempted(true);
    if (step === 1 && !canProceedFromSupplier) return;
    if (step === 2 && !canProceedFromMaterials) return;
    setAttempted(false);
    setStep((s) => Math.min(4, s + 1));
  }
  function goBack() {
    setAttempted(false);
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <div>
      <StepIndicator steps={STEP_LABELS} currentStep={step} />

      {step === 1 && (
        <StepCard title="Supplier and stage">
          <div className="flex flex-col gap-4">
            <Field label="Stage">
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className={`${controlClass} cursor-pointer`}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.seq}. {s.name} — {s.status}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Supplier"
              required
              hint="Company or depot name, and branch if it matters."
              error={attempted && supplierMissing ? "Enter the supplier name." : undefined}
            >
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className={controlClass}
              />
            </Field>
            <Field
              label="Expected delivery date"
              required
              error={
                attempted && deliveryMissing ? "Choose the expected delivery date." : undefined
              }
            >
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className={`${controlClass} cursor-pointer`}
              />
            </Field>
          </div>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Material lines">
          <div className="flex flex-col gap-4">
            {lines.map((l, i) => (
              <div key={l.key} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-card-foreground">Line {i + 1}</p>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => removeLine(l.key)}
                    disabled={lines.length === 1}
                  >
                    <Trash size={16} aria-hidden="true" />
                    Remove
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Material">
                    <input
                      value={l.item}
                      onChange={(e) => updateLine(l.key, { item: e.target.value })}
                      className={controlClass}
                    />
                  </Field>
                  <Field label="Unit" hint="bag, ton, piece, m²…">
                    <input
                      value={l.unit}
                      onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                      className={controlClass}
                    />
                  </Field>
                  <Field label="Quantity">
                    <input
                      type="number"
                      min={0}
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                      className={controlClass}
                    />
                  </Field>
                  <Field label="Unit price (TZS)">
                    <input
                      type="number"
                      min={0}
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                      className={controlClass}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 inline-flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold text-foreground underline"
          >
            <Plus size={16} aria-hidden="true" />
            Add material line
          </button>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="font-bold text-card-foreground">Expected total</span>
            <Money amount={total} className="text-lg font-bold text-card-foreground" />
          </div>
          {attempted && !canProceedFromMaterials && (
            <p className="mt-3 text-sm font-bold text-destructive">
              Fill in every line — material, unit, quantity and unit price.
            </p>
          )}
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="Terms">
          <div className="flex flex-col gap-4">
            <Field label="Payment terms">
              <input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Notes" hint="Optional.">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`${controlClass} min-h-24`}
              />
            </Field>
          </div>
        </StepCard>
      )}

      {step === 4 && (
        <StepCard title={issued ? "Purchase order issued" : "Review and issue"}>
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-lg font-bold text-foreground">
                  Purchase order {poNumber}
                </p>
                <p className="text-sm text-muted-foreground">{today()}</p>
              </div>
              {issued && (
                <span className="inline-flex items-center gap-2 rounded bg-health-green-bg px-2 py-1 text-sm font-bold text-health-green">
                  Marked as issued
                </span>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <SummaryField label="Stage" value={stage.name} />
              <SummaryField label="Supplier" value={supplier} />
              <SummaryField
                label="Expected delivery"
                value={expectedDeliveryDate ? formatDate(expectedDeliveryDate) : "—"}
              />
              <SummaryField label="Payment terms" value={paymentTerms} />
            </dl>
            <ul className="mt-5 flex flex-col divide-y divide-border">
              {parsedLines.map((l) => (
                <li
                  key={l.key}
                  className="flex items-start justify-between gap-3 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="text-card-foreground">{l.item}</span>
                    <span className="block text-sm text-muted-foreground">
                      {l.qtyNum} {l.unit} × {l.unitPriceNum.toLocaleString("en-US")}
                    </span>
                  </span>
                  <Money
                    amount={l.qtyNum * l.unitPriceNum}
                    className="shrink-0 whitespace-nowrap font-bold text-card-foreground"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <span className="font-bold text-card-foreground">Expected total</span>
              <Money amount={total} className="text-lg font-bold text-card-foreground" />
            </div>
            {notes && <p className="mt-4 text-sm text-muted-foreground">{notes}</p>}
          </div>

          {!issued ? (
            <div className="mt-5">
              <Button variant="primary" type="button" onClick={() => setIssued(true)}>
                Issue purchase order
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Marked as issued on this device on {today()}. Sending the order to
                the supplier is not wired up in this prototype.
              </p>
              <Link
                href={`/projects/${project.id}/procurement`}
                className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline"
              >
                Return to purchase orders
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </StepCard>
      )}

      {!(step === 4 && issued) && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" type="button" onClick={goBack} disabled={step === 1}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Button>
          {step < 4 && (
            <Button variant="primary" type="button" onClick={goNext}>
              {NEXT_LABEL[step]}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold text-card-foreground">{value}</dd>
    </div>
  );
}
