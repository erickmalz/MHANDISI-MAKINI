import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger-quiet";

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  // The ONE dominant action per view: Site Yellow fill, charcoal bold label.
  primary:
    "bg-accent text-on-accent hover:bg-[var(--mm-yellow-pressed)]",
  // Everything else: white fill, 1px charcoal border and charcoal label.
  secondary:
    "bg-card text-foreground border border-foreground hover:bg-muted",
  // Tertiary navigation (wizard "Back", "Cancel") — quietest control.
  ghost:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 px-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
  // Low-emphasis destructive action — never a filled button.
  "danger-quiet":
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 px-3 text-sm font-semibold text-destructive transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-50",
};

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "secondary", children, className = "", ...rest } = props;
  const usesBase = variant === "primary" || variant === "secondary";
  const classes = `${usesBase ? BASE : ""} ${VARIANTS[variant]} ${className}`.trim();

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link className={classes} {...(rest as ComponentProps<typeof Link>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
