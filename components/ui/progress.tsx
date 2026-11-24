import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneColor, type Tone } from "@/components/ui/tone";

function measure(value: number, max: number) {
  const ratio = max > 0 && Number.isFinite(value) ? Math.max(0, value / max) : 0;
  const percent = Math.round(ratio * 100);
  return { drawn: Math.min(100, ratio * 100), percent, aria: { role: "progressbar" as const, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.min(100, percent), "aria-valuetext": `${percent}%` } };
}

/** The real percentage is shown, the arc itself stops at 100%. `children` replace the centre. */
export function ProgressRing({ value, max, label, size = 168, tone = "gold", children, className }: { value: number; max: number; label: string; size?: number; tone?: Tone; children?: ReactNode; className?: string }) {
  const { drawn, percent, aria } = measure(value, max);
  return <div {...aria} aria-label={label} className={cn("relative inline-grid max-w-full flex-none place-items-center", className)} style={{ width: size, aspectRatio: "1" }}>
    <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" fill="none" strokeWidth="5">
      <circle cx="50" cy="50" r="46" stroke="var(--ring-track)" />
      {drawn > 0 && <circle cx="50" cy="50" r="46" pathLength={100} stroke={toneColor[tone]} strokeLinecap={drawn >= 100 ? "butt" : "round"} strokeDashoffset={100 - drawn} className="ring-value" />}
    </svg>
    <div className="relative px-[14%] text-center">{children ?? <><span className="display block text-[var(--ink)]" style={{ fontSize: Math.max(18, size * .2) }}>{percent}%</span><span className="mt-1 block text-[13px] leading-tight text-[var(--muted)]">{label}</span></>}</div>
  </div>;
}

export function ProgressBar({ value, max, tone = "gold", label, className }: { value: number; max: number; tone?: Tone; label?: string; className?: string }) {
  const { drawn, aria } = measure(value, max);
  return <div {...aria} aria-label={label ?? "Fortschritt"} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--ring-track)]", className)}><div className="bar-value h-full rounded-full" style={{ width: `${drawn}%`, background: toneColor[tone] }} /></div>;
}
