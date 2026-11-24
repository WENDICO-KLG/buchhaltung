import type { ReactNode } from "react";
import { cn, formatCurrency } from "@/lib/utils";

export type RangeMode = "month" | "year" | "custom";
export type RankingRow = { label: string; value: number };

export const monthLabel = (month: string, format: "long" | "short" = "long") => new Date(`${month}-01T12:00:00`).toLocaleDateString("de-CH", { month: format, year: "numeric" });
export const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-CH");
export const axisAmount = (value: number) => Math.abs(value) < 1_000_000 ? wholeAmount(value) : new Intl.NumberFormat("de-CH", { notation: "compact", maximumFractionDigits: 1 }).format(value);
/** Amount without the currency code, for places where "CHF" is set separately or stated once. */
export const plainAmount = (value: number) => formatCurrency(value).replace(/CHF\s?/, "").trim();
export const wholeAmount = (value: number) => new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(value);

export function Plate({ className, children, ...props }: { className?: string; children: ReactNode; id?: string; "aria-label"?: string }) {
  return <section className={cn("plate min-w-0 p-5 md:p-7", className)} {...props}>{children}</section>;
}

export function PlateHeading({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-4">
    <div className="min-w-0"><h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>{subtitle && <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>}</div>
    {action}
  </div>;
}
