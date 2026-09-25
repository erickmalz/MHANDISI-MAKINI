import type { Metadata } from "next";

import { TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <article className="prose-mm">
      <h1 className="mm-page-title font-bold text-foreground">
        Terms of service
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Version {TERMS_VERSION}</p>
      <p className="mt-4 text-foreground">
        The full terms of service are being finalised and are launch-blocking
        (data-protection ticket 03). This draft placeholder records that a
        version string is accepted at signup; the binding text will replace it
        before the product opens to the public.
      </p>
    </article>
  );
}
