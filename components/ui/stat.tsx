import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneColor, type Tone } from "@/components/ui/tone";

export function Stat({ label, value, delta, deltaTone = "neutral", hint, size = "md", tone, className }: { label: ReactNode; value: ReactNode; delta?: ReactNode; deltaTone?: Tone; hint?: ReactNode; size?: "lg" | "md"; tone?: Tone; className?: string }) {
  return <div className={cn("min-w-0", className)}>
    <p className="text-sm text-[var(--muted)]">{label}</p>
    <p className={cn("money mt-1.5 break-words text-[var(--ink)]", size === "lg" ? "display text-[clamp(2.5rem,7vw,4.75rem)]" : "text-2xl font-semibold tracking-tight")} style={tone && { color: toneColor[tone] }}>{value}</p>
    {(delta || hint) && <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-[var(--muted)]">{delta && <span className="money font-semibold" style={{ color: toneColor[deltaTone] }}>{delta}</span>}{hint && <span>{hint}</span>}</p>}
  </div>;
}
