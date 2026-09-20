"use client";

import { useActionState, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { StageTemplateStage } from "@/lib/stage-templates";
import { Notice } from "@/components/ui/Notice";
import { LineField } from "@/components/ui/LineField";
import { useT } from "@/lib/i18n/client";

/**
 * The Stage Template editor (Operational Control decision 2, Slice 6) — a
 * nested Stage → Task → Material-Line tree, names and units only. Same
 * hidden-JSON-field posting pattern as `FundingRequestForm`'s `lines`: the
 * tree is built client-side and serialized into one hidden `stages` field on
 * submit; `templateStagesSchema` parses it server-side.
 */

type MaterialLineRow = { item: string; unit: string };
type TaskRow = { description: string; materialLines: MaterialLineRow[] };
type StageRow = { name: string; tasks: TaskRow[] };

const emptyLine = (): MaterialLineRow => ({ item: "", unit: "" });
const emptyTask = (): TaskRow => ({ description: "", materialLines: [] });
const emptyStage = (): StageRow => ({ name: "", tasks: [emptyTask()] });

export function StageTemplateForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: { name: string; stages: StageTemplateStage[] };
  submitLabel: string;
  cancelHref: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  const [name, setName] = useState(initial?.name ?? "");
  const [stages, setStages] = useState<StageRow[]>(
    initial?.stages.length ? initial.stages : [emptyStage()],
  );

  const serialized = stages
    .filter((s) => s.name.trim() !== "")
    .map((s) => ({
      name: s.name.trim(),
      tasks: s.tasks
        .filter((tk) => tk.description.trim() !== "")
        .map((tk) => ({
          description: tk.description.trim(),
          materialLines: tk.materialLines
            .filter((l) => l.item.trim() !== "" && l.unit.trim() !== "")
            .map((l) => ({ item: l.item.trim(), unit: l.unit.trim() })),
        })),
    }));

  function updateStage(i: number, patch: Partial<StageRow>) {
    setStages(stages.map((s, si) => (si === i ? { ...s, ...patch } : s)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="stages" value={JSON.stringify(serialized)} />

      <Card className="flex flex-col gap-4">
        <Field label={t("stageTemplates.form.name")} required error={errors.name}>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={controlClass}
            placeholder={t("stageTemplates.form.namePlaceholder")}
          />
        </Field>
      </Card>

      {errors.stages && (
        <Notice tone="error">{errors.stages}</Notice>
      )}

      <ul className="flex flex-col gap-4">
        {stages.map((stage, si) => (
          <li key={si}>
            <Card className="flex flex-col gap-4">
              <div className="flex items-start gap-2">
                <Field label={t("stageTemplates.form.stageName", { n: si + 1 })} required>
                  <input
                    value={stage.name}
                    onChange={(e) => updateStage(si, { name: e.target.value })}
                    className={controlClass}
                    placeholder={t("stageTemplates.form.stagePlaceholder")}
                  />
                </Field>
                <button
                  type="button"
                  aria-label={t("stageTemplates.form.removeStage", { n: si + 1 })}
                  onClick={() => setStages(stages.filter((_, i) => i !== si))}
                  className="mt-6 inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-destructive rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                >
                  <Trash size={16} aria-hidden="true" />
                </button>
              </div>

              <ul className="flex flex-col gap-3 border-l-2 border-border pl-4">
                {stage.tasks.map((task, ti) => (
                  <li key={ti} className="flex flex-col gap-2">
                    <div className="flex items-end gap-2">
                      <LineField label={t("stageTemplates.form.taskName")} className="flex-1">
                        <input
                          aria-label={t("stageTemplates.form.taskAria", { stage: si + 1, task: ti + 1 })}
                          value={task.description}
                          onChange={(e) =>
                            updateStage(si, {
                              tasks: stage.tasks.map((tk, i) =>
                                i === ti ? { ...tk, description: e.target.value } : tk,
                              ),
                            })
                          }
                          className={controlClass}
                          placeholder={t("stageTemplates.form.taskPlaceholder")}
                        />
                      </LineField>
                      <button
                        type="button"
                        aria-label={t("stageTemplates.form.removeTask", { n: ti + 1 })}
                        onClick={() =>
                          updateStage(si, { tasks: stage.tasks.filter((_, i) => i !== ti) })
                        }
                        className="shrink-0 inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-destructive rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                      >
                        <Trash size={16} aria-hidden="true" />
                      </button>
                    </div>

                    <ul className="flex flex-col gap-2 pl-4">
                      {task.materialLines.map((line, li) => (
                        <li key={li} className="flex items-end gap-2">
                          <LineField label={t("stageTemplates.form.material")} className="flex-1">
                            <input
                              aria-label={t("stageTemplates.form.materialAria", { n: li + 1 })}
                              value={line.item}
                              onChange={(e) =>
                                updateStage(si, {
                                  tasks: stage.tasks.map((tk, i) =>
                                    i === ti
                                      ? {
                                          ...tk,
                                          materialLines: tk.materialLines.map((l, j) =>
                                            j === li ? { ...l, item: e.target.value } : l,
                                          ),
                                        }
                                      : tk,
                                  ),
                                })
                              }
                              className={controlClass}
                              placeholder={t("stageTemplates.form.materialPlaceholder")}
                            />
                          </LineField>
                          <LineField label={t("stageTemplates.form.unit")} className="w-28 shrink-0">
                            <input
                              aria-label={t("stageTemplates.form.unitAria", { n: li + 1 })}
                              value={line.unit}
                              onChange={(e) =>
                                updateStage(si, {
                                  tasks: stage.tasks.map((tk, i) =>
                                    i === ti
                                      ? {
                                          ...tk,
                                          materialLines: tk.materialLines.map((l, j) =>
                                            j === li ? { ...l, unit: e.target.value } : l,
                                          ),
                                        }
                                      : tk,
                                  ),
                                })
                              }
                              className={controlClass}
                              placeholder={t("stageTemplates.form.unitPlaceholder")}
                            />
                          </LineField>
                          <button
                            type="button"
                            aria-label={t("stageTemplates.form.removeMaterial", { n: li + 1 })}
                            onClick={() =>
                              updateStage(si, {
                                tasks: stage.tasks.map((tk, i) =>
                                  i === ti
                                    ? {
                                        ...tk,
                                        materialLines: tk.materialLines.filter((_, j) => j !== li),
                                      }
                                    : tk,
                                ),
                              })
                            }
                            className="shrink-0 inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-destructive rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                          >
                            <Trash size={16} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          type="button"
                          onClick={() =>
                            updateStage(si, {
                              tasks: stage.tasks.map((tk, i) =>
                                i === ti
                                  ? { ...tk, materialLines: [...tk.materialLines, emptyLine()] }
                                  : tk,
                              ),
                            })
                          }
                          className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
                        >
                          <Plus size={14} aria-hidden="true" />
                          {t("stageTemplates.form.addMaterial")}
                        </button>
                      </li>
                    </ul>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => updateStage(si, { tasks: [...stage.tasks, emptyTask()] })}
                    className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
                  >
                    <Plus size={16} aria-hidden="true" />
                    {t("stageTemplates.form.addTask")}
                  </button>
                </li>
              </ul>
            </Card>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setStages([...stages, emptyStage()])}
        className="inline-flex min-h-12 w-fit cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
      >
        <Plus size={16} aria-hidden="true" />
        {t("stageTemplates.form.addStage")}
      </button>

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? t("stageTemplates.form.saving") : submitLabel}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("stageTemplates.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
