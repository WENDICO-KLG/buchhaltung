"use client";

import { useEffect, useState } from "react";
import { Calculator } from "@/components/calculator";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { companyMemberName, getActiveCompany, getCommissionCustomers, getCompanyMembers, setCustomerCommission } from "@/lib/company";
import type { CommissionCustomer, CompanyMember, CompanyMembership } from "@/lib/company";
import { commissionBreakdown } from "@/lib/calculator";
import { formatCurrency, lastDayOfMonth, todayKey } from "@/lib/utils";

export default function CalculatorPage() {
  const [company,setCompany] = useState<CompanyMembership>();
  const [customers,setCustomers] = useState<CommissionCustomer[]>([]);
  const [members,setMembers] = useState<CompanyMember[]>([]);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState<string>();
  const [employee,setEmployee] = useState("all");
  const [mode,setMode] = useState<"month"|"year"|"custom">("month");
  const [month,setMonth] = useState(todayKey().slice(0,7));
  const [year,setYear] = useState(todayKey().slice(0,4));
  const [from,setFrom] = useState(`${todayKey().slice(0,7)}-01`);
  const [to,setTo] = useState(lastDayOfMonth(todayKey().slice(0,7)));
  useEffect(() => {
    let active = true;
    getActiveCompany().then(async (selectedCompany) => {
      if (!selectedCompany) throw new Error("Keine Firma ausgewählt.");
      const rows = await getCommissionCustomers(selectedCompany.company_id);
      const team = ["owner","admin"].includes(selectedCompany.role) ? await getCompanyMembers(selectedCompany.company_id) : [];
      if(active){setCompany(selectedCompany);setCustomers(rows);setMembers(team);}
    }).catch((cause) => {if(active)setError(cause instanceof Error ? cause.message : "Daten konnten nicht geladen werden.");}).finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  }, []);
  const manage = Boolean(company && ["owner","admin"].includes(company.role));
  const start = mode === "month" ? `${month}-01` : mode === "year" ? `${year}-01-01` : from;
  const end = mode === "month" ? lastDayOfMonth(month) : mode === "year" ? `${year}-12-31` : to;
  const invalid = !start || !end || start > end || (mode === "year" && (!/^\d{4}$/.test(year) || Number(year)<1900));
  const rows = invalid ? [] : commissionBreakdown(customers,start,end,employee);
  const sums = rows.reduce((sum,row) => ({base:sum.base+row.base,bonus:sum.bonus+row.bonus,total:sum.total+row.total}),{base:0,bonus:0,total:0});
  const employees = new Map<string,string>();
  for(const member of members.filter((person)=>person.role!=="viewer")) employees.set(member.user_id,companyMemberName(member));
  for(const customer of customers) if(customer.member_id) employees.set(customer.member_id,customer.member_name ?? "Mitarbeiter");
  const assignments = customers.filter((customer)=>(employee === "all" || customer.member_id === employee) && !customer.payment_date);
  async function assign(customer: CommissionCustomer, member: string) {
    if(!company)return;
    setBusy(customer.customer_id);setError("");setNotice("");
    try {await setCustomerCommission(company.company_id,customer.customer_id,member,10);setCustomers(await getCommissionCustomers(company.company_id));setNotice("Mitarbeiterzuordnung gespeichert.");}
    catch(cause){setError(cause instanceof Error ? cause.message : "Zuordnung konnte nicht gespeichert werden.");}
    finally{setBusy(undefined);}
  }
  function customerRow(customer: CommissionCustomer, base: number, bonus: number, total: number, closes?: number) {
    return <div key={customer.customer_id} className="grid items-center gap-3 border-b border-[var(--line)] py-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.4fr)_minmax(180px,1fr)_100px_100px_120px]">
      <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{customer.company_name}</h3><p className="mt-1 text-xs text-[var(--muted)]">{formatCurrency(Number(customer.amount))} · {customer.payment_date ? new Date(`${customer.payment_date}T12:00:00`).toLocaleDateString("de-CH") : "Ohne Abschlussdatum"}</p></div>
      {manage ? <label className="min-w-0"><span className="sr-only">Mitarbeiter für {customer.company_name}</span><select value={customer.member_id ?? ""} disabled={Boolean(busy)} onChange={(event)=>void assign(customer,event.target.value)} className="field text-sm"><option value="">Nicht zugeteilt</option>{members.filter((person)=>person.role!=="viewer").map((person)=><option key={person.user_id} value={person.user_id}>{companyMemberName(person)}</option>)}</select></label> : <p className="break-words text-sm">{customer.member_name}</p>}
      <Metric label="10 %" value={base}/><div><Metric label="Bonus" value={bonus}/>{closes !== undefined && customer.member_id && <p className="text-[11px] text-[var(--muted)]">{closes} Abschlüsse / Monat</p>}</div><Metric label="Gesamt" value={total}/>
    </div>;
  }
  return <WorkspaceShell active="Rechner" title="Wendico / Rechner"><div className="todo-page pb-10"><h1 className="text-3xl font-semibold">Rechner</h1><Calculator/>
    <section className="mt-7"><h2 className="text-lg font-semibold">Provisionen</h2><p className="mt-1 text-xs text-[var(--muted)]">10 % auf einmalige Einnahmen · ab 3 Abschlüssen je Mitarbeiter und Monat: 50 % Bonus auf die Monatsprovision</p>
      <div className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-0 sm:w-56"><span className="mb-1 block text-xs text-[var(--muted)]">Mitarbeiter</span><select className="field" value={employee} onChange={(event)=>setEmployee(event.target.value)}><option value="all">Alle</option>{[...employees].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <div role="group" aria-label="Zeitraum" className="flex gap-1">{(["month","year","custom"] as const).map((value)=><button key={value} aria-pressed={mode===value} className={mode===value?"filter-active":"filter"} onClick={()=>setMode(value)}>{{month:"Monat",year:"Jahr",custom:"Zeitraum"}[value]}</button>)}</div>
        {mode==="month" && <label><span className="mb-1 block text-xs text-[var(--muted)]">Monat</span><input className="field" type="month" value={month} onChange={(event)=>event.target.value && setMonth(event.target.value)}/></label>}
        {mode==="year" && <label><span className="mb-1 block text-xs text-[var(--muted)]">Jahr</span><input className="field sm:w-28" type="number" min={1900} max={9999} value={year} onChange={(event)=>setYear(event.target.value)}/></label>}
        {mode==="custom" && <><label><span className="mb-1 block text-xs text-[var(--muted)]">Von</span><input type="date" className="field" value={from} onChange={(event)=>setFrom(event.target.value)}/></label><label><span className="mb-1 block text-xs text-[var(--muted)]">Bis</span><input type="date" className="field" value={to} onChange={(event)=>setTo(event.target.value)}/></label></>}
      </div>
      {invalid && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">Bitte einen gültigen Zeitraum auswählen.</p>}{error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>}{notice && <p role="status" className="mt-3 text-xs text-[var(--primary)]">{notice}</p>}
      <div className="my-5 grid grid-cols-2 gap-4 border-y border-[var(--line)] py-4 sm:grid-cols-4"><div><p className="text-xs text-[var(--muted)]">Abschlüsse</p><p className="text-xl font-semibold">{rows.filter((row)=>row.member_id && Number(row.amount)>0).length}</p></div><Metric label="Grundprovision" value={sums.base}/><Metric label="Bonus" value={sums.bonus}/><Metric label="Gesamte Provision" value={sums.total}/></div>
      {rows.map((row)=>customerRow(customers.find((customer)=>customer.customer_id===row.customer_id)!,row.base,row.bonus,row.total,row.closes))}
      {!rows.length && <p className="py-8 text-center text-sm text-[var(--muted)]">{loading?"Provisionen werden geladen...":"Keine Abschlüsse für diese Auswahl."}</p>}
      {assignments.length>0 && <div className="mt-6"><h3 className="text-sm font-semibold">Kunden ohne Abschlussdatum</h3><p className="mt-1 text-xs text-[var(--muted)]">Nicht in der Zeitraumssumme enthalten.</p>{assignments.map((customer)=>customerRow(customer,0,0,0))}</div>}
    </section></div></WorkspaceShell>;
}
function Metric({label,value}:{label:string;value:number}) {return <div className="min-w-0"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 break-words text-base font-semibold tabular-nums">{formatCurrency(value)}</p></div>;}