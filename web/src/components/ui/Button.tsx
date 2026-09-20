import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger-quiet";

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-bold transition-[background-color,border-color,transform] duration-100 cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  // The ONE dominant action per view: Site Yellow fill, charcoal bold label.
  // Pressed state reuses the brand's own --mm-yellow-pressed token.
  primary:
    "bg-accent text-on-accent hover:bg-[var(--mm-yellow-pressed)] active:bg-[var(--mm-yellow-pressed)]",
  // Everything else: white fill, 1px charcoal border and charcoal label.
  // Pressed state borders and washes in brand yellow as the tap cue.
  secondary:
    "bg-card text-foreground border border-foreground hover:bg-muted active:border-accent active:bg-accent/10",
  // Tertiary navigation (wizard "Back", "Cancel") — quietest control.
  ghost:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-muted-foreground transition-[color,background-color,transform] duration-100 hover:text-foreground active:scale-[0.97] active:bg-accent/10 active:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
  // Low-emphasis destructive action — never a filled button. The label stays
  // destructive-red; the brand-yellow wash is only the system tap cue.
  "danger-quiet":
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-destructive transition-[background-color,transform] duration-100 hover:underline active:scale-[0.97] active:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50",
};

/** The classes for a button variant, for elements that cannot be `<Button>` (e.g. a hard-navigation `<a>`). */
export function buttonClassName(variant: Variant = "secondary", className = ""): string {
  const usesBase = variant === "primary" || variant === "secondary";
  return `${usesBase ? BASE : ""} ${VARIANTS[variant]} ${className}`.trim();
}

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
  const classes = buttonClassName(variant, className);

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
