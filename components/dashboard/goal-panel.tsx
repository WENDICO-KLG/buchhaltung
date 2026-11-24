import type { FormEvent } from "react";
import { Check, Pencil, Target, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import type { MonthlyGoal } from "@/types";
import { monthLabel, Plate, PlateHeading } from "./shared";

export type GoalForm = { revenueTarget: string; expenseBudget: string; notes: string };
type Props = { month: string; goal?: MonthlyGoal; revenue: number; costs: number; loading: boolean; failed: boolean; editing: boolean; onEditing: (editing: boolean) => void; form: GoalForm; onForm: (form: GoalForm) => void; saving: boolean; onSubmit: (event: FormEvent) => void };

export function GoalPanel({ month, goal, revenue, costs, loading, failed, editing, onEditing, form, onForm, saving, onSubmit }: Props) {
  const target = goal?.revenueTarget ?? 0;
  const reached = !loading && !editing && target > 0 && revenue >= target;
  return <Plate className={"relative isolate flex flex-col overflow-hidden"}>
    {reached && <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(75%_60%_at_50%_38%,var(--gold-soft),transparent)]"/>}
    <PlateHeading title="Monatsziel" subtitle={monthLabel(month)} action={goal && !editing && !loading && <button onClick={() => onEditing(true)} aria-label="Ziele bearbeiten" className="icon-button -mr-1.5 -mt-1.5"><Pencil size={16} strokeWidth={1.6}/></button>}/>
    {loading ? <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-6"><Skeleton className="h-[168px] w-[168px] !rounded-full"/><Skeleton className="h-7 w-44"/><Skeleton className="w-full"/></div>
      : failed ? <EmptyState className="my-auto" icon={Target} title="Monatsziel nicht verfügbar" text="Das Ziel konnte nicht geladen werden."/>
      : editing ? <form onSubmit={onSubmit} className="page-enter mt-6 grid gap-4">
        <GoalField label="Umsatzziel" value={form.revenueTarget} onChange={(value) => onForm({ ...form, revenueTarget: value })}/>
        <GoalField label="Ausgabenbudget" value={form.expenseBudget} onChange={(value) => onForm({ ...form, expenseBudget: value })}/>
        <label><span className="mb-1.5 block text-sm text-[var(--muted)]">Notiz</span><input value={form.notes} onChange={(event) => onForm({ ...form, notes: event.target.value })} className="field"/></label>
        <div className="mt-1 flex flex-wrap gap-2"><button disabled={saving} className="primary">{saving ? "Speichert..." : "Speichern"}</button><button type="button" onClick={() => onEditing(false)} className="action"><X size={15} strokeWidth={1.6}/>Abbrechen</button></div>
      </form>
      : goal ? <>
        <RevenueGoal revenue={revenue} target={target} reached={reached}/>
        <ExpenseBudget costs={costs} budget={goal.expenseBudget}/>
        {goal.notes && <p className="mt-4 break-words text-sm text-[var(--muted)]">{goal.notes}</p>}
      </>
      : <EmptyState className="my-auto" icon={Target} title="Noch kein Monatsziel" action={<button onClick={() => onEditing(true)} className="primary">Ziel für {monthLabel(month)} festlegen</button>}/>}
  </Plate>;
}

function RevenueGoal({ revenue, target, reached }: { revenue: number; target: number; reached: boolean }) {
  if (target <= 0) return <div className="my-auto py-8 text-center"><p className="money text-2xl font-semibold text-[var(--ink)]">{formatCurrency(revenue)}</p><p className="mt-1 text-sm text-[var(--muted)]">Umsatz, kein Ziel festgelegt</p></div>;
  const ratio = Math.max(0, revenue / target * 100);
  // Never round up to 100% before the goal is actually reached.
  const percent = reached ? Math.round(ratio) : Math.min(99, Math.round(ratio));
  return <div className="my-auto flex flex-col items-center py-6 text-center">
    <ProgressRing value={revenue} max={target} label="Umsatzziel erreicht" size={168} tone="gold">
      {reached && <Check aria-hidden size={22} strokeWidth={2} className="mx-auto mb-1 text-[var(--gold)]"/>}
      <span className={cn("display block text-[2.25rem]", reached ? "text-[var(--gold)]" : "text-[var(--ink)]")}>{percent}%</span>
      {!reached && <span className="mt-1 block text-sm text-[var(--muted)]">vom Ziel</span>}
    </ProgressRing>
    {reached
      ? <p className="mt-5"><span className="display block text-2xl text-[var(--gold)]">Ziel erreicht</span>{revenue > target && <span className="money mt-1.5 block text-base font-semibold text-[var(--ink)]">{formatCurrency(revenue - target)} übertroffen</span>}</p>
      : <p className="mt-5 text-sm text-[var(--muted)]"><span className="money block text-xl font-medium tracking-tight text-[var(--ink)]">Noch {formatCurrency(target - revenue)}</span></p>}
    <p className="money mt-1 text-sm text-[var(--muted)]">{formatCurrency(revenue)} von {formatCurrency(target)}</p>
  </div>;
}

function ExpenseBudget({ costs, budget }: { costs: number; budget: number }) {
  const over = costs > budget;
  return <div className="border-t border-[var(--line)] pt-5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"><span className="text-[var(--muted)]">Ausgabenbudget</span><span className="money font-semibold text-[var(--ink)]">{budget > 0 ? `${Math.round(costs / budget * 100)}%` : "kein Ziel"}</span></div>
    {budget > 0 && <ProgressBar className="mt-2.5" value={costs} max={budget} tone={over ? "negative" : "info"} label="Ausgabenbudget verbraucht"/>}
    <p className="money mt-2.5 flex flex-wrap justify-between gap-x-3 text-sm text-[var(--muted)]"><span>{formatCurrency(costs)}{budget > 0 && ` von ${formatCurrency(budget)}`}</span>{budget > 0 && <span style={over ? { color: "var(--coral)" } : undefined}>{over ? `${formatCurrency(costs - budget)} darüber` : `${formatCurrency(budget - costs)} frei`}</span>}</p>
  </div>;
}

function GoalField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1.5 block text-sm text-[var(--muted)]">{label} (CHF)</span><input type="number" min="0" step="100" value={value} onChange={(event) => onChange(event.target.value)} className="field"/></label>;
}
