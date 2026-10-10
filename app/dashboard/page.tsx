"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, CircleAlert, Pencil, Target, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getCustomers, getExpenses, getInvoices, getMonthlyGoal, saveMonthlyGoal } from "@/lib/storage";
import { addMonths, customerOneTimeRevenue, customerRecurringRevenue, formatCurrency, invoiceNet, invoiceStatusLabels, invoiceTotal, lastDayOfMonth, monthKeysBetween, recurringExpenseMonthlyAmount, todayKey } from "@/lib/utils";
import type { Customer, Expense, Invoice, InvoiceStatus, MonthlyGoal } from "@/types";

type RangeMode = "month" | "year" | "custom";
type Range = { from: string; to: string };

const today = todayKey();
const currentMonth = today.slice(0, 7);
const monthLabel = (month: string, format: "long" | "short" = "long") => new Date(`${month}-01T12:00:00`).toLocaleDateString("de-CH", { month: format, year: "numeric" });
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-CH");
const compactCurrency = (value: number) => new Intl.NumberFormat("de-CH", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const inRange = (date: string, range: Range) => date >= range.from && date <= range.to;
const paidDate = (invoice: Invoice) => invoice.paidAt ?? invoice.issueDate;
const isOverdue = (invoice: Invoice) => invoice.status === "overdue" || (invoice.status === "sent" && invoice.dueDate < today);
// Recurring-covering invoices are already counted via the customer's recurring revenue; other currencies can't be summed into CHF.
const countsAsRevenue = (invoice: Invoice, range: Range) => invoice.status === "paid" && !invoice.coversRecurring && invoice.currency === "CHF" && inRange(paidDate(invoice), range);

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-[var(--surface-soft)] text-[var(--muted)]",
  sent: "bg-[var(--accent)] text-[var(--primary)]",
  paid: "bg-[#d1fadf] text-[#05603a]",
  overdue: "bg-[#fee4e2] text-[#b42318]",
  cancelled: "bg-[var(--surface-soft)] text-[var(--muted)] line-through",
};

