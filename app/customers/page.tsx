"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Mail, Pencil, Phone, Plus, ReceiptText, Repeat, Trash2, Upload, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer, uploadCustomerLogo } from "@/lib/storage";
import { customerOneTimeRevenue, customerRecurringRevenue, formatCurrency, isRecurringActive, monthKeysBetween, todayKey } from "@/lib/utils";
import type { Customer, RecurringInterval } from "@/types";

type CustomerForm = Omit<Customer, "id" | "createdAt" | "updatedAt" | "logoUrl">;
const emptyForm: CustomerForm = { companyName: "", contactName: "", email: "", phone: "", address: "", project: "", recurringRevenue: 0, billingInterval: "monthly", billingStartDate: "", billingEndDate: "", oneTimeRevenue: 0, oneTimeRevenueDate: "", notes: "" };
const formatMonth = (date: string, month: "short" | "long" = "short") => new Date(`${date.slice(0, 7)}-01T12:00:00`).toLocaleDateString("de-CH", { month, year: "numeric" });
const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-CH");
const intervalLabel: Record<RecurringInterval, string> = { monthly: "Monatlich", yearly: "Jährlich" };

function periodLabel(customer: Pick<Customer, "billingStartDate" | "billingEndDate">) {
  const { billingStartDate: start, billingEndDate: end } = customer;
  if (start && end) return `${formatMonth(start)} – ${formatMonth(end)}`;
  if (start) return `ab ${formatMonth(start)}`;
  if (end) return `bis ${formatMonth(end)}`;
  return "unbefristet";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { getCustomers().then(setCustomers).catch((cause) => setError(cause instanceof Error ? cause.message : "Kunden konnten nicht geladen werden.")); }, []);

  const year = Number(todayKey().slice(0, 4));
  const totals = useMemo(() => {
    const currentMonth = todayKey().slice(0, 7);
    const yearMonths = monthKeysBetween(`${year}-01`, `${year}-12`);
    const averageMonthly = customers.reduce((sum, customer) => isRecurringActive(customer.billingStartDate, customer.billingEndDate, currentMonth) ? sum + (customer.billingInterval === "yearly" ? customer.recurringRevenue / 12 : customer.recurringRevenue) : sum, 0);
    const oneTime = customers.reduce((sum, customer) => sum + customerOneTimeRevenue(customer, `${year}-01-01`, `${year}-12-31`), 0);
    const recurringYear = customers.reduce((sum, customer) => sum + yearMonths.reduce((monthSum, key) => monthSum + customerRecurringRevenue(customer, key), 0), 0);
    return { averageMonthly, oneTime, annual: recurringYear + oneTime };
  }, [customers, year]);

  function edit(customer: Customer) {
    setForm({ companyName: customer.companyName, contactName: customer.contactName ?? "", email: customer.email ?? "", phone: customer.phone ?? "", address: customer.address ?? "", project: customer.project ?? "", recurringRevenue: customer.recurringRevenue, billingInterval: customer.billingInterval, billingStartDate: customer.billingStartDate ?? "", billingEndDate: customer.billingEndDate ?? "", oneTimeRevenue: customer.oneTimeRevenue, oneTimeRevenueDate: customer.oneTimeRevenueDate ?? "", notes: customer.notes ?? "" });
    setEditingId(customer.id); setShowForm(true); setError("");
  }
  function reset() { setForm(emptyForm); setEditingId(undefined); setShowForm(false); setError(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        setCustomers((current) => current.map((customer) => customer.id === editingId ? { ...customer, ...form } : customer));
      } else {
        const customer = await createCustomer(form);
        setCustomers((current) => [...current, customer].sort((a, b) => a.companyName.localeCompare(b.companyName)));
      }
      reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kunde konnte nicht gespeichert werden."); }
  }
  async function remove(id: string) {
    if (!window.confirm("Kunden löschen?")) return;
    try { await deleteCustomer(id); setCustomers((current) => current.filter((customer) => customer.id !== id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Kunde konnte nicht gelöscht werden."); }
  }
  async function uploadLogo(customerId: string, file: File) {
    try { const logoUrl = await uploadCustomerLogo(customerId, file); setCustomers((current) => current.map((customer) => customer.id === customerId ? { ...customer, logoUrl } : customer)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Logo konnte nicht hochgeladen werden."); }
  }
  const set = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const yearly = form.billingInterval === "yearly";

  return <WorkspaceShell active="Kunden" title="Wendico / Kunden">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--primary)]">Kontakte & Einnahmen</p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Kunden</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Wiederkehrende und einmalige Einnahmen pro Kunde.</p>
      </div>
      <button onClick={() => { reset(); setShowForm(true); }} className="primary flex items-center gap-2"><Plus size={16}/>Kunde hinzufügen</button>
    </div>
    {error && <div role="alert" className="mt-5 rounded-lg border border-[#fda29b] bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">{error}</div>}

    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <RevenueMetric label="Wiederkehrend Ø / Monat" hint="Jährliche Zahlungen anteilig /12" value={totals.averageMonthly} icon={Repeat}/>
      <RevenueMetric label={`Einmalig ${year}`} hint="Nach Zahlungsdatum" value={totals.oneTime} icon={ReceiptText}/>
      <RevenueMetric label={`Jahreswert ${year}`} hint="Wiederkehrend nach Zeitraum + einmalig" value={totals.annual} icon={Users}/>
    </section>

    {showForm && <form onSubmit={submit} className="panel mt-6 rounded-2xl p-5">
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-3 text-sm font-semibold text-[var(--ink)]">Kontakt</legend>
        <Field label="Firma / Name" required value={form.companyName} onChange={(value) => set("companyName", value)}/>
        <Field label="Kontaktperson" value={form.contactName ?? ""} onChange={(value) => set("contactName", value)}/>
        <Field label="Projekt" value={form.project ?? ""} onChange={(value) => set("project", value)}/>
        <Field label="E-Mail" type="email" value={form.email ?? ""} onChange={(value) => set("email", value)}/>
        <Field label="Telefon" value={form.phone ?? ""} onChange={(value) => set("phone", value)}/>
        <Field label="Adresse" value={form.address ?? ""} onChange={(value) => set("address", value)}/>
      </fieldset>
      <fieldset className="mt-6 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-3 pt-5 text-sm font-semibold text-[var(--ink)]">Wiederkehrende Zahlung</legend>
        <label><span className="mb-2 block text-xs text-[var(--muted)]">Intervall</span><select value={form.billingInterval} onChange={(event) => set("billingInterval", event.target.value as RecurringInterval)} className="field"><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select></label>
        <MoneyField label={yearly ? "Betrag pro Jahr" : "Betrag pro Monat"} value={form.recurringRevenue} onChange={(value) => set("recurringRevenue", value)}/>
        <Field label={yearly ? "Zahlend ab (bestimmt Zahlungsmonat)" : "Zahlend ab"} type="date" required={yearly && form.recurringRevenue > 0} value={form.billingStartDate ?? ""} onChange={(value) => set("billingStartDate", value)}/>
        <Field label="Zahlend bis (leer = unbefristet)" type="date" value={form.billingEndDate ?? ""} onChange={(value) => set("billingEndDate", value)}/>
        {yearly && form.billingStartDate && <p className="text-xs text-[var(--muted)] sm:col-span-2 lg:col-span-4">Wird jedes Jahr im {formatMonth(form.billingStartDate, "long").split(" ")[0]} als Umsatz gezählt.</p>}
      </fieldset>
      <fieldset className="mt-6 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-3 pt-5 text-sm font-semibold text-[var(--ink)]">Einmalige Zahlung</legend>
        <MoneyField label="Betrag" value={form.oneTimeRevenue} onChange={(value) => set("oneTimeRevenue", value)}/>
        <Field label="Zahlungsdatum" type="date" required={form.oneTimeRevenue > 0} value={form.oneTimeRevenueDate ?? ""} onChange={(value) => set("oneTimeRevenueDate", value)}/>
      </fieldset>
      <label className="mt-6 block border-t border-[var(--line)] pt-5"><span className="mb-2 block text-xs text-[var(--muted)]">Notizen</span><textarea rows={3} value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className="field"/></label>
      <div className="mt-5 flex gap-2"><button className="primary">{editingId ? "Änderungen speichern" : "Kunde speichern"}</button><button type="button" onClick={reset} className="action">Abbrechen</button></div>
    </form>}

    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {customers.map((customer) => <article key={customer.id} className="panel rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <label className="group relative flex h-11 min-w-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-soft)] px-1 text-[var(--primary)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase logo URL */}
            {customer.logoUrl ? <img src={customer.logoUrl} alt={customer.companyName} className="h-full w-auto max-w-none object-contain"/> : <Users size={20}/>}
            <span className="absolute inset-0 hidden items-center justify-center bg-black/60 group-hover:flex"><Upload size={16} className="text-white"/></span>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(customer.id, file); event.target.value = ""; }}/>
          </label>
          <div className="flex gap-1">
            <button onClick={() => edit(customer)} aria-label="Kunde bearbeiten" className="icon-button"><Pencil size={15}/></button>
            <button onClick={() => remove(customer.id)} aria-label="Kunde löschen" className="icon-button text-[var(--danger)]"><Trash2 size={15}/></button>
          </div>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[var(--ink)]">{customer.companyName}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{customer.contactName || "Keine Kontaktperson"}</p>
        {customer.project && <p className="mt-4 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-[var(--primary)]">{customer.project}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Revenue label={intervalLabel[customer.billingInterval]} value={customer.recurringRevenue} detail={customer.recurringRevenue > 0 ? `${periodLabel(customer)}${customer.billingInterval === "yearly" && customer.billingStartDate ? ` · jeweils im ${formatMonth(customer.billingStartDate, "long").split(" ")[0]}` : ""}` : undefined}/>
          <Revenue label="Einmalig" value={customer.oneTimeRevenue} detail={customer.oneTimeRevenue > 0 ? customer.oneTimeRevenueDate ? `am ${formatDate(customer.oneTimeRevenueDate)}` : "ohne Datum – nicht gezählt" : undefined}/>
        </div>
        <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
          {customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-[var(--ink)]"><Mail size={14}/>{customer.email}</a>}
          {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-[var(--ink)]"><Phone size={14}/>{customer.phone}</a>}
        </div>
        {customer.notes && <p className="mt-4 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--muted)]">{customer.notes}</p>}
      </article>)}
      {!customers.length && <div className="panel col-span-full rounded-2xl py-14 text-center text-sm text-[var(--muted)]">Noch keine Kunden erfasst.</div>}
    </div>
  </WorkspaceShell>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label><span className="mb-2 block text-xs text-[var(--muted)]">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field"/></label>; }
function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label><span className="mb-2 block text-xs text-[var(--muted)]">{label} (CHF)</span><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} className="field"/></label>; }
function RevenueMetric({ label, hint, value, icon: Icon }: { label: string; hint: string; value: number; icon: typeof Users }) { return <div className="panel rounded-2xl p-4"><div className="flex justify-between text-xs text-[var(--muted)]"><span>{label}</span><Icon size={16} className="text-[var(--primary)]"/></div><p className="mt-2 text-xl font-semibold tabular-nums text-[var(--ink)]">{formatCurrency(value)}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p></div>; }
function Revenue({ label, value, detail }: { label: string; value: number; detail?: string }) { return <div className="rounded-lg border border-[var(--line)] p-3"><p className="text-[11px] text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold tabular-nums text-[var(--ink)]">{formatCurrency(value)}</p>{detail && <p className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-[var(--muted)]"><CalendarRange size={11} className="mt-0.5 flex-none"/>{detail}</p>}</div>; }
