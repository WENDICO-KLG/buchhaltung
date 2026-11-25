import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { Skeleton } from "@/components/ui/skeleton";
import { addMonths, cn, formatCurrency } from "@/lib/utils";
import { monthLabel, plainAmount, PlateHeading, type RangeMode } from "./shared";
import styles from "./dashboard.module.css";

type Figures = { revenue: number; costs: number; commissions: number; profit: number; recurringRevenue: number; recurringCosts: number; plannedRevenue: number; plannedCosts: number };

type Period = { mode: RangeMode; month: string; year: number; onShift: (offset: number) => void };
type Props = Period & { metrics: Figures; previous?: Figures; comparisonLabel: string; loading: boolean; margin?: number; periodLabel: string; note?: string };

export function Hero({ metrics, previous, comparisonLabel, loading, margin, periodLabel, note, ...period }: Props) {
  return <section aria-label="Ergebnis" className="raised relative isolate flex min-w-0 flex-col gap-7 overflow-hidden p-5 md:p-7">
    <div>
      <PlateHeading title="Umsatz (netto)" subtitle={periodLabel}/>
      {loading ? <><Skeleton className="mt-7 h-12 w-4/5 max-w-sm"/><Skeleton className="mt-4 w-56 max-w-full"/></> : <>
        <p className="display mt-6 text-[clamp(2.5rem,4.4vw,3.5rem)] text-[var(--ink)]"><Amount value={metrics.revenue}/></p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
          <Delta value={metrics.revenue} previous={previous?.revenue} comparisonLabel={comparisonLabel}/>
          <span>{metrics.plannedRevenue > 0 ? `inkl. ${formatCurrency(metrics.plannedRevenue)} erwartet` : `davon ${formatCurrency(metrics.recurringRevenue)} wiederkehrend`}</span>
        </div>
      </>}
    </div>
    <PeriodScale {...period}/>
    {loading ? <div className="mt-auto grid gap-6 border-t border-[var(--line)] pt-6 sm:grid-cols-[1.2fr_1fr_1fr]">{[0, 1, 2].map((item) => <div key={item}><Skeleton className="w-24"/><Skeleton className="mt-4 h-7 w-36 max-w-full"/><Skeleton className="mt-4 w-28"/></div>)}</div>
      : <dl className="mt-auto grid grid-cols-2 gap-x-5 gap-y-6 border-t border-[var(--line)] pt-6 sm:grid-cols-[1.2fr_1fr_1fr] sm:gap-x-7">
      <Figure className="max-sm:col-span-2" label="Netto Gewinn" hint={margin === undefined ? "Keine Einnahmen im Zeitraum" : `Nach Ausgaben und Provisionen · Marge ${margin}%`} delta={<Delta value={metrics.profit} previous={previous?.profit} comparisonLabel={comparisonLabel}/>}>
        <span className="display text-[1.75rem]" style={{ color: metrics.profit > 0 ? "var(--emerald)" : metrics.profit < 0 ? "var(--coral)" : undefined }}><Amount value={metrics.profit}/></span>
      </Figure>
      <Figure label="Ausgaben" hint={metrics.plannedCosts > 0 ? `inkl. ${formatCurrency(metrics.plannedCosts)} geplant` : `davon ${formatCurrency(metrics.recurringCosts)} wiederkehrend`} delta={<Delta neutral value={metrics.costs} previous={previous?.costs} comparisonLabel={comparisonLabel}/>}><SmallAmount value={metrics.costs}/></Figure>
      <Figure label="Provisionen" hint="10 % Grundprovision inkl. Monatsbonus" delta={<Delta neutral value={metrics.commissions} previous={previous?.commissions} comparisonLabel={comparisonLabel}/>}><SmallAmount value={metrics.commissions}/></Figure>
    </dl>}
    {note && !loading && <p className="text-[13.5px] text-[var(--muted)]">{note}</p>}
  </section>;
}

/** Neighbouring months or years around the selected one; moves the same period as the arrows. */
function PeriodScale({ mode, month, year, onShift }: Period) {
  if (mode === "custom") return null;
  return <div role="group" aria-label={mode === "month" ? "Monat wählen" : "Jahr wählen"} className={styles.scale}>{[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const key = mode === "month" ? addMonths(month, offset) : String(year + offset);
    const distance = Math.abs(offset);
    return <button key={key} type="button" onClick={() => onShift(offset)} aria-current={offset === 0 || undefined} aria-label={mode === "month" ? monthLabel(key) : key} className={cn("money", styles.step, offset === 0 && styles.current, distance > 1 && styles.far, distance > 2 && styles.rest)}>{mode === "month" ? new Date(`${key}-01T12:00:00`).toLocaleDateString("de-CH", { month: "short" }) : key}</button>;
  })}</div>;
}

function Amount({ value }: { value: number }) {
  return <span className="whitespace-nowrap"><span className="mr-[.4em] text-[max(.38em,.8125rem)] tracking-normal text-[var(--muted)]">CHF</span><CountUp value={value} format={plainAmount}/></span>;
}

function SmallAmount({ value }: { value: number }) {
  return <span className="money text-xl font-medium tracking-tight text-[var(--ink)]">{formatCurrency(value)}</span>;
}

function Figure({ label, hint, delta, children, className = "" }: { label: string; hint: string; delta: ReactNode; children: ReactNode; className?: string }) {
  return <div className={`min-w-0 ${className}`}>
    <dt className="text-sm text-[var(--muted)]">{label}</dt>
    <dd className="mt-1.5 flex items-end sm:min-h-8 leading-none">{children}</dd>
    <dd className="mt-2.5 text-sm text-[var(--muted)] [&>span]:mb-0.5">{delta}<span className="block">{hint}</span></dd>
  </div>;
}

function Delta({ value, previous, comparisonLabel, neutral = false }: { value: number; previous?: number; comparisonLabel: string; neutral?: boolean }) {
  const delta = previous !== undefined && previous !== 0 ? (value - previous) / Math.abs(previous) * 100 : undefined;
  if (delta === undefined || Math.abs(delta) < 0.5) return null;
  const Icon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span title={`gegenüber ${comparisonLabel}`} className="money inline-flex flex-wrap items-center gap-x-1 font-medium text-[var(--ink)]"><Icon aria-hidden size={15} strokeWidth={1.6} className="flex-none" style={{ color: neutral ? "var(--muted)" : delta >= 0 ? "var(--emerald)" : "var(--coral)" }}/>{delta >= 0 ? "+" : "−"}{Math.abs(Math.round(delta))}%<span className="font-normal text-[var(--muted)]">ggü. {comparisonLabel}</span></span>;
}
