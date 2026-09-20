"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { StageTemplateStage } from "@/lib/stage-templates";

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
        .filter((t) => t.description.trim() !== "")
        .map((t) => ({
          description: t.description.trim(),
          materialLines: t.materialLines
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
        <Field label="Template name" required error={errors.name}>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={controlClass}
            placeholder="e.g. Standard 3-bedroom house"
          />
        </Field>
      </Card>

      {errors.stages && (
        <p className="text-sm font-bold text-destructive">{errors.stages}</p>
      )}

      <ul className="flex flex-col gap-4">
        {stages.map((stage, si) => (
          <li key={si}>
            <Card className="flex flex-col gap-4">
              <div className="flex items-start gap-2">
                <Field label={`Stage ${si + 1} name`} required>
                  <input
                    value={stage.name}
                    onChange={(e) => updateStage(si, { name: e.target.value })}
                    className={controlClass}
                    placeholder="e.g. Foundation"
                  />
                </Field>
                <button
                  type="button"
                  aria-label={`Remove stage ${si + 1}`}
                  onClick={() => setStages(stages.filter((_, i) => i !== si))}
                  className="mt-7 cursor-pointer text-muted-foreground hover:text-destructive rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                >
                  <Trash size={16} aria-hidden="true" />
                </button>
              </div>

              <ul className="flex flex-col gap-3 border-l-2 border-border pl-4">
                {stage.tasks.map((task, ti) => (
                  <li key={ti} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Stage ${si + 1} task ${ti + 1} name`}
                        value={task.description}
                        onChange={(e) =>
                          updateStage(si, {
                            tasks: stage.tasks.map((t, i) =>
                              i === ti ? { ...t, description: e.target.value } : t,
                            ),
                          })
                        }
                        className={controlClass}
                        placeholder="Task name, e.g. Excavation"
                      />
                      <button
                        type="button"
                        aria-label={`Remove task ${ti + 1}`}
                        onClick={() =>
                          updateStage(si, { tasks: stage.tasks.filter((_, i) => i !== ti) })
                        }
                        className="shrink-0 cursor-pointer text-muted-foreground hover:text-destructive rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                      >
                        <Trash size={16} aria-hidden="true" />
                      </button>
                    </div>

                    <ul className="flex flex-col gap-2 pl-4">
                      {task.materialLines.map((line, li) => (
                        <li key={li} className="flex items-center gap-2">
                          <input
                            aria-label={`Material ${li + 1} name`}
                            value={line.item}
                            onChange={(e) =>
                              updateStage(si, {
                                tasks: stage.tasks.map((t, i) =>
                                  i === ti
                                    ? {
                                        ...t,
                                        materialLines: t.materialLines.map((l, j) =>
                                          j === li ? { ...l, item: e.target.value } : l,
                                        ),
                                      }
                                    : t,
                                ),
                              })
                            }
                            className={`${controlClass} sm:col-span-2`}
                            placeholder="Material, e.g. Cement"
                          />
                          <input
                            aria-label={`Material ${li + 1} unit`}
                            value={line.unit}
                            onChange={(e) =>
                              updateStage(si, {
                                tasks: stage.tasks.map((t, i) =>
                                  i === ti
                                    ? {
                                        ...t,
                                        materialLines: t.materialLines.map((l, j) =>
                                          j === li ? { ...l, unit: e.target.value } : l,
                                        ),
                                      }
                                    : t,
                                ),
                              })
                            }
                            className={`${controlClass} max-w-28`}
                            placeholder="Unit"
                          />
                          <button
                            type="button"
                            aria-label={`Remove material ${li + 1}`}
                            onClick={() =>
                              updateStage(si, {
                                tasks: stage.tasks.map((t, i) =>
                                  i === ti
                                    ? {
                                        ...t,
                                        materialLines: t.materialLines.filter((_, j) => j !== li),
                                      }
                                    : t,
                                ),
                              })
                            }
                            className="shrink-0 cursor-pointer text-muted-foreground hover:text-destructive rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
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
                              tasks: stage.tasks.map((t, i) =>
                                i === ti
                                  ? { ...t, materialLines: [...t.materialLines, emptyLine()] }
                                  : t,
                              ),
                            })
                          }
                          className="inline-flex min-h-8 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
                        >
                          <Plus size={14} aria-hidden="true" />
                          Add material
                        </button>
                      </li>
                    </ul>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => updateStage(si, { tasks: [...stage.tasks, emptyTask()] })}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Add task
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
        className="inline-flex min-h-12 w-fit cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
      >
        <Plus size={16} aria-hidden="true" />
        Add stage
      </button>

      {state.error && <p className="text-sm font-bold text-destructive">{state.error}</p>}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-12 items-center px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
