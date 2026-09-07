import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Mhandisi Makini — Let's build together",
  description: "Construction project management for the site engineer.",
};

export default function WelcomePage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 text-center sm:px-6">
      <div className="flex w-full max-w-xl flex-col items-center">
      <Image
        src="/brand/logo-stacked.png"
        alt="Mhandisi Makini"
        width={905}
        height={1000}
        priority
        className="h-auto w-[220px]"
      />

      <h1 className="mt-8 text-[2.25rem] font-bold leading-tight text-foreground">
        A clearer view of your site
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Construction project management for the site engineer. See where your
        project&apos;s money stands, and what to do next.
      </p>

      <div className="mt-8">
        <Button variant="primary" href="/sign-in">
          Sign in
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Just looking?{" "}
        <Link href="/" className="font-bold text-foreground underline">
          Open the prototype
        </Link>
      </p>
      </div>
    </main>
  );
}
