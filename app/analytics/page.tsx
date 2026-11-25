"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, ReceiptText, Repeat, Trash2 } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Amount, Stat } from "@/components/ui/stat";
import { createExpense, deleteExpense, getCustomers, getExpenses, updateExpense } from "@/lib/storage";
import { addMonths, formatCurrency, monthKeysBetween, recurringExpenseMonthlyAmount, todayKey } from "@/lib/utils";
import type { Customer, Expense, RecurringInterval } from "@/types";

type FilterMode = "month" | "range" | "customer";
const today = todayKey();
const emptyForm = { vendor: "", description: "", amount: "", expenseDate: today, customerId: "", isRecurring: false, recurringInterval: "monthly" as RecurringInterval, recurringStartDate: "", recurringEndDate: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [filterMonth, setFilterMonth] = useState(today.slice(0, 7));
  const [filterFrom, setFilterFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [filterTo, setFilterTo] = useState(today);
  const [filterCustomer, setFilterCustomer] = useState("");

  useEffect(() => {
    Promise.all([getExpenses(), getCustomers()])
      .then(([expenseData, customerData]) => { setExpenses(expenseData); setCustomers(customerData); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Ausgaben konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);
  // The form sits above the list, so bring it into view when a row further down is edited.
  useEffect(() => { if (open) formRef.current?.scrollIntoView({ block: "nearest" }); }, [open, editingId]);

  const customerNames = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.companyName])), [customers]);
  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    if (filterCustomer && expense.customerId !== filterCustomer) return false;
    if (filterMode === "customer") return true;
    if (filterMode === "month") return expense.isRecurring ? recurringExpenseMonthlyAmount(expense, filterMonth) > 0 : expense.expenseDate.startsWith(filterMonth);
    const from = filterFrom <= filterTo ? filterFrom : filterTo;
    const to = filterFrom <= filterTo ? filterTo : filterFrom;
    if (!expense.isRecurring) return expense.expenseDate >= from && expense.expenseDate <= to;
    return monthKeysBetween(from, to).some((key) => recurringExpenseMonthlyAmount(expense, key) > 0);
  }), [expenses, filterCustomer, filterFrom, filterMode, filterMonth, filterTo]);
  const total = useMemo(() => {
    const from = filterFrom <= filterTo ? filterFrom : filterTo;
    const to = filterFrom <= filterTo ? filterTo : filterFrom;
    return filteredExpenses.reduce((sum, expense) => {
      if (!expense.isRecurring) return sum + expense.amount;
      if (filterMode === "month") return sum + recurringExpenseMonthlyAmount(expense, filterMonth);
      const months = filterMode === "range" ? monthKeysBetween(from, to) : monthKeysBetween(expense.recurringStartDate || expense.expenseDate, expense.recurringEndDate && expense.recurringEndDate < today ? expense.recurringEndDate : today);
      return sum + months.reduce((monthSum, key) => monthSum + recurringExpenseMonthlyAmount(expense, key), 0);
    }, 0);
  }, [filteredExpenses, filterMode, filterMonth, filterFrom, filterTo]);
  const recurringMonth = filterMode === "month" ? filterMonth : today.slice(0, 7);
  const recurringMonthlyTotal = useMemo(() => filteredExpenses.reduce((sum, expense) => sum + recurringExpenseMonthlyAmount(expense, recurringMonth), 0), [filteredExpenses, recurringMonth]);

  function edit(expense: Expense) {
    const startDate = expense.recurringStartDate || expense.expenseDate;
    setForm({ vendor: expense.vendor, description: expense.description, amount: expense.amount.toString(), expenseDate: expense.isRecurring ? startDate : expense.expenseDate, customerId: expense.customerId ?? "", isRecurring: expense.isRecurring, recurringInterval: expense.recurringInterval ?? "monthly", recurringStartDate: expense.isRecurring ? startDate : expense.recurringStartDate ?? "", recurringEndDate: expense.recurringEndDate ?? "" });
    setEditingId(expense.id); setOpen(true);
  }
  function reset() { setForm(emptyForm); setEditingId(undefined); setOpen(false); setError(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (form.isRecurring && !form.recurringStartDate) throw new Error("Bitte das Startdatum der wiederkehrenden Ausgabe angeben.");
      const payload = { vendor: form.vendor, description: form.description, amount: Number(form.amount), currency: "CHF", expenseDate: form.isRecurring ? form.recurringStartDate : form.expenseDate, customerId: form.customerId || undefined, isRecurring: form.isRecurring, recurringInterval: form.isRecurring ? form.recurringInterval : undefined, recurringStartDate: form.isRecurring ? form.recurringStartDate || undefined : undefined, recurringEndDate: form.isRecurring ? form.recurringEndDate || undefined : undefined };
      if (editingId) { await updateExpense(editingId, payload); setExpenses((current) => current.map((expense) => expense.id === editingId ? { ...expense, ...payload } : expense)); }
      else { const expense = await createExpense(payload); setExpenses((current) => [expense, ...current]); }
      reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ausgabe konnte nicht gespeichert werden."); }
  }
  async function remove(id: string) {
    if (!window.confirm("Ausgabe wirklich löschen?")) return;
    setExpenses((current) => current.filter((expense) => expense.id !== id));
    try { await deleteExpense(id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Ausgabe konnte nicht gelöscht werden."); }
  }
  const setFormValue = (key: keyof typeof emptyForm, value: string | boolean) => setForm((current) => {
    if (key === "isRecurring" && value === true) {
      const startDate = current.recurringStartDate || current.expenseDate;
      return { ...current, isRecurring: true, recurringStartDate: startDate, expenseDate: startDate };
    }
    if (key === "recurringStartDate" && typeof value === "string") return { ...current, recurringStartDate: value, expenseDate: current.isRecurring ? value : current.expenseDate };
    return { ...current, [key]: value };
  });

  const thisMonth = today.slice(0, 7);
  const chartEnd = filterMonth <= thisMonth && filterMonth > addMonths(thisMonth, -12) ? thisMonth : filterMonth || thisMonth;
  const chart = useMemo(() => monthKeysBetween(addMonths(chartEnd, -11), chartEnd).map((key) => expenses.reduce((sum, expense) => {
    if (filterCustomer && expense.customerId !== filterCustomer) return sum;
    if (expense.isRecurring) sum.recurring += recurringExpenseMonthlyAmount(expense, key);
    else if (expense.expenseDate.startsWith(key)) sum.single += expense.amount;
    return sum;
  }, { key, recurring: 0, single: 0 })), [chartEnd, expenses, filterCustomer]);

  return <WorkspaceShell active="Ausgaben" title="Wendico / Ausgaben"><div className="page-enter">
    <PageHeader title="Ausgaben" subtitle="Kosten nach Zeitraum und Kunde überblicken." actions={<button onClick={() => { reset(); setOpen(true); }} className="primary w-full sm:w-auto"><Plus size={17}/>Ausgabe erfassen</button>}/>
    {error && <div role="alert" className="tile mt-6 flex items-center gap-3 px-5 py-3.5 text-sm text-[var(--coral)]"><span aria-hidden className="dot dot-off"/>{error}</div>}

    {open && <form ref={formRef} onSubmit={submit} className="panel mt-6 scroll-mt-24 scroll-mb-24 p-6 md:p-7">
      <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{editingId ? "Ausgabe bearbeiten" : "Neue Ausgabe"}</h2><label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13.5px] text-[var(--muted)]">Wiederkehrend<input type="checkbox" className="switch" checked={form.isRecurring} onChange={(event) => setFormValue("isRecurring", event.target.checked)}/></label></div>
      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Lieferant" value={form.vendor} required onChange={(value) => setFormValue("vendor", value)}/>
        <Field label="Beschreibung" value={form.description} required onChange={(value) => setFormValue("description", value)}/>
        <Field label="Datum" type="date" value={form.expenseDate} disabled={form.isRecurring} onChange={(value) => setFormValue("expenseDate", value)}/>
        <Field label="Betrag in CHF" type="number" value={form.amount} required onChange={(value) => setFormValue("amount", value)}/>
        <label className="min-w-0"><FieldLabel>Kunde</FieldLabel><select value={form.customerId} onChange={(event) => setFormValue("customerId", event.target.value)} className="field"><option value="">Kein Kunde</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</select></label>
        {form.isRecurring && <label className="min-w-0"><FieldLabel>Intervall</FieldLabel><select value={form.recurringInterval} onChange={(event) => setFormValue("recurringInterval", event.target.value as RecurringInterval)} className="field"><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select></label>}
        {form.isRecurring && <Field label="Wiederkehrend von" type="date" value={form.recurringStartDate} required onChange={(value) => setFormValue("recurringStartDate", value)}/>}
        {form.isRecurring && <Field label="Wiederkehrend bis" type="date" value={form.recurringEndDate} onChange={(value) => setFormValue("recurringEndDate", value)}/>}
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><button className="primary">{editingId ? "Änderungen speichern" : "Speichern"}</button><button type="button" onClick={reset} className="action">Abbrechen</button></div>
    </form>}

    <section aria-label="Ausgaben filtern" className="mt-7 flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Zeitraum" className="pill-track max-sm:w-full [&>button]:max-sm:flex-1">{([["month", "Monat"], ["range", "Zeitraum"], ["customer", "Kunde"]] as const).map(([value, label]) => <button key={value} aria-pressed={filterMode === value} onClick={() => setFilterMode(value)} className={filterMode === value ? "filter-active" : "filter"}>{label}</button>)}</div>
      {filterMode !== "customer" && <div className="pill-track max-sm:w-full">
        {filterMode === "month" && <FilterDate label="Monat" type="month" value={filterMonth} onChange={setFilterMonth}/>}
        {filterMode === "range" && <><FilterDate label="Von" type="date" value={filterFrom} onChange={setFilterFrom}/><span aria-hidden className="text-[13.5px] text-[var(--muted)]">bis</span><FilterDate label="Bis" type="date" value={filterTo} onChange={setFilterTo}/></>}
      </div>}
      <label className="min-w-0 max-sm:w-full sm:w-44 xl:ml-auto xl:w-60"><span className="sr-only">Kunde</span><select value={filterCustomer} onChange={(event) => setFilterCustomer(event.target.value)} className="field !min-h-12 rounded-full"><option value="">Alle Kunden</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</select></label>
    </section>

    <section className="raised mt-5 overflow-hidden" aria-busy={loading}>
      <div className="grid gap-8 p-6 md:p-9 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-12">
        <div className="flex min-w-0 flex-col justify-between gap-8">
          <Stat size="lg" label={filterMode === "customer" ? "Ausgaben bis heute" : "Ausgaben im Zeitraum"} value={loading ? "–" : <Amount value={total}/>} hint={loading ? undefined : `${filteredExpenses.length} ${filteredExpenses.length === 1 ? "Position" : "Positionen"}`}/>
          <div className="border-t border-[var(--line)] pt-5"><Stat label="Wiederkehrend im Monat" value={loading ? "–" : formatCurrency(recurringMonthlyTotal)}/></div>
        </div>
        <MonthBars data={chart} selected={filterMode === "month" ? filterMonth : undefined} onSelect={(key) => { setFilterMode("month"); setFilterMonth(key); }}/>
      </div>
    </section>

    <section aria-label="Ausgabenliste" className="panel mt-5 overflow-hidden pb-2">
      {loading ? <div className="grid gap-4 p-6">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-10"/>)}</div> : filteredExpenses.length ? <>
        <table className="hidden w-full text-left text-sm xl:table"><thead className="text-[13.5px] text-[var(--muted)]"><tr className="[&>th]:font-medium"><th className="py-4 pl-7 pr-4">Datum</th><th className="px-4">Lieferant</th><th className="px-4">Beschreibung</th><th className="px-4">Kunde</th><th className="px-4 text-right">Betrag</th><th className="pl-4 pr-6 text-right"><span className="sr-only">Aktionen</span></th></tr></thead>
          <tbody>{filteredExpenses.map((expense) => <tr key={expense.id} className="border-t border-[var(--line)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]">
            <td className="whitespace-nowrap py-4 pl-7 pr-4 text-[var(--muted)]">{dateLabel(expense)}</td>
            <td className="px-4 font-semibold">{expense.vendor}</td>
            <td className="max-w-[22rem] px-4 text-[var(--muted)]">{expense.description}{expense.isRecurring && <Interval expense={expense}/>}</td>
            <td className="max-w-[14rem] px-4">{customerNames.get(expense.customerId ?? "") ?? <span className="text-[var(--muted)]">Nicht zugeordnet</span>}</td>
            <td className="money whitespace-nowrap px-4 text-right font-semibold">{formatCurrency(expense.amount, expense.currency)}</td>
            <td className="pl-4 pr-6"><Actions onEdit={() => edit(expense)} onRemove={() => remove(expense.id)}/></td>
          </tr>)}</tbody></table>
        <ul className="divide-y divide-[var(--line)] xl:hidden">{filteredExpenses.map((expense) => <li key={expense.id} className="px-5 pb-2 pt-4">
          <div className="flex items-baseline justify-between gap-4"><p className="min-w-0 break-words font-semibold">{expense.vendor}</p><p className="money flex-none font-semibold">{formatCurrency(expense.amount, expense.currency)}</p></div>
          <p className="mt-1 text-sm text-[var(--muted)]">{expense.description}</p>
          <div className="mt-1 flex items-center justify-between gap-3"><p className="min-w-0 text-[13.5px] text-[var(--muted)]">{dateLabel(expense)}{expense.isRecurring && <Interval expense={expense}/>}<span className="block truncate">{customerNames.get(expense.customerId ?? "") ?? "Nicht zugeordnet"}</span></p><Actions onEdit={() => edit(expense)} onRemove={() => remove(expense.id)}/></div>
        </li>)}</ul>
      </> : <EmptyState icon={ReceiptText} title="Keine Ausgaben für diesen Filter."/>}
    </section>
  </div></WorkspaceShell>;
}

function dateLabel(expense: Expense) { return new Date(`${expense.expenseDate}T12:00:00`).toLocaleDateString("de-CH"); }

function Interval({ expense }: { expense: Expense }) { return <span className="ml-2.5 inline-flex items-baseline gap-1.5 whitespace-nowrap text-[13.5px] text-[var(--ink)]"><Repeat aria-hidden size={13} strokeWidth={1.6} className="translate-y-0.5"/>{expense.recurringInterval === "yearly" ? "jährlich" : "monatlich"}</span>; }

function Actions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return <div className="flex flex-none justify-end gap-1"><button onClick={onEdit} aria-label="Ausgabe bearbeiten" title="Ausgabe bearbeiten" className="icon-button"><Pencil size={16} strokeWidth={1.6}/></button><button onClick={onRemove} aria-label="Ausgabe löschen" title="Ausgabe löschen" className="icon-button hover:text-[var(--coral)]"><Trash2 size={16} strokeWidth={1.6}/></button></div>;
}

