"use client";

import { useActionState } from "react";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";

import {
  removePurchaseOrderAttachmentAction,
  uploadPurchaseOrderAttachmentAction,
} from "@/app/actions/attachments";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";

/**
 * The supplier invoice / receipt / delivery note attachment on a Purchase
 * Order (Operational Control decision 1). One file, replaceable. Uses
 * `useActionState` directly (not the `.bind` pattern most Server Actions
 * here use) since it needs two ids bound ahead of the form data — same as
 * `AccountLogoForm`'s upload form.
 */
export function AttachmentCard({
  projectId,
  poId,
  attachment,
}: {
  projectId: string;
  poId: string;
  attachment: { id: string; filename: string } | null;
}) {
  const [state, formAction, pending] = useActionState(
    uploadPurchaseOrderAttachmentAction.bind(null, projectId, poId),
    {},
  );

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-card-foreground">Attachment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The supplier&apos;s invoice, receipt, or delivery note for this order.
        </p>
      </div>

      {attachment && (
        <a
          href={`/attachments/${attachment.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 w-fit items-center gap-2 rounded-lg border border-foreground bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-muted"
        >
          <DownloadSimple size={16} aria-hidden="true" />
          {attachment.filename}
        </a>
      )}

      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <Field
          label={attachment ? "Replace attachment" : "Upload attachment"}
          error={state.fieldErrors?.attachment}
        >
          <input
            type="file"
            name="attachment"
            accept="application/pdf,image/png,image/jpeg"
            className={controlClass}
          />
        </Field>
        {state.error && <p className="text-sm font-bold text-destructive">{state.error}</p>}
        <div>
          <Button variant="secondary" type="submit" disabled={pending}>
            {pending ? "Uploading…" : attachment ? "Replace attachment" : "Upload attachment"}
          </Button>
        </div>
      </form>

      {attachment && (
        <form action={removePurchaseOrderAttachmentAction.bind(null, projectId, poId)}>
          <Button variant="danger-quiet" type="submit">
            Remove attachment
          </Button>
        </form>
      )}
    </Card>
  );
}
