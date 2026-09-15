"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Mail, Pencil, Phone, Plus, ReceiptText, Trash2, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";

type CustomerForm = Omit<Customer, "id" | "createdAt" | "updatedAt">;
const emptyForm: CustomerForm = { companyName: "", contactName: "", email: "", phone: "", address: "", project: "", monthlyRevenue: 0, oneTimeRevenue: 0, notes: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { getCustomers().then(setCustomers).catch((cause) => setError(cause instanceof Error ? cause.message : "Kunden konnten nicht geladen werden.")); }, []);
  const totals = useMemo(() => {
    const monthly = customers.reduce((sum, customer) => sum + customer.monthlyRevenue, 0);
    const oneTime = customers.reduce((sum, customer) => sum + customer.oneTimeRevenue, 0);
    return { monthly, oneTime, annual: monthly * 12 + oneTime };
  }, [customers]);

  function edit(customer: Customer) {
    const { id, createdAt, updatedAt, ...values } = customer;
    void id; void createdAt; void updatedAt;
    setForm(values); setEditingId(customer.id); setShowForm(true);
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
  async function remove(id: string) { if (!window.confirm("Kunden löschen?")) return; await deleteCustomer(id); setCustomers((current) => current.filter((customer) => customer.id !== id)); }
  const set = (key: keyof CustomerForm, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  return <WorkspaceShell active="Kunden" title="Wendico / Kunden">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#56c8ff]">Kontakte & Einnahmen</p><h1 className="mt-3 text-3xl font-semibold text-white">Kunden</h1><p className="mt-2 text-sm text-[#8292ae]">Monatliche und einmalige Einnahmen pro Kunde.</p></div><button onClick={() => { reset(); setShowForm(true); }} className="primary flex items-center gap-2"><Plus size={16}/>Kunde hinzufügen</button></div>
    {error && <div className="mt-5 rounded-xl border border-[#6e3340] bg-[#24131e] px-4 py-3 text-sm text-[#ffaaa0]">{error}</div>}
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><RevenueMetric label="Monatlich" value={totals.monthly} icon={CalendarRange}/><RevenueMetric label="Einmalig" value={totals.oneTime} icon={ReceiptText}/><RevenueMetric label="Jahreswert" value={totals.annual} icon={Users}/></section>
    {showForm && <form onSubmit={submit} className="panel mt-6 grid gap-4 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="Firma / Name" required value={form.companyName} onChange={(value) => set("companyName", value)}/><Field label="Kontaktperson" value={form.contactName ?? ""} onChange={(value) => set("contactName", value)}/><Field label="Projekt" value={form.project ?? ""} onChange={(value) => set("project", value)}/><Field label="E-Mail" type="email" value={form.email ?? ""} onChange={(value) => set("email", value)}/><Field label="Telefon" value={form.phone ?? ""} onChange={(value) => set("phone", value)}/><Field label="Adresse" value={form.address ?? ""} onChange={(value) => set("address", value)}/><MoneyField label="Monatliche Einnahmen" value={form.monthlyRevenue} onChange={(value) => set("monthlyRevenue", value)}/><MoneyField label="Einmalige Einnahmen" value={form.oneTimeRevenue} onChange={(value) => set("oneTimeRevenue", value)}/><label className="sm:col-span-2 lg:col-span-3"><span className="mb-2 block text-xs text-[#8292ae]">Notizen</span><textarea rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} className="field"/></label><div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="primary">{editingId ? "Änderungen speichern" : "Kunde speichern"}</button><button type="button" onClick={reset} className="action">Abbrechen</button></div></form>}
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{customers.map((customer) => <article key={customer.id} className="panel rounded-2xl p-5"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#102b56] text-[#62c8ff]"><Users size={20}/></div><div className="flex gap-1"><button onClick={() => edit(customer)} aria-label="Kunde bearbeiten" className="icon-button"><Pencil size={15}/></button><button onClick={() => remove(customer.id)} aria-label="Kunde löschen" className="icon-button text-[#ff8f85]"><Trash2 size={15}/></button></div></div><h2 className="mt-4 text-lg font-semibold text-white">{customer.companyName}</h2><p className="mt-1 text-sm text-[#8292ae]">{customer.contactName || "Keine Kontaktperson"}</p>{customer.project && <p className="mt-4 rounded-lg bg-[#102442] px-3 py-2 text-xs text-[#8edaff]">{customer.project}</p>}<div className="mt-4 grid grid-cols-2 gap-2"><Revenue label="Monatlich" value={customer.monthlyRevenue}/><Revenue label="Einmalig" value={customer.oneTimeRevenue}/></div><div className="mt-4 space-y-2 text-xs text-[#8292ae]">{customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-white"><Mail size={14}/>{customer.email}</a>}{customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-white"><Phone size={14}/>{customer.phone}</a>}</div>{customer.notes && <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-[#8292ae]">{customer.notes}</p>}</article>)}{!customers.length && <div className="panel col-span-full rounded-2xl py-14 text-center text-sm text-[#8292ae]">Noch keine Kunden erfasst.</div>}</div>
  </WorkspaceShell>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label><span className="mb-2 block text-xs text-[#8292ae]">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field"/></label>; }
function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label><span className="mb-2 block text-xs text-[#8292ae]">{label} (CHF)</span><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} className="field"/></label>; }
function RevenueMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) { return <div className="panel rounded-2xl p-4"><div className="flex justify-between text-xs text-[#8292ae]"><span>{label}</span><Icon size={16} className="text-[#56c8ff]"/></div><p className="mt-2 text-xl font-semibold text-white">{formatCurrency(value)}</p></div>; }
function Revenue({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-white/10 p-3"><p className="text-[11px] text-[#8292ae]">{label}</p><p className="mt-1 font-semibold text-white">{formatCurrency(value)}</p></div>; }
