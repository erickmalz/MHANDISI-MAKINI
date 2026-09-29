import { filenameFor, mimeFor, withinActivation, type ShareFormat } from "./share-logic";

type Navigatorish = Navigator & { userActivation?: { isActive: boolean } };

/**
 * Fetch one export as a shareable `File` (exact MIME + matching extension) and
 * report whether it arrived while the tap that started it can still open the
 * share sheet. Browser-only; throws on a network or HTTP failure.
 */
export async function fetchShareFile(item: {
  format: ShareFormat;
  href: string;
  filename: string;
}): Promise<{ file: File; inTime: boolean }> {
  const startedAt = performance.now();
  const res = await fetch(item.href, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const file = new File([blob], filenameFor(item.format, item.filename), {
    type: mimeFor(item.format),
  });
  const activation = (navigator as Navigatorish).userActivation;
  const inTime =
    withinActivation(startedAt, performance.now()) && (activation?.isActive ?? true);
  return { file, inTime };
}
