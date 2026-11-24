import type { ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";
import { cn, formatCurrency } from "@/lib/utils";
import { toneColor, type Tone } from "@/components/ui/tone";

export function Stat({ label, value, delta, deltaTone = "neutral", hint, size = "md", tone, className }: { label: ReactNode; value: ReactNode; delta?: ReactNode; deltaTone?: Tone; hint?: ReactNode; size?: "lg" | "md"; tone?: Tone; className?: string }) {
  return <div className={cn("min-w-0", className)}>
    <p className="text-sm text-[var(--muted)]">{label}</p>
    <p className={cn("money mt-1.5 break-words text-[var(--ink)]", size === "lg" ? "display text-[clamp(2.5rem,5vw,3.5rem)]" : "text-xl font-medium tracking-tight")} style={tone && { color: toneColor[tone] }}>{value}</p>
    {(delta || hint) && <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-[var(--muted)]">{delta && <span className="money font-semibold" style={{ color: toneColor[deltaTone] }}>{delta}</span>}{hint && <span>{hint}</span>}</p>}
  </div>;
}

/** The one large figure of a view: quiet currency, bright number. */
export function Amount({ value }: { value: number }) {
  return <><span className="mr-2.5 text-lg text-[var(--muted)] sm:text-2xl">CHF</span><CountUp value={value} format={plainAmount}/></>;
}
const plainAmount = (value: number) => formatCurrency(value).replace(/^CHF\s*/, "");