function computePeriod(range: Range, invoices: Invoice[], expenses: Expense[], customers: Customer[]) {
  const months = monthKeysBetween(range.from, range.to);
  const invoiceRevenue = invoices.filter((invoice) => countsAsRevenue(invoice, range)).reduce((sum, invoice) => sum + invoiceNet(invoice.items), 0);
  const oneTimeRevenue = customers.reduce((sum, customer) => sum + customerOneTimeRevenue(customer, range.from, range.to), 0);
  const recurringByMonth = months.map((key) => customers.reduce((sum, customer) => sum + customerRecurringRevenue(customer, key), 0));
  const recurringCostsByMonth = months.map((key) => expenses.reduce((sum, expense) => sum + recurringExpenseMonthlyAmount(expense, key), 0));
  const recurringRevenue = recurringByMonth.reduce((sum, value) => sum + value, 0);
  const recurringCosts = recurringCostsByMonth.reduce((sum, value) => sum + value, 0);
  const oneTimeCosts = expenses.filter((expense) => !expense.isRecurring && inRange(expense.expenseDate, range)).reduce((sum, expense) => sum + expense.amount, 0);
  const plannedRevenue = months.reduce((sum, key, index) => key > currentMonth ? sum + recurringByMonth[index] : sum, 0);
  const plannedCosts = months.reduce((sum, key, index) => key > currentMonth ? sum + recurringCostsByMonth[index] : sum, 0);
  const revenue = invoiceRevenue + oneTimeRevenue + recurringRevenue;
  const costs = oneTimeCosts + recurringCosts;
  return { revenue, costs, profit: revenue - costs, recurringRevenue, recurringCosts, plannedRevenue, plannedCosts };
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rangeMode, setRangeMode] = useState<RangeMode>("month");
  const [rangeMonth, setRangeMonth] = useState(currentMonth);
  const [rangeYear, setRangeYear] = useState(Number(today.slice(0, 4)));
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [customTo, setCustomTo] = useState(today);

  const [goal, setGoal] = useState<MonthlyGoal>();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ revenueTarget: "", expenseBudget: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const goalMonth = rangeMode === "month" ? rangeMonth : currentMonth;

  useEffect(() => {
    Promise.all([getInvoices(), getExpenses(), getCustomers()])
      .then(([invoiceData, expenseData, customerData]) => { setInvoices(invoiceData); setExpenses(expenseData); setCustomers(customerData); })
      .catch(() => setError("Finanzdaten konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMonthlyGoal(goalMonth)
      .then((data) => {
        if (cancelled) return;
        setGoal(data);
        setEditingGoal(false);
        setGoalForm({ revenueTarget: data?.revenueTarget.toString() ?? "", expenseBudget: data?.expenseBudget.toString() ?? "", notes: data?.notes ?? "" });
      })
      .catch(() => { if (!cancelled) setError("Monatsziel konnte nicht geladen werden."); });
    return () => { cancelled = true; };
  }, [goalMonth]);

  const range = useMemo<Range>(() => {
    if (rangeMode === "month") return { from: `${rangeMonth}-01`, to: lastDayOfMonth(rangeMonth) };
    if (rangeMode === "year") return { from: `${rangeYear}-01-01`, to: `${rangeYear}-12-31` };
    return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
  }, [rangeMode, rangeMonth, rangeYear, customFrom, customTo]);

  const previousRange = useMemo<Range | undefined>(() => {
    if (rangeMode === "month") { const key = addMonths(rangeMonth, -1); return { from: `${key}-01`, to: lastDayOfMonth(key) }; }
    if (rangeMode === "year") return { from: `${rangeYear - 1}-01-01`, to: `${rangeYear - 1}-12-31` };
    return undefined;
  }, [rangeMode, rangeMonth, rangeYear]);

  const periodLabel = rangeMode === "month" ? monthLabel(rangeMonth) : rangeMode === "year" ? `Jahr ${rangeYear}` : `${dateLabel(range.from)} – ${dateLabel(range.to)}`;
  const comparisonLabel = rangeMode === "month" ? "Vormonat" : "Vorjahr";

  const metrics = useMemo(() => computePeriod(range, invoices, expenses, customers), [range, invoices, expenses, customers]);
  const previous = useMemo(() => previousRange && computePeriod(previousRange, invoices, expenses, customers), [previousRange, invoices, expenses, customers]);
  const goalMetrics = useMemo(() => computePeriod({ from: `${goalMonth}-01`, to: lastDayOfMonth(goalMonth) }, invoices, expenses, customers), [goalMonth, invoices, expenses, customers]);

  const receivables = useMemo(() => {
    const open = invoices.filter(({ status }) => status === "sent" || status === "overdue");
    const overdue = open.filter(isOverdue);
    return { openCount: open.length, openAmount: open.filter((invoice) => invoice.currency === "CHF").reduce((sum, invoice) => sum + invoiceTotal(invoice.items), 0), overdueCount: overdue.length, overdueAmount: overdue.filter((invoice) => invoice.currency === "CHF").reduce((sum, invoice) => sum + invoiceTotal(invoice.items), 0) };
  }, [invoices]);

  const foreignCurrencyCount = useMemo(() => invoices.filter((invoice) => invoice.status === "paid" && invoice.currency !== "CHF" && inRange(paidDate(invoice), range)).length, [invoices, range]);

  const chartData = useMemo(() => {
    const keys = rangeMode === "month" ? Array.from({ length: 6 }, (_, index) => addMonths(rangeMonth, index - 5)) : monthKeysBetween(range.from, range.to);
    return keys.map((key) => {
      const monthRange = rangeMode === "custom" ? { from: key === keys[0] ? range.from : `${key}-01`, to: key === keys[keys.length - 1] ? range.to : lastDayOfMonth(key) } : { from: `${key}-01`, to: lastDayOfMonth(key) };
      const values = computePeriod(monthRange, invoices, expenses, customers);
      return { month: new Date(`${key}-01T12:00:00`).toLocaleDateString("de-CH", { month: "short", year: keys.length > 12 || rangeMode === "custom" ? "2-digit" : undefined }), Einnahmen: values.revenue, Ausgaben: values.costs, Ergebnis: values.profit };
    });
  }, [rangeMode, rangeMonth, range, invoices, expenses, customers]);

  const revenueByCustomer = useMemo(() => {
    const totals = new Map<string, number>();
    const months = monthKeysBetween(range.from, range.to);
    for (const customer of customers) {
      const value = months.reduce((sum, key) => sum + customerRecurringRevenue(customer, key), 0) + customerOneTimeRevenue(customer, range.from, range.to);
      if (value > 0) totals.set(customer.companyName, (totals.get(customer.companyName) ?? 0) + value);
    }
    for (const invoice of invoices) {
      if (countsAsRevenue(invoice, range)) totals.set(invoice.customerName, (totals.get(invoice.customerName) ?? 0) + invoiceNet(invoice.items));
    }
    return [...totals].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [range, customers, invoices]);

  const costsByVendor = useMemo(() => {
    const totals = new Map<string, number>();
    const months = monthKeysBetween(range.from, range.to);
    for (const expense of expenses) {
      const value = expense.isRecurring ? months.reduce((sum, key) => sum + recurringExpenseMonthlyAmount(expense, key), 0) : inRange(expense.expenseDate, range) ? expense.amount : 0;
      if (value > 0) totals.set(expense.vendor, (totals.get(expense.vendor) ?? 0) + value);
    }
    return [...totals].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [range, expenses]);

  const recent = useMemo(() => [...invoices].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5), [invoices]);

  function shiftPeriod(offset: number) {
    if (rangeMode === "month") setRangeMonth((month) => addMonths(month, offset));
    if (rangeMode === "year") setRangeYear((year) => year + offset);
  }

  async function submitGoal(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await saveMonthlyGoal({ month: goalMonth, revenueTarget: Number(goalForm.revenueTarget || 0), recurringRevenueTarget: goal?.recurringRevenueTarget ?? 0, expenseBudget: Number(goalForm.expenseBudget || 0), notes: goalForm.notes });
      setGoal(saved);
      setEditingGoal(false);
    } catch {
      setError("Monatsziel konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  const margin = metrics.revenue > 0 ? Math.round(metrics.profit / metrics.revenue * 100) : undefined;

  return <WorkspaceShell active="Übersicht" title="Wendico / Übersicht"><div className="page-enter">
    {error && <div role="alert" className="mb-6 rounded-lg border border-[#fda29b] bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">{error}</div>}

    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--primary)]">Finanzen</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ink)]">Übersicht</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{periodLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-[var(--surface-soft)] p-1" role="tablist" aria-label="Zeitraum">
          {(["month", "year", "custom"] as const).map((mode) => <button key={mode} role="tab" aria-selected={rangeMode === mode} onClick={() => setRangeMode(mode)} className={rangeMode === mode ? "filter-active" : "filter"}>{mode === "month" ? "Monat" : mode === "year" ? "Jahr" : "Zeitraum"}</button>)}
        </div>
        {rangeMode !== "custom" ? <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface)]">
          <button onClick={() => shiftPeriod(-1)} aria-label="Vorheriger Zeitraum" className="icon-button h-10 w-10"><ChevronLeft size={16}/></button>
          {rangeMode === "month"
            ? <input type="month" value={rangeMonth} onChange={(event) => event.target.value && setRangeMonth(event.target.value)} aria-label="Monat" className="bg-transparent px-1 text-sm font-semibold text-[var(--ink)] outline-none"/>
            : <span className="min-w-16 text-center text-sm font-semibold text-[var(--ink)]">{rangeYear}</span>}
          <button onClick={() => shiftPeriod(1)} aria-label="Nächster Zeitraum" className="icon-button h-10 w-10"><ChevronRight size={16}/></button>
        </div> : <div className="flex items-center gap-2">
          <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} aria-label="Von" className="field w-auto"/>
          <span className="text-xs text-[var(--muted)]">bis</span>
          <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} aria-label="Bis" className="field w-auto"/>
        </div>}
        {((rangeMode === "month" && rangeMonth !== currentMonth) || (rangeMode === "year" && rangeYear !== Number(today.slice(0, 4)))) && <button onClick={() => { setRangeMonth(currentMonth); setRangeYear(Number(today.slice(0, 4))); }} className="action">Heute</button>}
      </div>
    </header>

    {receivables.overdueCount > 0 && <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#f79009] bg-[#fffaeb] px-4 py-3 text-sm text-[#93370d]">
      <CircleAlert size={17} className="flex-none"/>
      <span className="flex-1"><strong>{receivables.overdueCount} überfällige Rechnung{receivables.overdueCount === 1 ? "" : "en"}</strong> über {formatCurrency(receivables.overdueAmount)} – jetzt nachfassen.</span>
    </div>}

    {foreignCurrencyCount > 0 && <p className="mt-3 text-xs text-[var(--muted)]">{foreignCurrencyCount} bezahlte Rechnung{foreignCurrencyCount === 1 ? "" : "en"} in Fremdwährung im Zeitraum – nicht im CHF-Umsatz enthalten.</p>}

    <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Umsatz (netto)" value={metrics.revenue} previous={previous?.revenue} comparisonLabel={comparisonLabel} loading={loading}
        hint={metrics.plannedRevenue > 0 ? `inkl. ${formatCurrency(metrics.plannedRevenue)} erwartet` : `davon ${formatCurrency(metrics.recurringRevenue)} wiederkehrend`}/>
      <Kpi label="Ausgaben" value={metrics.costs} previous={previous?.costs} comparisonLabel={comparisonLabel} loading={loading} inverse
        hint={metrics.plannedCosts > 0 ? `inkl. ${formatCurrency(metrics.plannedCosts)} geplant` : `davon ${formatCurrency(metrics.recurringCosts)} wiederkehrend`}/>
      <Kpi label="Ergebnis" value={metrics.profit} previous={previous?.profit} comparisonLabel={comparisonLabel} loading={loading} emphasize
        hint={margin === undefined ? "Keine Einnahmen im Zeitraum" : `Marge ${margin}%`}/>
      <Kpi label="Offene Forderungen" value={receivables.openAmount} loading={loading}
        hint={receivables.openCount ? `${receivables.openCount} offen${receivables.overdueCount ? ` · ${receivables.overdueCount} überfällig` : ""} · Stand heute` : "Alles bezahlt · Stand heute"}/>
    </section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="panel rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">Einnahmen & Ausgaben</h2>
            <p className="text-xs text-[var(--muted)]">{rangeMode === "month" ? "Letzte 6 Monate" : "Pro Monat im Zeitraum"}</p>
          </div>
          <div className="flex gap-4 text-xs text-[var(--muted)]">
            <Legend color="#3aa981" label="Einnahmen"/><Legend color="#f97066" label="Ausgaben"/><Legend color="#4f8fd1" label="Ergebnis" line/>
          </div>
        </div>
        <div className="mt-5 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barGap={2}>
              <CartesianGrid vertical={false}/>
              <XAxis dataKey="month" tickLine={false} axisLine={false}/>
              <YAxis tickFormatter={compactCurrency} tickLine={false} axisLine={false} width={48}/>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: "var(--surface-soft)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)" }}/>
              <Bar dataKey="Einnahmen" fill="#3aa981" radius={[4, 4, 0, 0]} maxBarSize={28}/>
              <Bar dataKey="Ausgaben" fill="#f97066" radius={[4, 4, 0, 0]} maxBarSize={28}/>
              <Line dataKey="Ergebnis" stroke="#4f8fd1" strokeWidth={2} dot={{ r: 3 }} type="monotone"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel flex flex-col rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="notification-icon"><Target size={18}/></span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Monatsziel</h2>
              <p className="text-xs text-[var(--muted)]">{monthLabel(goalMonth)}</p>
            </div>
          </div>
          {goal && !editingGoal && <button onClick={() => setEditingGoal(true)} aria-label="Ziele bearbeiten" className="icon-button"><Pencil size={15}/></button>}
        </div>
        {editingGoal ? <form onSubmit={submitGoal} className="page-enter mt-5 grid gap-3">
          <GoalField label="Umsatzziel" value={goalForm.revenueTarget} onChange={(value) => setGoalForm({ ...goalForm, revenueTarget: value })}/>
          <GoalField label="Ausgabenbudget" value={goalForm.expenseBudget} onChange={(value) => setGoalForm({ ...goalForm, expenseBudget: value })}/>
          <label><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Notiz</span><input value={goalForm.notes} onChange={(event) => setGoalForm({ ...goalForm, notes: event.target.value })} className="field"/></label>
          <div className="flex gap-2"><button disabled={saving} className="primary">{saving ? "Speichert..." : "Speichern"}</button><button type="button" onClick={() => setEditingGoal(false)} className="action"><X size={15}/>Abbrechen</button></div>
        </form> : goal ? <div className="mt-5 grid gap-3">
          <GoalProgress label="Umsatz" current={goalMetrics.revenue} target={goal.revenueTarget}/>
          <GoalProgress label="Ausgaben" current={goalMetrics.costs} target={goal.expenseBudget} inverse/>
          {goal.notes && <p className="text-xs leading-5 text-[var(--muted)]">{goal.notes}</p>}
        </div> : <button onClick={() => setEditingGoal(true)} className="mt-5 flex-1 rounded-lg border border-dashed border-[var(--line)] py-8 text-sm font-semibold text-[var(--primary)] hover:border-[var(--primary)]">Ziel für {monthLabel(goalMonth)} festlegen</button>}
      </section>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <Breakdown title="Einnahmen nach Kunde" subtitle={periodLabel} rows={revenueByCustomer} color="#3aa981" empty="Keine Einnahmen im Zeitraum." href="/customers"/>
      <Breakdown title="Ausgaben nach Posten" subtitle={periodLabel} rows={costsByVendor} color="#f97066" empty="Keine Ausgaben im Zeitraum." href="/analytics"/>
      <section className="panel rounded-xl p-5 lg:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Letzte Rechnungen</h2>
        </div>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {recent.map((invoice) => { const status: InvoiceStatus = isOverdue(invoice) ? "overdue" : invoice.status; return <li key={invoice.id}><div className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{invoice.customerName}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{invoice.invoiceNumber} · fällig {dateLabel(invoice.dueDate)}</p>
            </div>
            <div className="flex flex-none flex-col items-end gap-1">
              <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">{formatCurrency(invoiceTotal(invoice.items), invoice.currency)}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusStyles[status]}`}>{invoiceStatusLabels[status]}</span>
            </div>
          </div></li>; })}
          {!recent.length && <li className="py-10 text-center text-sm text-[var(--muted)]">{loading ? "Lädt..." : "Noch keine Rechnungen."}</li>}
        </ul>
      </section>
    </div>
  </div></WorkspaceShell>;
}

