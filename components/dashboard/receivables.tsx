import { CircleAlert, CircleCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress";
import { formatCurrency, invoiceTotal } from "@/lib/utils";
import type { Invoice } from "@/types";
import { Plate, PlateHeading } from "./shared";

type Totals = { openCount: number; openAmount: number; overdueCount: number; overdueAmount: number };

const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);
const since = (due: string, today: string) => { const days = daysBetween(due, today); return days > 0 ? `seit ${days} ${days === 1 ? "Tag" : "Tagen"} fällig` : "als überfällig markiert"; };

export function Receivables({ totals, overdue, today, loading }: { totals: Totals; overdue: Invoice[]; today: string; loading: boolean }) {
  const visible = overdue.slice(0, 3);
  return <Plate className="flex flex-col">
    <PlateHeading title="Offene Rechnungen" subtitle={loading ? undefined : `${totals.openCount} offen, ${totals.overdueCount} überfällig`}/>
    {loading ? <div className="mt-6 space-y-5"><Skeleton className="h-10 w-3/4"/><Skeleton className="w-full"/><Skeleton className="h-16 w-full"/><Skeleton className="h-16 w-full"/></div>
      : !totals.openCount ? <EmptyState className="my-auto" icon={CircleCheck} title="Alles bezahlt" text="Zurzeit sind keine Rechnungen offen."/>
      : <>
        <p className="display mt-5 text-[1.75rem] text-[var(--ink)]">{formatCurrency(totals.openAmount)}</p>
        {totals.overdueCount > 0 && <>
          {totals.openAmount > 0 && <ProgressBar className="mt-5" value={totals.overdueAmount} max={totals.openAmount} tone="negative" label="Anteil überfällig"/>}
          <div className="mt-4 flex gap-2.5 text-sm text-[var(--ink)]"><CircleAlert aria-hidden size={17} strokeWidth={1.6} className="mt-0.5 flex-none text-[var(--coral)]"/><p><strong className="font-semibold text-[var(--coral)]">{totals.overdueCount} überfällige Rechnung{totals.overdueCount === 1 ? "" : "en"}</strong> über {formatCurrency(totals.overdueAmount)} – jetzt nachfassen.</p></div>
          <ul className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">{visible.map((invoice) => <li key={invoice.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3.5">
            <p className="truncate text-sm font-medium text-[var(--ink)]">{invoice.customerName}</p><p className="money text-right text-sm font-medium text-[var(--ink)]">{formatCurrency(invoiceTotal(invoice.items), invoice.currency)}</p>
            <p className="col-span-2 text-[13.5px] text-[var(--muted)]">{invoice.invoiceNumber} · {since(invoice.dueDate, today)}</p>
          </li>)}</ul>
          {overdue.length > visible.length && <p className="text-sm text-[var(--muted)]">{overdue.length - visible.length} weitere überfällig</p>}
        </>}
      </>}
  </Plate>;
}
