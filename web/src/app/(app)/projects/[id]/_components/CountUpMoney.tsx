"use client";

import { useEffect, useRef, useState } from "react";
import { formatTZS } from "@/lib/finance";
import motion from "./motion.module.css";

const DURATION_MS = 800;

/**
 * `Money` that counts up from zero while the status card arrives. The server
 * renders the real figure, so it is right without JavaScript and for anyone
 * who reads it before hydration. The count runs only while the figure's
 * entrance animation is still playing: under reduced motion there is no
 * entrance, and on a late hydration it has already finished, so in both cases
 * the figure simply stays as rendered.
 */
export function CountUpMoney({
  amount,
  className = "",
  negativeClassName = "font-bold text-destructive",
}: {
  amount: number;
  className?: string;
  negativeClassName?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [frame, setFrame] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || amount === 0) return;
    const entering = el.getAnimations().some((a) => a.playState === "running");
    if (!entering) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - p) ** 3;
      setFrame(p < 1 ? amount * eased : null);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setFrame(null);
    };
  }, [amount]);

  return (
    <span
      ref={ref}
      className={`tabular-nums ${motion.statusFigure} ${amount < 0 ? negativeClassName : className}`}
    >
      {formatTZS(frame ?? amount)}
    </span>
  );
}
