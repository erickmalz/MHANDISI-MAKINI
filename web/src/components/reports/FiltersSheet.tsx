"use client";

import { useRef, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FunnelSimple, X } from "@phosphor-icons/react/dist/ssr";

import { buttonClassName } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

/**
 * The "Filters (n)" button and the sheet it opens (Report toolbar layout,
 * variant A): a bottom sheet on phones, a side panel from `md` up. A native
 * modal `<dialog>` gives the focus trap, Escape and focus return for free.
 *
 * The fields are server-rendered `children` inside a plain GET form, so it
 * still works without JavaScript; with JavaScript, empty ("All") fields are
 * dropped from the URL before navigating. Filter state itself lives only in
 * the URL — this component only knows whether the sheet is open.
 */
export function FiltersSheet({
  action,
  activeCount,
  clearHref,
  children,
}: {
  /** The report's own path; the form submits back to it. */
  action: string;
  activeCount: number;
  clearHref: string;
  children: ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    const qs = params.toString();
    dialog.current?.close();
    router.push(qs ? `${action}?${qs}` : action);
  }

  const label =
    activeCount > 0
      ? t("reportToolbar.filtersCount", { count: activeCount })
      : t("reportToolbar.filters");

  return (
    <>
      <button
        type="button"
        className={buttonClassName("secondary", "px-4")}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <FunnelSimple size={20} aria-hidden="true" />
        {label}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="report-filters-title"
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50 md:ml-auto md:mt-0 md:h-dvh md:max-h-none md:w-[400px] md:rounded-none md:rounded-l-2xl"
      >
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="report-filters-title" className="text-xl font-bold text-card-foreground">
              {t("reportToolbar.sheet.title")}
            </h2>
            <form method="dialog">
              <button
                type="submit"
                aria-label={t("reportToolbar.sheet.close")}
                className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </form>
          </div>

          <form method="get" action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
            {children}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button type="submit" className={buttonClassName("primary")}>
                {t("reportToolbar.sheet.apply")}
              </button>
              <Link
                href={clearHref}
                onClick={() => dialog.current?.close()}
                className={buttonClassName("ghost")}
              >
                {t("reportToolbar.sheet.clear")}
              </Link>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
