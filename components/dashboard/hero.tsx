import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { Guilloche } from "@/components/ui/guilloche";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { plainAmount } from "./shared";

type Figures = { revenue: number; costs: number; commissions: number; profit: number; recurringRevenue: number; recurringCosts: number; plannedRevenue: number; plannedCosts: number };

export function Hero({ metrics, previous, comparisonLabel, loading, margin, periodLabel }: { metrics: Figures; previous?: Figures; comparisonLabel: string; loading: boolean; margin?: number; periodLabel: string }) {
  if (loading) return <HeroFrame><Skeleton className="w-32"/><Skeleton className="mt-5 h-16 w-4/5 max-w-md"/><Skeleton className="mt-4 w-56 max-w-full"/><div className="mt-auto grid gap-7 border-t border-[var(--line)] pt-7 sm:grid-cols-[1.4fr_1fr_1fr]">{[0, 1, 2].map((item) => <div key={item}><Skeleton className="w-24"/><Skeleton className="mt-4 h-8 w-40 max-w-full"/><Skeleton className="mt-4 w-28"/></div>)}</div></HeroFrame>;
  return <HeroFrame>
    <div className="pb-9 md:pb-12">
      <p className="text-base text-[var(--muted)]">Umsatz (netto) · {periodLabel}</p>
      <p className="display mt-3 flex flex-wrap items-baseline gap-x-3 text-[clamp(2.875rem,6.2vw,5.75rem)] text-[var(--ink)]"><Amount value={metrics.revenue}/></p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
        <Delta value={metrics.revenue} previous={previous?.revenue} comparisonLabel={comparisonLabel}/>
        <span>{metrics.plannedRevenue > 0 ? `inkl. ${formatCurrency(metrics.plannedRevenue)} erwartet` : `davon ${formatCurrency(metrics.recurringRevenue)} wiederkehrend`}</span>
      </div>
    </div>
    <dl className="mt-auto grid grid-cols-2 gap-x-5 gap-y-6 border-t border-[var(--hairline)] pt-6 sm:grid-cols-[1.2fr_1fr_1fr] sm:gap-x-6">
      <Figure className="max-sm:col-span-2" label="Netto Gewinn" hint={margin === undefined ? "Keine Einnahmen im Zeitraum" : `Nach Ausgaben und Provisionen · Marge ${margin}%`} delta={<Delta value={metrics.profit} previous={previous?.profit} comparisonLabel={comparisonLabel}/>}>
        <span className="display text-[2.125rem] xl:max-2xl:text-[1.875rem] 2xl:text-[2.5rem]" style={{ color: metrics.profit > 0 ? "var(--emerald)" : metrics.profit < 0 ? "var(--coral)" : undefined }}><Amount value={metrics.profit}/></span>
      </Figure>
      <Figure label="Ausgaben" hint={metrics.plannedCosts > 0 ? `inkl. ${formatCurrency(metrics.plannedCosts)} geplant` : `davon ${formatCurrency(metrics.recurringCosts)} wiederkehrend`} delta={<Delta inverse value={metrics.costs} previous={previous?.costs} comparisonLabel={comparisonLabel}/>}><SmallAmount value={metrics.costs}/></Figure>
      <Figure label="Provisionen" hint="10 % Grundprovision inkl. Monatsbonus" delta={<Delta inverse value={metrics.commissions} previous={previous?.commissions} comparisonLabel={comparisonLabel}/>}><SmallAmount value={metrics.commissions}/></Figure>
    </dl>
  </HeroFrame>;
}

function HeroFrame({ children }: { children: ReactNode }) {
  return <section aria-label="Ergebnis" className="plate hairline relative isolate flex min-h-[26rem] min-w-0 flex-col overflow-hidden rounded-2xl p-5 md:p-8">
    <Guilloche className="absolute -right-40 -top-44 -z-10 w-[30rem] md:-right-44 md:-top-52 md:w-[37rem]"/>
    {children}
  </section>;
}

function Amount({ value }: { value: number }) {
  return <span className="whitespace-nowrap"><span className="mr-[.4em] text-[max(.38em,.8125rem)] tracking-normal text-[var(--muted)]">CHF</span><CountUp value={value} format={plainAmount}/></span>;
}

function SmallAmount({ value }: { value: number }) {
  return <span className="money text-xl font-semibold tracking-tight text-[var(--ink)] 2xl:text-2xl">{formatCurrency(value)}</span>;
}

function Figure({ label, hint, delta, children, className = "" }: { label: string; hint: string; delta: ReactNode; children: ReactNode; className?: string }) {
  return <div className={`min-w-0 ${className}`}>
    <dt className="text-sm text-[var(--muted)]">{label}</dt>
    <dd className="mt-1.5 flex items-end sm:min-h-11 leading-none">{children}</dd>
    <dd className="mt-2.5 text-sm text-[var(--muted)] [&>span]:mb-0.5">{delta}<span className="block">{hint}</span></dd>
  </div>;
}

function Delta({ value, previous, comparisonLabel, inverse = false }: { value: number; previous?: number; comparisonLabel: string; inverse?: boolean }) {
  const delta = previous !== undefined && previous !== 0 ? (value - previous) / Math.abs(previous) * 100 : undefined;
  if (delta === undefined || Math.abs(delta) < 0.5) return null;
  const good = inverse ? delta <= 0 : delta >= 0;
  const Icon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span title={`gegenüber ${comparisonLabel}`} className="money inline-flex flex-wrap items-center gap-x-1 font-semibold" style={{ color: good ? "var(--emerald)" : "var(--coral)" }}><Icon aria-hidden size={15} className="flex-none"/>{delta >= 0 ? "+" : "−"}{Math.abs(Math.round(delta))}%<span className="font-normal text-[var(--muted)]">ggü. {comparisonLabel}</span></span>;
}
