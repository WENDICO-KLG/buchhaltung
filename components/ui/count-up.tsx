"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up once, to the first non-zero value. Later changes show immediately. */
export function CountUp({ value, format, className }: { value: number; format: (value: number) => string; className?: string }) {
  const [frame, setFrame] = useState<number | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !value || !Number.isFinite(value)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done.current = true; return; }
    let id = 0;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / 420);
      if (t === 1) { done.current = true; setFrame(null); return; }
      setFrame(Math.round(value * (1 - (1 - t) ** 3)));
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(id); setFrame(null); };
  }, [value]);

  if (frame === null) return <span className={className}>{format(value)}</span>;
  return <span className={className}><span className="sr-only">{format(value)}</span><span aria-hidden className="count-up">{format(frame)}</span></span>;
}
