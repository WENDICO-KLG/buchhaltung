import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import type { Tone } from "@/components/ui/tone";
import { formatCurrency, invoiceStatusLabels, invoiceTotal } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";
import { dateLabel, Plate, PlateHeading } from "./shared";

const tones: Record<InvoiceStatus, Tone> = { draft: "neutral", sent: "info", paid: "positive", overdue: "negative", cancelled: "neutral" };

export function RecentInvoices({ invoices, isOverdue, loading }: { invoices: Invoice[]; isOverdue: (invoice: Invoice) => boolean; loading: boolean }) {
  return <Plate>
    <PlateHeading title="Letzte Rechnungen"/>
    {loading ? <div className="mt-6 space-y-6">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex justify-between gap-6"><Skeleton className="h-10 w-1/2"/><Skeleton className="h-10 w-1/4"/></div>)}</div>
      : !invoices.length ? <EmptyState icon={FileText} title="Noch keine Rechnungen."/>
      : <ul className="mt-3 divide-y divide-[var(--line)]">{invoices.map((invoice) => {
        const status: InvoiceStatus = isOverdue(invoice) ? "overdue" : invoice.status;
        return <li key={invoice.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3.5 last:pb-0">
          <p title={invoice.customerName} className="truncate text-sm font-medium text-[var(--ink)]">{invoice.customerName}</p>
          <p className="money text-right text-sm font-medium text-[var(--ink)]">{formatCurrency(invoiceTotal(invoice.items), invoice.currency)}</p>
          <p className="text-[13.5px] text-[var(--muted)]">{invoice.invoiceNumber} · fällig {dateLabel(invoice.dueDate)}</p>
          <Status tone={tones[status]} className={`justify-self-end ${status === "cancelled" ? "line-through" : ""}`}>{invoiceStatusLabels[status]}</Status>
        </li>;
      })}</ul>}
  </Plate>;
}
