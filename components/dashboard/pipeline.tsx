import type { CSSProperties } from "react";
import Link from "next/link";
import { ContactRound } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import type { Prospect, ProspectStatus } from "@/types";
import { monthLabel, Plate, PlateHeading } from "./shared";

const stages: { status: ProspectStatus; label: string }[] = [{ status: "new", label: "Neu" }, { status: "contacted", label: "Kontaktiert" }, { status: "meeting", label: "Gespräch" }, { status: "offer", label: "Offerte" }];

function summarize(rows: Prospect[]) {
  const valued = rows.filter(({ estimatedValue }) => estimatedValue != null);
  return { count: rows.length, value: valued.reduce((sum, { estimatedValue }) => sum + (estimatedValue ?? 0), 0), valued: valued.length, unvalued: rows.length - valued.length };
}

export function Pipeline({ prospects, month }: { prospects: Prospect[]; month: string }) {
  const rows = stages.map(({ status, label }) => ({ label, ...summarize(prospects.filter((prospect) => prospect.status === status)) }));
  const open = summarize(prospects.filter(({ status }) => stages.some((stage) => stage.status === status)));
  // Prospects store no win date; the last change is the closest recorded one and is named as such below.
  const won = summarize(prospects.filter(({ status, updatedAt }) => status === "won" && updatedAt.slice(0, 7) === month));
  const max = Math.max(...rows.map(({ value }) => value), 1);
  return <Plate>
    <PlateHeading title="Pipeline" subtitle={prospects.length ? `${open.count} offene Prospects` : undefined} action={<Link href="/prospects" className="action flex-none">Prospects öffnen</Link>}/>
    {!prospects.length ? <EmptyState icon={ContactRound} title="Noch keine Prospects" text="Erfasste Prospects erscheinen hier mit ihrem Wert pro Phase."/> : <div className="mt-6 grid gap-x-10 gap-y-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)_minmax(0,1.15fr)]">
      <div className="min-w-0"><p className="text-sm text-[var(--muted)]">Offener Wert</p><p className="display mt-2 text-[1.75rem] text-[var(--ink)]">{open.valued ? formatCurrency(open.value) : "–"}</p><Unvalued count={open.unvalued}/></div>
      <ul className="grid min-w-0 gap-4 sm:gap-3.5">{rows.map((row) => <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)_8.5rem]">
        <span className="text-[var(--ink)]">{row.label} <span className="money text-[var(--muted)]">{row.count}</span></span>
        <span aria-hidden className="col-span-2 row-start-2 h-1 overflow-hidden rounded-full bg-[var(--ring-track)] sm:col-span-1 sm:col-start-2 sm:row-start-1"><span className="bar-value block h-full rounded-full bg-[var(--muted)]" style={{ "--value": `${Math.max(0, row.value / max * 100)}%` } as CSSProperties}/></span>
        <span className="money text-right font-medium text-[var(--ink)]">{row.valued ? formatCurrency(row.value) : "–"}</span>
        {row.unvalued > 0 && <span className="col-span-2 -mt-1.5 text-[13.5px] text-[var(--muted)] sm:col-start-2">{row.unvalued} ohne Betrag</span>}
      </li>)}</ul>
      <div className="min-w-0 border-t border-[var(--line)] pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"><p className="text-sm text-[var(--muted)]">Gewonnen im {monthLabel(month)}</p><p className="display mt-2 whitespace-nowrap text-[1.75rem] text-[var(--ink)]">{won.count && !won.valued ? "–" : formatCurrency(won.value)}</p><p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><span aria-hidden className={won.count ? "dot dot-on" : "dot"}/><span>{won.count} {won.count === 1 ? "Deal" : "Deals"}{won.unvalued > 0 && `, ${won.unvalued} ohne Betrag`}</span></p><p className="mt-0.5 text-[13.5px] text-[var(--muted)]">Nach Datum der letzten Änderung</p></div>
    </div>}
  </Plate>;
}

function Unvalued({ count }: { count: number }) { return count > 0 ? <p className="mt-2 text-sm text-[var(--muted)]">{count} ohne Betrag</p> : null; }
