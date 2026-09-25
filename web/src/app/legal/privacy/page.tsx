import type { Metadata } from "next";

import { PRIVACY_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <article className="prose-mm">
      <h1 className="mm-page-title font-bold text-foreground">Privacy policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Version {PRIVACY_VERSION}
      </p>
      <p className="mt-4 text-foreground">
        The full Privacy Policy is being finalised and is launch-blocking
        (data-protection ticket 03). It will disclose the database host and the
        email processor, both outside Tanzania, and the PDPC data-controller
        registration. This draft placeholder records that a version string is
        accepted at signup.
      </p>
    </article>
  );
}
