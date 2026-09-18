"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Pencil, Plus, ReceiptText, Repeat, Trash2, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { createExpense, deleteExpense, getCustomers, getExpenses, updateExpense } from "@/lib/storage";
import { formatCurrency, recurringExpenseMonthlyAmount } from "@/lib/utils";
import type { Customer, Expense, RecurringInterval } from "@/types";

type FilterMode = "month" | "range" | "customer";
const today = new Date().toISOString().slice(0, 10);
const emptyForm = { vendor: "", description: "", amount: "", expenseDate: today, customerId: "", isRecurring: false, recurringInterval: "monthly" as RecurringInterval, recurringStartDate: "", recurringEndDate: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [filterMonth, setFilterMonth] = useState(today.slice(0, 7));
  const [filterFrom, setFilterFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [filterTo, setFilterTo] = useState(today);
  const [filterCustomer, setFilterCustomer] = useState("");

  useEffect(() => {
    Promise.all([getExpenses(), getCustomers()])
      .then(([expenseData, customerData]) => { setExpenses(expenseData); setCustomers(customerData); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Ausgaben konnten nicht geladen werden."));
  }, []);

  const customerNames = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.companyName])), [customers]);
  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    if (filterCustomer && expense.customerId !== filterCustomer) return false;
    if (filterMode === "customer") return true;
    if (filterMode === "month") return expense.isRecurring ? recurringExpenseMonthlyAmount(expense, filterMonth) > 0 : expense.expenseDate.startsWith(filterMonth);
    const from = filterFrom <= filterTo ? filterFrom : filterTo;
    const to = filterFrom <= filterTo ? filterTo : filterFrom;
    if (!expense.isRecurring) return expense.expenseDate >= from && expense.expenseDate <= to;
    const start = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      if (recurringExpenseMonthlyAmount(expense, cursor.toISOString().slice(0, 7)) > 0) return true;
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return false;
  }), [expenses, filterCustomer, filterFrom, filterMode, filterMonth, filterTo]);
  const total = useMemo(() => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0), [filteredExpenses]);
  const recurringMonth = filterMode === "month" ? filterMonth : today.slice(0, 7);
  const recurringMonthlyTotal = useMemo(() => filteredExpenses.reduce((sum, expense) => sum + recurringExpenseMonthlyAmount(expense, recurringMonth), 0), [filteredExpenses, recurringMonth]);

  function edit(expense: Expense) {
    setForm({ vendor: expense.vendor, description: expense.description, amount: expense.amount.toString(), expenseDate: expense.expenseDate, customerId: expense.customerId ?? "", isRecurring: expense.isRecurring, recurringInterval: expense.recurringInterval ?? "monthly", recurringStartDate: expense.recurringStartDate ?? "", recurringEndDate: expense.recurringEndDate ?? "" });
    setEditingId(expense.id); setOpen(true);
  }
  function reset() { setForm(emptyForm); setEditingId(undefined); setOpen(false); setError(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const payload = { vendor: form.vendor, description: form.description, amount: Number(form.amount), currency: "CHF", expenseDate: form.expenseDate, customerId: form.customerId || undefined, isRecurring: form.isRecurring, recurringInterval: form.isRecurring ? form.recurringInterval : undefined, recurringStartDate: form.isRecurring ? form.recurringStartDate || undefined : undefined, recurringEndDate: form.isRecurring ? form.recurringEndDate || undefined : undefined };
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
  const setFormValue = (key: keyof typeof emptyForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return <WorkspaceShell active="Ausgaben" title="Wendico / Ausgaben">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#56c8ff]">Betriebsausgaben</p><h1 className="mt-3 text-3xl font-semibold text-white">Ausgaben</h1><p className="mt-2 text-sm text-[#8292ae]">Kosten nach Zeitraum und Kunde überblicken.</p></div><button onClick={() => { reset(); setOpen(true); }} className="primary flex items-center gap-2"><Plus size={16}/>Ausgabe erfassen</button></div>
    {error && <div className="mt-5 rounded-xl border border-[#6e3340] bg-[#24131e] px-4 py-3 text-sm text-[#ffaaa0]">{error}</div>}
    <section className="panel mt-6 grid gap-4 rounded-2xl p-4"><div className="flex items-center gap-2 text-sm font-semibold text-white"><CalendarRange size={16} className="text-[#56c8ff]"/>Ausgaben filtern</div><div className="flex flex-wrap gap-2"><button onClick={() => setFilterMode("month")} className={filterMode === "month" ? "filter-active" : "filter"}>Monat</button><button onClick={() => setFilterMode("range")} className={filterMode === "range" ? "filter-active" : "filter"}>Zeitraum</button><button onClick={() => setFilterMode("customer")} className={filterMode === "customer" ? "filter-active" : "filter"}>Kunde</button></div><div className="grid gap-3 sm:grid-cols-3">{filterMode === "month" && <Field label="Monat" type="month" value={filterMonth} onChange={setFilterMonth}/>} {filterMode === "range" && <><Field label="Von" type="date" value={filterFrom} onChange={setFilterFrom}/><Field label="Bis" type="date" value={filterTo} onChange={setFilterTo}/></>}<label><span className="mb-2 block text-xs text-[#8292ae]">Kunde</span><select value={filterCustomer} onChange={(event) => setFilterCustomer(event.target.value)} className="field"><option value="">Alle Kunden</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</select></label></div></section>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:max-w-lg"><Summary label="Gefilterte Ausgaben" value={total} icon={ReceiptText}/><Summary label="Wiederkehrend im Monat" value={recurringMonthlyTotal} icon={Repeat}/></div>
    {open && <form onSubmit={submit} className="panel mt-5 grid gap-4 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-4"><Field label="Lieferant" value={form.vendor} required onChange={(value) => setFormValue("vendor", value)}/><Field label="Beschreibung" value={form.description} required onChange={(value) => setFormValue("description", value)}/><Field label="Datum" type="date" value={form.expenseDate} onChange={(value) => setFormValue("expenseDate", value)}/><Field label="Betrag in CHF" type="number" value={form.amount} required onChange={(value) => setFormValue("amount", value)}/><label><span className="mb-2 block text-xs text-[#8292ae]">Kunde</span><select value={form.customerId} onChange={(event) => setFormValue("customerId", event.target.value)} className="field"><option value="">Kein Kunde</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</select></label><label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" checked={form.isRecurring} onChange={(event) => setFormValue("isRecurring", event.target.checked)}/><span className="text-xs text-[#8292ae]">Wiederkehrend</span></label>{form.isRecurring && <label><span className="mb-2 block text-xs text-[#8292ae]">Intervall</span><select value={form.recurringInterval} onChange={(event) => setFormValue("recurringInterval", event.target.value as RecurringInterval)} className="field"><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select></label>}{form.isRecurring && <Field label="Wiederkehrend von" type="date" value={form.recurringStartDate} onChange={(value) => setFormValue("recurringStartDate", value)}/>} {form.isRecurring && <Field label="Wiederkehrend bis" type="date" value={form.recurringEndDate} onChange={(value) => setFormValue("recurringEndDate", value)}/>}<div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button className="primary">{editingId ? "Änderungen speichern" : "Speichern"}</button><button type="button" onClick={reset} className="action">Abbrechen</button></div></form>}
    <div className="panel mt-5 overflow-hidden rounded-2xl">{filteredExpenses.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-xs text-[#7185a6]"><tr><th className="px-6 py-4">Datum</th><th>Lieferant</th><th>Beschreibung</th><th>Kunde</th><th className="text-right">Betrag</th><th className="px-6 text-right">Aktionen</th></tr></thead><tbody>{filteredExpenses.map((expense) => <tr key={expense.id} className="border-t border-white/5"><td className="px-6 py-4 text-[#8292ae]">{new Date(`${expense.expenseDate}T12:00:00`).toLocaleDateString("de-CH")}</td><td className="font-semibold text-white">{expense.vendor}</td><td className="max-w-[24rem] text-[#8292ae]">{expense.description}{expense.isRecurring && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#153a71] px-2 py-0.5 text-xs text-[#8edaff]"><Repeat size={11}/>{expense.recurringInterval === "yearly" ? "jährlich" : "monatlich"}</span>}</td><td>{customerNames.get(expense.customerId ?? "") ? <span className="inline-flex max-w-[12rem] items-center gap-1 truncate rounded-full bg-[#153a71] px-2 py-1 text-xs text-[#8edaff]"><Users size={12}/>{customerNames.get(expense.customerId ?? "")}</span> : <span className="text-xs text-[#7185a6]">Nicht zugeordnet</span>}</td><td className="text-right font-semibold text-white">{formatCurrency(expense.amount, expense.currency)}</td><td className="px-6"><div className="flex justify-end gap-1"><button onClick={() => edit(expense)} aria-label="Ausgabe bearbeiten" className="icon-button"><Pencil size={15}/></button><button onClick={() => remove(expense.id)} aria-label="Ausgabe löschen" className="icon-button text-[#ff8f85]"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div> : <div className="py-16 text-center"><ReceiptText className="mx-auto text-[#526b8c]"/><p className="mt-3 text-sm text-[#8292ae]">Keine Ausgaben für diesen Filter.</p></div>}</div>
  </WorkspaceShell>;
}

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: typeof ReceiptText }) { return <section className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><p className="text-xs text-[#8292ae]">{label}</p><Icon size={16} className="text-[#56c8ff]"/></div><p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(value)}</p></section>; }
function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label><span className="mb-2 block text-xs text-[#8292ae]">{label}</span><input required={required} type={type} step={type === "number" ? "0.01" : undefined} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="field"/></label>; }