function Kpi({ label, value, previous, comparisonLabel, hint, loading, inverse = false, emphasize = false }: { label: string; value: number; previous?: number; comparisonLabel?: string; hint: string; loading: boolean; inverse?: boolean; emphasize?: boolean }) {
  const delta = previous !== undefined && previous !== 0 ? (value - previous) / Math.abs(previous) * 100 : undefined;
  const good = delta !== undefined && (inverse ? delta <= 0 : delta >= 0);
  const valueColor = emphasize ? value < 0 ? "text-[#d92d20]" : "text-[#12b76a]" : "text-[var(--ink)]";
  return <div className="panel rounded-xl p-4 md:p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      {delta !== undefined && Math.abs(delta) >= 0.5 && <span title={`gegenüber ${comparisonLabel}`} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${good ? "bg-[#d1fadf] text-[#05603a]" : "bg-[#fee4e2] text-[#b42318]"}`}>{delta >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{Math.abs(Math.round(delta))}%</span>}
    </div>
    <p className={`mt-3 text-2xl font-semibold tabular-nums ${valueColor} ${loading ? "animate-pulse opacity-40" : ""}`}>{formatCurrency(value)}</p>
    <p className="mt-1 truncate text-xs text-[var(--muted)]">{hint}{delta !== undefined && Math.abs(delta) >= 0.5 ? ` · ggü. ${comparisonLabel}` : ""}</p>
  </div>;
}

function Breakdown({ title, subtitle, rows, color, empty, href }: { title: string; subtitle: string; rows: { label: string; value: number }[]; color: string; empty: string; href: string }) {
  const visible = rows.slice(0, 6);
  const rest = rows.slice(6).reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <section className="panel rounded-xl p-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2><p className="text-xs text-[var(--muted)]">{subtitle}</p></div>
      <Link href={href} className="text-xs font-semibold text-[var(--primary)]">Details</Link>
    </div>
    <ul className="mt-4 space-y-3">
      {visible.map((row) => <li key={row.label}>
        <div className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate text-[var(--ink)]">{row.label}</span><span className="flex-none font-semibold tabular-nums text-[var(--ink)]">{formatCurrency(row.value)}</span></div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full" style={{ width: `${row.value / max * 100}%`, background: color }}/></div>
      </li>)}
      {rest > 0 && <li className="flex justify-between text-xs text-[var(--muted)]"><span>{rows.length - 6} weitere</span><span className="tabular-nums">{formatCurrency(rest)}</span></li>}
      {!rows.length && <li className="py-8 text-center text-sm text-[var(--muted)]">{empty}</li>}
    </ul>
  </section>;
}

function Legend({ color, label, line = false }: { color: string; label: string; line?: boolean }) {
  return <span className="flex items-center gap-1.5"><span className={line ? "h-0.5 w-3 rounded" : "h-2.5 w-2.5 rounded-sm"} style={{ background: color }}/>{label}</span>;
}

function GoalField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">{label} (CHF)</span><input type="number" min="0" step="100" value={value} onChange={(event) => onChange(event.target.value)} className="field"/></label>;
}

function GoalProgress({ label, current, target, inverse = false }: { label: string; current: number; target: number; inverse?: boolean }) {
  const percentage = target > 0 ? Math.round(current / target * 100) : 0;
  const healthy = inverse ? current <= target : current >= target;
  const barColor = inverse ? current > target ? "bg-[#d92d20]" : "bg-[#3aa981]" : healthy ? "bg-[#3aa981]" : "bg-[var(--primary)]";
  return <div className="rounded-lg bg-[var(--surface-soft)] p-3.5">
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <span className={`text-xs font-semibold ${healthy ? "text-[#12b76a]" : inverse ? "text-[#d92d20]" : "text-[var(--primary)]"}`}>{target > 0 ? `${percentage}%` : "kein Ziel"}</span>
    </div>
    <p className="mt-1 text-sm text-[var(--ink)]"><span className="font-semibold tabular-nums">{formatCurrency(current)}</span><span className="text-[var(--muted)]"> / {formatCurrency(target)}</span></p>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }}/></div>
  </div>;
}
