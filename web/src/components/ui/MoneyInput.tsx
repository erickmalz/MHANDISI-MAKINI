"use client";

import { useState, type ComponentProps } from "react";

import { cleanMoney, groupMoney, type MoneyRules } from "@/lib/money-input";
import { controlClass } from "./Field";

type Props = Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "name" | "inputMode"
> &
  MoneyRules & {
    /** Posts the plain digits under this name (a hidden field carries them). */
    name?: string;
    /** Controlled value, as plain digits. */
    value?: string;
    /** Uncontrolled starting value. */
    defaultValue?: string | number | null;
    /** Receives plain digits — never grouped, never with "TZS". */
    onChange?: (raw: string) => void;
  };

/**
 * An amount in Tanzanian shillings. A text field (no spinner, no scroll-wheel
 * changes) that opens the numeric keypad, shows a "TZS" prefix, tolerates
 * pasted "1,250,000", and groups thousands once you leave the field so a
 * misplaced zero is easy to see. Whatever the screen shows, the form and
 * `onChange` only ever get plain digits.
 *
 * Works inside `Field` / `LineField` (it forwards `id` and `aria-*`).
 */
export function MoneyInput({
  name,
  value,
  defaultValue,
  onChange,
  allowNegative,
  allowDecimals,
  className = "",
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const rules = { allowNegative, allowDecimals };
  const [inner, setInner] = useState(() => cleanMoney(String(defaultValue ?? ""), rules));
  const [focused, setFocused] = useState(false);
  const raw = value ?? inner;

  return (
    <span className="relative block">
      {name && <input type="hidden" name={name} value={raw} />}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground"
      >
        TZS
      </span>
      <input
        {...rest}
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        autoComplete="off"
        value={focused ? raw : groupMoney(raw)}
        onChange={(event) => {
          const next = cleanMoney(event.target.value, rules);
          setInner(next);
          onChange?.(next);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className={`${controlClass} pl-14 text-right tabular-nums ${className}`.trim()}
      />
    </span>
  );
}
