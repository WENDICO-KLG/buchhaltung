"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, Upload, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { Guilloche } from "@/components/ui/guilloche";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { ErrorNote, Field, FieldGroup, fieldLabel, FormDialog } from "@/app/prospects/_components/form-dialog";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer, uploadCustomerLogo, setCustomerCommissionEnabled } from "@/lib/storage";
import { getActiveCompany } from "@/lib/company";
import { supabase } from "@/lib/supabase";
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
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [manageCommission, setManageCommission] = useState(false);
  const [commissionStates, setCommissionStates] = useState<Record<string,boolean>>({});
  const [commissionBusy, setCommissionBusy] = useState<string>();

  useEffect(() => {
    getActiveCompany().then(async (company) => {
      if (!company) return;
      setManageCommission(["owner","admin"].includes(company.role));
      const { data, error } = await supabase.from("customers").select("id,commission_enabled").eq("user_id",company.company_id);
      if (error) throw error;
      setCommissionStates(Object.fromEntries((data ?? []).map((row) => [row.id,Boolean(row.commission_enabled)])));
    }).catch(() => setError("Provisionsfreigaben konnten nicht geladen werden."));
  }, []);

  async function toggleCommission(id: string, enabled: boolean) {
    setCommissionBusy(id); setError("");
    try { await setCustomerCommissionEnabled(id,enabled); setCommissionStates((current) => ({ ...current,[id]:enabled })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Provision konnte nicht gespeichert werden."); }
    finally { setCommissionBusy(undefined); }
  }

  useEffect(() => { getCustomers().then(setCustomers).catch((cause) => setError(cause instanceof Error ? cause.message : "Kunden konnten nicht geladen werden.")).finally(() => setLoaded(true)); }, []);

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
    <div className="page-enter">
      <PageHeader title="Kunden" subtitle="Wiederkehrende und einmalige Einnahmen pro Kunde." actions={<button onClick={() => { reset(); setShowForm(true); }} className="primary max-sm:w-full"><Plus size={16}/>Kunde hinzufügen</button>}/>
      {error && !showForm && <ErrorNote className="mt-6">{error}</ErrorNote>}

      <section aria-label="Einnahmen" className="panel relative isolate mt-8 overflow-hidden rounded-3xl p-5 sm:p-8">
        <Guilloche className="absolute -top-80 right-[8%] -z-10 w-[34rem] max-lg:-right-40 max-sm:-right-64"/>
        {loaded ? <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Stat size="lg" label="Wiederkehrend Ø / Monat" hint="Jährliche Zahlungen anteilig /12" value={<CountUp value={totals.averageMonthly} format={formatCurrency}/>}/>
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            <Stat label={`Einmalig ${year}`} hint="Nach Zahlungsdatum" value={formatCurrency(totals.oneTime)}/>
            <Stat label={`Jahreswert ${year}`} hint="Wiederkehrend nach Zeitraum + einmalig" value={formatCurrency(totals.annual)}/>
          </div>
        </div> : <div className="max-w-md"><Skeleton className="w-40"/><Skeleton className="mt-4 h-14 w-full"/><Skeleton className="mt-4 w-52"/></div>}
      </section>

      <div className="panel mt-6 overflow-hidden rounded-2xl bg-[var(--surface)]">
        {!loaded ? <div className="space-y-6 p-6">{[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-14"/>)}</div>
          : customers.length ? customers.map((customer) => <article key={customer.id} className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-[var(--line)] px-4 py-5 transition-colors first:border-t-0 hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.15fr)_minmax(0,.9fr)_auto] lg:py-6">
            <div className="flex min-w-0 items-start gap-4">
              <label title="Logo hochladen" className={`group relative flex h-14 w-20 flex-none cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] p-2 text-[var(--muted)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--gold)] ${customer.logoUrl ? "bg-[#fbf8f0]" : "bg-[var(--surface-soft)]"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase logo URL */}
                {customer.logoUrl ? <img src={customer.logoUrl} alt={customer.companyName} className="max-h-full max-w-full object-contain"/> : <Users aria-hidden size={20} strokeWidth={1.5}/>}
                <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/65 text-[#fff] opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"><Upload size={17}/></span>
                <input type="file" aria-label={`Logo für ${customer.companyName} hochladen`} accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(customer.id, file); event.target.value = ""; }}/>
              </label>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{customer.companyName}</h2>
                <p className="mt-0.5 text-sm text-[var(--muted)]">{customer.contactName || "Keine Kontaktperson"}</p>
                {customer.project && <p className="mt-1 text-sm">{customer.project}</p>}
                {customer.notes && <p className="mt-2 text-[13px] text-[var(--muted)]">{customer.notes}</p>}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-2">
              <Revenue prominent label={intervalLabel[customer.billingInterval]} value={customer.recurringRevenue} active={customer.recurringRevenue > 0 && isRecurringActive(customer.billingStartDate, customer.billingEndDate, todayKey().slice(0, 7))} detail={customer.recurringRevenue > 0 ? `${periodLabel(customer)}${customer.billingInterval === "yearly" && customer.billingStartDate ? ` · jeweils im ${formatMonth(customer.billingStartDate, "long").split(" ")[0]}` : ""}` : undefined}/>
              <Revenue label="Einmalig" value={customer.oneTimeRevenue} active={customer.oneTimeRevenue > 0} detail={customer.oneTimeRevenue > 0 ? customer.oneTimeRevenueDate ? `am ${formatDate(customer.oneTimeRevenueDate)}` : "ohne Datum – nicht gezählt" : undefined}/>
            </div>
            <div className="min-w-0 text-sm text-[var(--muted)] lg:space-y-1">
              {customer.email && <a href={`mailto:${customer.email}`} className="flex min-w-0 items-center gap-2 hover:text-[var(--ink)] max-lg:min-h-11"><Mail aria-hidden size={14} className="flex-none"/><span className="truncate">{customer.email}</span></a>}
              {customer.phone && <a href={`tel:${customer.phone}`} className="money flex min-w-0 items-center gap-2 hover:text-[var(--ink)] max-lg:min-h-11"><Phone aria-hidden size={14} className="flex-none"/><span className="truncate">{customer.phone}</span></a>}
            </div>
            <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-start">
              <label className="flex min-h-11 items-center gap-3 text-sm lg:order-2"><span>Provision</span><input type="checkbox" role="switch" aria-label={`Provision für ${customer.companyName}`} checked={commissionStates[customer.id] ?? false} disabled={!manageCommission || Boolean(commissionBusy)} onChange={(event) => void toggleCommission(customer.id,event.target.checked)} className="commission-switch"/></label>
              <div className="flex gap-1 lg:-mt-1.5">
                <button onClick={() => edit(customer)} aria-label="Kunde bearbeiten" title={`${customer.companyName} bearbeiten`} className="icon-button"><Pencil size={16}/></button>
                <button onClick={() => remove(customer.id)} aria-label="Kunde löschen" title={`${customer.companyName} löschen`} className="icon-button hover:!text-[var(--coral)]"><Trash2 size={16}/></button>
              </div>
            </div>
          </article>) : <EmptyState icon={Users} title="Noch keine Kunden erfasst." text="Erfasse den ersten Kunden mit seinen Einnahmen."/>}
      </div>
    </div>

    {showForm && <FormDialog title={editingId ? "Kunde bearbeiten" : "Kunde hinzufügen"} submitLabel={editingId ? "Änderungen speichern" : "Kunde speichern"} error={error} onSubmit={submit} onClose={reset}>
      <FieldGroup title="Kontakt">
        <div className="sm:col-span-2"><Field label="Firma / Name" required value={form.companyName} onChange={(value) => set("companyName", value)}/></div>
        <Field label="Kontaktperson" value={form.contactName ?? ""} onChange={(value) => set("contactName", value)}/>
        <Field label="Projekt" value={form.project ?? ""} onChange={(value) => set("project", value)}/>
        <Field label="E-Mail" type="email" value={form.email ?? ""} onChange={(value) => set("email", value)}/>
        <Field label="Telefon" value={form.phone ?? ""} onChange={(value) => set("phone", value)}/>
        <div className="sm:col-span-2"><Field label="Adresse" value={form.address ?? ""} onChange={(value) => set("address", value)}/></div>
      </FieldGroup>
      <FieldGroup title="Wiederkehrende Zahlung">
        <label className="flex min-w-0 flex-col justify-end"><span className={fieldLabel}>Intervall</span><select value={form.billingInterval} onChange={(event) => set("billingInterval", event.target.value as RecurringInterval)} className="field"><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select></label>
        <MoneyField label={yearly ? "Betrag pro Jahr" : "Betrag pro Monat"} value={form.recurringRevenue} onChange={(value) => set("recurringRevenue", value)}/>
        <Field label={yearly ? "Zahlend ab (bestimmt Zahlungsmonat)" : "Zahlend ab"} type="date" required={yearly && form.recurringRevenue > 0} value={form.billingStartDate ?? ""} onChange={(value) => set("billingStartDate", value)}/>
        <Field label="Zahlend bis (leer = unbefristet)" type="date" value={form.billingEndDate ?? ""} onChange={(value) => set("billingEndDate", value)}/>
        {yearly && form.billingStartDate && <p className="text-sm text-[var(--muted)] sm:col-span-2">Wird jedes Jahr im {formatMonth(form.billingStartDate, "long").split(" ")[0]} als Umsatz gezählt.</p>}
      </FieldGroup>
      <FieldGroup title="Einmalige Zahlung">
        <MoneyField label="Betrag" value={form.oneTimeRevenue} onChange={(value) => set("oneTimeRevenue", value)}/>
        <Field label="Zahlungsdatum" type="date" required={form.oneTimeRevenue > 0} value={form.oneTimeRevenueDate ?? ""} onChange={(value) => set("oneTimeRevenueDate", value)}/>
      </FieldGroup>
      <label className="block"><span className={fieldLabel}>Notizen</span><textarea rows={3} value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className="field"/></label>
    </FormDialog>}
  </WorkspaceShell>;
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return <label className="flex min-w-0 flex-col justify-end"><span className={fieldLabel}>{label} (CHF)</span><input type="number" min="0" step="0.01" value={editing ? draft : value} onFocus={() => { setDraft(value === 0 ? "" : String(value)); setEditing(true); }} onBlur={() => setEditing(false)} onChange={(event) => { setDraft(event.target.value); onChange(Number(event.target.value)); }} className="field"/></label>;
}
function Revenue({ label, value, detail, active, prominent = false }: { label: string; value: number; detail?: string; active: boolean; prominent?: boolean }) {
  return <div className="min-w-0"><p className="text-[13px] text-[var(--muted)]">{label}</p><p className={`money mt-0.5 whitespace-nowrap ${prominent ? "text-xl font-semibold tracking-tight" : "text-base font-medium leading-7"} ${!active ? "text-[var(--muted)]" : prominent ? "text-[var(--emerald)]" : ""}`}>{formatCurrency(value)}</p>{detail && <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{detail}</p>}</div>;
}
