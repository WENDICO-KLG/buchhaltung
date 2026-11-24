import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ReceiptText, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PlateHeading, textLink, type RankingRow } from "./shared";

/** Plain section: two rankings share one plate. */
export function Ranking({ title, subtitle, rows, kind, empty, href, loading }: { title: string; subtitle: string; rows: RankingRow[]; kind: "income" | "cost"; empty: string; href: string; loading: boolean }) {
  const visible = rows.slice(0, 6);
  const rest = rows.slice(6).reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <section className="min-w-0">
    <PlateHeading title={title} subtitle={subtitle} action={<Link href={href} aria-label={`Details: ${title}`} className={textLink}>Details</Link>}/>
    {loading ? <div className="mt-6 space-y-6">{[90, 70, 55, 40].map((width) => <div key={width}><Skeleton style={{ width: `${width}%` }}/><Skeleton className="mt-2.5 h-1.5 w-full"/></div>)}</div>
      : !rows.length ? <EmptyState className="!py-9" icon={kind === "income" ? Users : ReceiptText} title={empty}/>
      : <ol className="mt-5 space-y-4">
        {visible.map((row) => <li key={row.label}>
          <div className="flex items-baseline justify-between gap-4 text-sm"><span title={row.label} className="truncate text-[var(--ink)]">{row.label}</span><span className="money flex-none font-semibold text-[var(--ink)]">{formatCurrency(row.value)}</span></div>
          <div aria-hidden className="mt-2 h-1.5 rounded-r-[4px] bg-[var(--ring-track)]"><div className="bar-value h-full rounded-r-[4px]" style={{ width: `${row.value / max * 100}%`, background: kind === "income" ? "var(--chart-1)" : "var(--chart-2)" }}/></div>
        </li>)}
        {rest > 0 && <li className="money flex justify-between gap-4 text-sm text-[var(--muted)]"><span>{rows.length - 6} weitere</span><span>{formatCurrency(rest)}</span></li>}
      </ol>}
  </section>;
}
