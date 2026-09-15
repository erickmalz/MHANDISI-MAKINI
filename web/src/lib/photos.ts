/**
 * The Progress Photos domain — view-model types and pure helpers, no data
 * access, safe to import from client components (Phase 4 Slice 4.1, ticket
 * 02).
 *
 * A photo attaches to exactly one of seven targets (guidelines §31; §31's
 * eighth target, "Stage Closeout," is just a `stage`-targeted photo tagged
 * `category: "closeout"` — see `src/lib/data/schema/photos.ts`).
 */

/** The `photo_category` enum — §31's recommended list, verbatim. */
export type PhotoCategory =
  | "progress"
  | "material_delivery"
  | "issue"
  | "before"
  | "after"
  | "receipt"
  | "delivery_note"
  | "variation"
  | "closeout";

export const PHOTO_CATEGORIES: PhotoCategory[] = [
  "progress",
  "material_delivery",
  "issue",
  "before",
  "after",
  "receipt",
  "delivery_note",
  "variation",
  "closeout",
];

const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  progress: "Progress",
  material_delivery: "Material Delivery",
  issue: "Issue",
  before: "Before",
  after: "After",
  receipt: "Receipt",
  delivery_note: "Delivery Note",
  variation: "Variation",
  closeout: "Closeout",
};

export function photoCategoryLabel(category: PhotoCategory): string {
  return PHOTO_CATEGORY_LABELS[category] ?? category;
}

/**
 * The seven live targets a `photos` row can point at (ticket 02's Answer).
 * `paymentRecord` doubles for both §31's "Purchase delivery... Receipt" and
 * plain "Receipt" targets — a receipt is already a Payment Record's proof.
 */
export type PhotoTarget =
  | "project"
  | "stage"
  | "task"
  | "siteDiaryEntry"
  | "delivery"
  | "paymentRecord"
  | "variation";

export interface PhotoMeta {
  id: string;
  filename: string;
  contentType: string;
  category: PhotoCategory;
  caption: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  /** The photo's own date (ISO `YYYY-MM-DD`), distinct from `createdAt` (upload time). */
  capturedOn: string | null;
  createdAt: string;
}
