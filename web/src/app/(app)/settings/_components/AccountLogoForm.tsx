"use client";

import { useActionState, useState } from "react";

import { removeAccountLogoAction, uploadAccountLogoAction } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";

/**
 * Letterhead logo upload / replace / remove (Slice 2.8 Part 2). The preview
 * loads from `/settings/logo` — the DAL never hands the raw bytes to this
 * Server Component as a page prop (see `getAccountLogo` / the route handler
 * at `../logo/route.ts`); a plain `<img>` is used rather than `next/image`
 * since the source is a same-origin, content-type-varying preview route, not
 * a static asset.
 *
 * "Remove logo" is a plain form action (redirects back to `/settings`,
 * matching e.g. `closePurchaseOrderAction`) since there's no field data to
 * report back inline. "Upload" goes through `useActionState` for the
 * size/MIME field error.
 */
export function AccountLogoForm({ hasLogo }: { hasLogo: boolean }) {
  // Cache-busts the preview after a successful upload so the browser doesn't
  // keep showing the previous image at the same URL.
  const [logoVersion, setLogoVersion] = useState(0);

  const [uploadState, uploadAction, uploadPending] = useActionState(
    async (
      prev: Awaited<ReturnType<typeof uploadAccountLogoAction>>,
      formData: FormData,
    ) => {
      const result = await uploadAccountLogoAction(prev, formData);
      if (!result.error && !result.fieldErrors) setLogoVersion((v) => v + 1);
      return result;
    },
    {},
  );

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-foreground">Letterhead logo</h2>
      <p className="text-sm text-muted-foreground">
        Shown on every Funding Request, Fee Invoice and Purchase Order you issue.
        PNG or JPEG, up to 1MB.
      </p>

      {hasLogo && (
        // Same-origin preview route, not a static asset; see file doc comment above.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/settings/logo?v=${logoVersion}`}
          alt="Current letterhead logo"
          className="h-16 w-auto rounded border border-border bg-card object-contain p-2"
        />
      )}

      <form action={uploadAction} className="flex flex-col gap-3" noValidate>
        <Field
          label={hasLogo ? "Replace logo" : "Upload logo"}
          error={uploadState.fieldErrors?.logo}
        >
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg"
            className={controlClass}
          />
        </Field>

        {uploadState.error && (
          <p className="text-sm font-bold text-destructive">{uploadState.error}</p>
        )}

        <div>
          <Button variant="secondary" type="submit" disabled={uploadPending}>
            {uploadPending ? "Uploading…" : hasLogo ? "Replace logo" : "Upload logo"}
          </Button>
        </div>
      </form>

      {hasLogo && (
        <form action={removeAccountLogoAction}>
          <Button variant="danger-quiet" type="submit">
            Remove logo
          </Button>
        </form>
      )}
    </Card>
  );
}
