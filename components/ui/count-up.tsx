"use client";

import { useLayoutEffect, useRef } from "react";
import { reducedMotion } from "@/components/ui/motion";

const DURATION = 700;

/** Counts to the value, and on to the next one when it changes. The final figure keeps its place, so nothing around it moves. */
export function CountUp({ value, format, className }: { value: number; format: (value: number) => string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const write = useRef(format);

  useLayoutEffect(() => { write.current = format; });
  useLayoutEffect(() => {
    const element = box.current;
    const layer = frame.current;
    const from = shown.current;
    if (!element || !layer || from === value || !Number.isFinite(value) || reducedMotion()) { shown.current = value; return; }
    // The cents of the target stay put; only whole numbers run.
    const cents = value - Math.trunc(value);
    const paint = (progress: number) => {
      shown.current = progress === 1 ? value : Math.trunc(from + (value - from) * progress) + cents;
      layer.textContent = write.current(shown.current);
    };
    let id = 0;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / DURATION);
      if (t === 1) { paint(1); layer.textContent = ""; delete element.dataset.counting; return; }
      paint(1 - 2 ** (-10 * t));
      id = requestAnimationFrame(step);
    };
    element.dataset.counting = "";
    paint(0);
    id = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(id); layer.textContent = ""; delete element.dataset.counting; };
  }, [value]);

  return <span ref={box} className={className ? `count-up ${className}` : "count-up"}><span>{format(value)}</span><span ref={frame} aria-hidden/></span>;
}