function MonthBars({ data, selected, onSelect }: { data: { key: string; recurring: number; single: number }[]; selected?: string; onSelect: (key: string) => void }) {
  const max = Math.max(...data.map((entry) => entry.recurring + entry.single));
  return <div className="flex min-w-0 flex-col justify-end">
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-[13.5px] text-[var(--muted)]"><h2 className="text-[13.5px] font-normal">Monatsverlauf</h2><p className="flex gap-4"><span className="inline-flex items-center gap-2"><i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--chart-4)]"/>Wiederkehrend</span><span className="inline-flex items-center gap-2"><i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--chart-3)]"/>Einmalig</span></p></div>
    <div className="mt-4 flex">{data.map((entry, index) => {
      const value = entry.recurring + entry.single;
      const name = new Date(`${entry.key}-01T12:00:00`).toLocaleDateString("de-CH", { month: "long", year: "numeric" });
      const active = entry.key === selected;
      return <button key={entry.key} type="button" onClick={() => onSelect(entry.key)} aria-pressed={active} aria-label={`${name}: ${formatCurrency(value)}`} title={`${name}: ${formatCurrency(value)}`} className={`group min-w-0 flex-1 flex-col justify-end rounded-2xl pt-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] ${index < 6 ? "hidden sm:flex" : "flex"}`}>
        <span aria-hidden className="flex h-40 w-full flex-col items-center justify-end"><span className="flex w-2.5 flex-col gap-0.5 overflow-hidden rounded-full" style={{ height: max > 0 ? `${value / max * 100}%` : 0 }}>{entry.single > 0 && <span className="rounded-full" style={{ flexGrow: entry.single, background: active ? "color-mix(in oklab, var(--chart-1) 45%, var(--ink))" : "var(--chart-3)" }}/>}{entry.recurring > 0 && <span className="rounded-full" style={{ flexGrow: entry.recurring, background: active ? "var(--chart-1)" : "var(--chart-4)" }}/>}</span></span>
        <span aria-hidden className={`flex h-11 w-full items-center justify-center whitespace-nowrap ${active ? "text-base font-semibold text-[var(--ink)]" : "text-xs text-[var(--muted)]"}`}>{new Date(`${entry.key}-01T12:00:00`).toLocaleDateString("de-CH", { month: "short" }).replace(".", "").slice(0, 3)}</span>
      </button>;
    })}</div>
  </div>;
}

function FilterDate({ label, value, onChange, type }: { label: string; value: string; onChange: (value: string) => void; type: string }) { return <label className="min-w-0 flex-1"><span className="sr-only">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="money min-h-10 w-full min-w-0 rounded-full bg-transparent px-3 text-center text-sm font-medium text-[var(--ink)] focus-visible:-outline-offset-2 pointer-coarse:min-h-11"/></label>; }
function FieldLabel({ children }: { children: React.ReactNode }) { return <span className="mb-2 block text-[13.5px] text-[var(--muted)]">{children}</span>; }
function Field({ label, value, onChange, type = "text", required = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; disabled?: boolean }) { return <label className="min-w-0"><FieldLabel>{label}</FieldLabel><input required={required} disabled={disabled} type={type} step={type === "number" ? "0.01" : undefined} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="field min-w-0 disabled:cursor-not-allowed disabled:opacity-60"/></label>; }
