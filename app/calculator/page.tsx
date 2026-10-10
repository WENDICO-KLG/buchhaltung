"use client";

import { useEffect, useState } from "react";
import { Calculator, Save } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { companyMemberName, getActiveCompany, getCommissionCustomers, getCompanyMembers, setCustomerCommission } from "@/lib/company";
import type { CommissionCustomer, CompanyMember, CompanyMembership } from "@/lib/company";
import { formatCurrency } from "@/lib/utils";

export default function CalculatorPage() {
  const [company,setCompany] = useState<CompanyMembership>();
  const [customers,setCustomers] = useState<CommissionCustomer[]>([]);
  const [members,setMembers] = useState<CompanyMember[]>([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState<string>();
  const [revenue,setRevenue] = useState(1000);
  const [costs,setCosts] = useState(0);
  const [rate,setRate] = useState(10);
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  useEffect(() => {
    getActiveCompany().then(async (active) => {
      if (!active) throw new Error("Keine Firma ausgewählt.");
      setCompany(active);
      const rows = await getCommissionCustomers(active.company_id);
      setCustomers(rows);
      if (["owner","admin"].includes(active.role)) setMembers(await getCompanyMembers(active.company_id));
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Daten konnten nicht geladen werden.")).finally(() => setLoading(false));
  }, []);
  const manage = company && ["owner","admin"].includes(company.role);
  const invalidRange = Boolean(from && to && from > to);
  const selected = invalidRange ? [] : customers.filter((customer) => (!from && !to) || Boolean(customer.payment_date && (!from || customer.payment_date >= from) && (!to || customer.payment_date <= to)));
  const total = selected.reduce((sum,customer) => sum + (customer.member_id ? Number(customer.amount)*Number(customer.rate)/100 : 0),0);
  async function save(customer: CommissionCustomer, memberId: string, percentage: number) {
    if (!company) return;
    setBusy(customer.customer_id); setError("");
    try {
      await setCustomerCommission(company.company_id,customer.customer_id,memberId,percentage);
      setCustomers(await getCommissionCustomers(company.company_id));
    } catch(cause) { setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen."); }
    finally { setBusy(undefined); }
  }
  return <WorkspaceShell active="Rechner" title="Wendico / Rechner">
    <div className="todo-page pb-10"><div className="flex items-center gap-3"><Calculator size={24} className="text-[var(--primary)]"/><h1 className="text-3xl font-semibold">Rechner</h1></div>
      {error && <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      <section className="mt-6 border-y border-[var(--line)] py-5"><h2 className="text-lg font-semibold">Szenario</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><NumberField label="Einmaliger Umsatz (CHF)" value={revenue} onChange={setRevenue}/><NumberField label="Kosten (CHF)" value={costs} onChange={setCosts}/><NumberField label="Provision (%)" value={rate} max={100} onChange={setRate}/></div><div className="mt-5 flex flex-wrap gap-8"><Metric label="Provision" value={revenue*rate/100}/><Metric label="Ergebnis nach Kosten und Provision" value={revenue-costs-revenue*rate/100}/></div></section>
      <section className="mt-7"><h2 className="text-lg font-semibold">Kundenprovisionen</h2><div className="mt-4 flex flex-wrap items-end gap-4"><label className="text-xs text-[var(--muted)]">Zahlungsdatum ab<input type="date" className="field mt-1" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label className="text-xs text-[var(--muted)]">Zahlungsdatum bis<input type="date" className="field mt-1" value={to} onChange={(event) => setTo(event.target.value)}/></label><Metric label="Potenzielle Provision (einmalig)" value={total}/></div>{invalidRange && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">Das Enddatum muss nach dem Startdatum liegen.</p>}
      <div className="mt-5 divide-y divide-[var(--line)]">{selected.map((customer) => <CommissionRow key={`${customer.customer_id}:${customer.member_id}:${customer.rate}`} customer={customer} members={members} manage={Boolean(manage)} busy={Boolean(busy)} save={save}/>)}{!selected.length && <p className="py-12 text-center text-sm text-[var(--muted)]">{loading ? "Kunden werden geladen..." : "Keine provisionsfähigen Kunden in dieser Ansicht."}</p>}</div></section>
    </div>
  </WorkspaceShell>;
}

function CommissionRow({customer,members,manage,busy,save}: {customer: CommissionCustomer; members: CompanyMember[]; manage: boolean; busy: boolean; save: (customer: CommissionCustomer,member: string,rate: number) => Promise<void>}) {
  const [member,setMember] = useState(customer.member_id ?? "");
  const [rate,setRate] = useState(Number(customer.rate));
  return <div className="grid items-end gap-4 py-5 sm:grid-cols-2 lg:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_100px_140px_auto]"><div className="min-w-0"><h3 className="break-words font-semibold">{customer.company_name}</h3><p className="mt-1 text-xs text-[var(--muted)]">Einmalig: {formatCurrency(Number(customer.amount))}</p><p className="text-xs text-[var(--muted)]">{customer.payment_date ? new Date(`${customer.payment_date}T12:00:00`).toLocaleDateString("de-CH") : "Ohne Zahlungsdatum"}</p></div>{manage ? <label className="min-w-0 text-xs text-[var(--muted)]">Mitarbeiter<select className="field mt-1" value={member} disabled={busy} onChange={(event) => setMember(event.target.value)}><option value="">Nicht zugeteilt</option>{members.filter((person) => person.role !== "viewer").map((person) => <option key={person.user_id} value={person.user_id}>{companyMemberName(person)}</option>)}</select></label> : <p className="break-words text-sm">{customer.member_name}</p>}{manage ? <NumberField label="Provision (%)" value={rate} max={100} disabled={busy} onChange={setRate}/> : <p className="text-sm">{rate}%</p>}<Metric label="Provision" value={member ? Number(customer.amount)*rate/100 : 0}/>{manage && <button disabled={busy} title="Zuordnung speichern" aria-label={`Provision für ${customer.company_name} speichern`} className="action" onClick={() => void save(customer,member,rate)}><Save size={17}/></button>}</div>;
}
function NumberField({label,value,onChange,max,disabled}: {label:string;value:number;onChange:(value:number)=>void;max?:number;disabled?:boolean}) {return <label className="min-w-0 text-xs text-[var(--muted)]">{label}<input className="field mt-1" type="number" min={0} max={max} step="0.01" disabled={disabled} value={value} onChange={(event)=> {const amount=Number(event.target.value);if(Number.isFinite(amount))onChange(Math.max(0,Math.min(max ?? Number.MAX_SAFE_INTEGER,amount)));}}/></label>;}
function Metric({label,value}:{label:string;value:number}) {return <div><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(value)}</p></div>;}