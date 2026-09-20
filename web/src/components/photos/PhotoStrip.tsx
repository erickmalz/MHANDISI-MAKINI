"use client";

import { useActionState } from "react";
import { Camera, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import { PHOTO_CATEGORIES, type PhotoCategory, type PhotoMeta } from "@/lib/photos";
import { Notice } from "@/components/ui/Notice";

const CATEGORY_KEYS: Record<PhotoCategory, MessageKey> = {
  progress: "stages.photos.categories.progress",
  material_delivery: "stages.photos.categories.materialDelivery",
  issue: "stages.photos.categories.issue",
  before: "stages.photos.categories.before",
  after: "stages.photos.categories.after",
  receipt: "stages.photos.categories.receipt",
  delivery_note: "stages.photos.categories.deliveryNote",
  variation: "stages.photos.categories.variation",
  closeout: "stages.photos.categories.closeout",
};

/**
 * A thumbnail grid + upload form for one photo target (Phase 4 Slice 4.1,
 * ticket 02). Deliberately generic — this slice wires it onto the Stage
 * detail page ("Stage photos") and each Site Diary entry, but it takes no
 * target-specific prop: the caller pre-binds `uploadAction`/`deleteAction`
 * to whichever of the seven targets (Project/Stage/Task/Site Diary
 * Entry/Delivery/Payment Record/Variation) it represents, so wiring a new
 * target onto Task/Delivery/Payment/Variation pages later needs no change
 * here.
 */
export function PhotoStrip({
  photos,
  uploadAction,
  deleteAction,
  emptyLabel,
}: {
  photos: PhotoMeta[];
  uploadAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (photoId: string) => Promise<void>;
  emptyLabel?: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(uploadAction, {});

  return (
    <div className="flex flex-col gap-3">
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel ?? t("stages.photos.empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <li key={p.id} className="flex w-28 flex-col gap-1">
              <a href={`/photos/${p.id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- raw bytea-backed bytes served by our own route, not an optimizable remote/static asset */}
                <img
                  src={`/photos/${p.id}`}
                  alt={p.caption ?? t(CATEGORY_KEYS[p.category])}
                  className="h-28 w-28 rounded-lg border border-border object-cover"
                />
              </a>
              <span className="truncate text-sm font-bold text-muted-foreground">
                {t(CATEGORY_KEYS[p.category])}
              </span>
              {p.caption && (
                <span className="truncate text-sm text-muted-foreground">{p.caption}</span>
              )}
              <form action={deleteAction.bind(null, p.id)}>
                <button
                  type="submit"
                  className="inline-flex min-h-12 cursor-pointer items-center gap-1 px-2 text-sm font-semibold text-destructive hover:underline rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
                >
                  <Trash size={12} aria-hidden="true" />
                  {t("stages.photos.remove")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground">{t("stages.photos.photo")}</label>
            <input
              type="file"
              name="photo"
              accept="image/png,image/jpeg,image/webp"
              className={controlClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground">{t("stages.photos.category")}</label>
            <select name="category" className={controlClass} defaultValue="progress">
              {PHOTO_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(CATEGORY_KEYS[c])}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" type="submit" disabled={pending}>
            <Camera size={16} aria-hidden="true" />
            {pending ? t("stages.photos.uploading") : t("stages.photos.add")}
          </Button>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-bold text-muted-foreground rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground">
            {t("stages.photos.optional")}
          </summary>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-foreground">{t("stages.photos.caption")}</label>
              <input type="text" name="caption" className={controlClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-foreground">{t("stages.photos.gpsLat")}</label>
              <input type="text" inputMode="decimal" name="gpsLat" className={controlClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-foreground">{t("stages.photos.gpsLng")}</label>
              <input type="text" inputMode="decimal" name="gpsLng" className={controlClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-foreground">{t("stages.photos.capturedOn")}</label>
              <input type="date" name="capturedOn" className={controlClass} />
            </div>
          </div>
        </details>

        {state.fieldErrors?.photo && (
          <Notice tone="error">{state.fieldErrors.photo}</Notice>
        )}
        {state.fieldErrors?.category && (
          <Notice tone="error">{state.fieldErrors.category}</Notice>
        )}
        {state.error && <Notice tone="error">{state.error}</Notice>}
      </form>
    </div>
  );
}
