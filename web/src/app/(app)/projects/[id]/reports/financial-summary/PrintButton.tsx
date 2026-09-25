"use client";

import { Printer } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/Button";

/** Triggers the browser print dialog. `PrintSheet` supplies the only content
 *  that survives `@media print` (see its own doc comment). */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer size={20} aria-hidden="true" />
      {label}
    </Button>
  );
}
