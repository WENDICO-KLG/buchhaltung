"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, UserRound } from "lucide-react";
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
  const selectionLabel = invalid ? "Ungültiger Zeitraum" : mode === "month" ? new Date(`${month}-01T12:00:00`).toLocaleDateString("de-CH", { month: "long", year: "numeric" }) : mode === "year" ? `Jahr ${year}` : `${new Date(`${start}T12:00:00`).toLocaleDateString("de-CH")} bis ${new Date(`${end}T12:00:00`).toLocaleDateString("de-CH")}`;
  async function assign(customer: CommissionCustomer, member: string) {
    if(!company)return;
    setBusy(customer.customer_id);setError("");setNotice("");
    try {await setCustomerCommission(company.company_id,customer.customer_id,member,10);setCustomers(await getCommissionCustomers(company.company_id));setNotice("Mitarbeiterzuordnung gespeichert.");}
    catch(cause){setError(cause instanceof Error ? cause.message : "Zuordnung konnte nicht gespeichert werden.");}
    finally{setBusy(undefined);}
  }
  function customerRow(customer: CommissionCustomer, base: number, bonus: number, total: number, closes?: number) {
    return <article key={customer.customer_id} aria-busy={busy === customer.customer_id} className="flex min-w-0 flex-col rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 break-words text-base font-semibold [overflow-wrap:anywhere]">{customer.company_name}</h3>{bonus > 0 && <span title="Monatsbonus erreicht" className="flex shrink-0 items-center gap-1 rounded bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-[var(--primary)]"><CheckCircle2 size={13}/>+50 %</span>}</div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">{customer.payment_date ? <CalendarDays size={13}/> : <Clock3 size={13}/>}<span>{customer.payment_date ? new Date(`${customer.payment_date}T12:00:00`).toLocaleDateString("de-CH") : "Ohne Abschlussdatum"}</span></div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-[var(--muted)]">Einmaliger Umsatz</span><span className="font-semibold tabular-nums">{formatCurrency(Number(customer.amount))}</span></div>
      <div className="mt-4">{manage ? <label className="block min-w-0"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]"><UserRound size={13}/>Mitarbeiter<span className="sr-only"> für {customer.company_name}</span></span><select value={customer.member_id ?? ""} disabled={Boolean(busy)} onChange={(event)=>void assign(customer,event.target.value)} className="field text-sm"><option value="">Nicht zugeteilt</option>{members.filter((person)=>person.role!=="viewer").map((person)=><option key={person.user_id} value={person.user_id}>{companyMemberName(person)}</option>)}</select></label> : <div><p className="text-xs text-[var(--muted)]">Mitarbeiter</p><p className="mt-1 break-words text-sm font-semibold">{customer.member_name ?? "Nicht zugeteilt"}</p></div>}</div>
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-4"><Metric label="Grundprovision · 10 %" value={base}/><Metric label="Monatsbonus" value={bonus}/></div>
      <p className="mt-2 min-h-5 text-xs text-[var(--muted)]">{busy === customer.customer_id ? "Zuordnung wird gespeichert..." : closes !== undefined && customer.member_id ? `${closes} Abschlüsse im Monat${closes < 3 ? ` · noch ${3 - closes} bis zum Bonus` : " · Bonus erreicht"}` : !customer.payment_date ? "Außerhalb der Zeitraumssumme" : "Noch keinem Mitarbeiter zugeteilt"}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4"><span className="text-sm font-semibold">Gesamtprovision</span><span className="text-xl font-semibold tabular-nums text-[var(--primary)]">{formatCurrency(total)}</span></div>
    </article>;
  }
  return <WorkspaceShell active="Rechner" title="Wendico / Rechner"><div className="todo-page pb-10"><h1 className="text-3xl font-semibold">Rechner</h1><Calculator/>
    <section className="mt-7" aria-label="Provisionen"><div className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-xl font-semibold">Provisionen</h2><p className="text-sm text-[var(--muted)]">{selectionLabel} · {employee === "all" ? "Alle Mitarbeiter" : employees.get(employee)}</p></div>
      <div className="mt-5 flex flex-wrap items-end gap-4 border-y border-[var(--line)] py-4"><label className="min-w-0 flex-1 sm:min-w-48 sm:max-w-72"><span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Mitarbeiter</span><select className="field" value={employee} onChange={(event)=>setEmployee(event.target.value)}><option value="all">Alle</option>{[...employees].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <div><span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Ansicht</span><div role="group" aria-label="Zeitraum" className="flex min-h-11 items-center gap-1">{(["month","year","custom"] as const).map((value)=><button key={value} aria-pressed={mode===value} className={mode===value?"filter-active":"filter"} onClick={()=>setMode(value)}>{{month:"Monat",year:"Jahr",custom:"Zeitraum"}[value]}</button>)}</div></div>
        {mode==="month" && <label><span className="mb-1 block text-xs text-[var(--muted)]">Monat</span><input className="field" type="month" value={month} onChange={(event)=>event.target.value && setMonth(event.target.value)}/></label>}
        {mode==="year" && <label><span className="mb-1 block text-xs text-[var(--muted)]">Jahr</span><input className="field sm:w-28" type="number" min={1900} max={9999} value={year} onChange={(event)=>setYear(event.target.value)}/></label>}
        {mode==="custom" && <><label><span className="mb-1 block text-xs text-[var(--muted)]">Von</span><input type="date" className="field" value={from} onChange={(event)=>setFrom(event.target.value)}/></label><label><span className="mb-1 block text-xs text-[var(--muted)]">Bis</span><input type="date" className="field" value={to} onChange={(event)=>setTo(event.target.value)}/></label></>}
      </div>
      {invalid && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">Bitte einen gültigen Zeitraum auswählen.</p>}{error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>}{notice && <p role="status" className="mt-3 text-xs text-[var(--primary)]">{notice}</p>}
      <div className="my-6 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4"><div><p className="text-xs text-[var(--muted)]">Abschlüsse</p><p className="mt-1 text-2xl font-semibold tabular-nums">{rows.filter((row)=>row.member_id && Number(row.amount)>0).length}</p></div><Metric label="Grundprovision · 10 %" value={sums.base}/><Metric label="Monatsbonus" value={sums.bonus}/><div className="border-l-2 border-[var(--primary)] pl-4"><p className="text-xs font-semibold text-[var(--primary)]">Gesamte Provision</p><p className="mt-1 break-words text-2xl font-semibold tabular-nums">{formatCurrency(sums.total)}</p></div></div>
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Kunden im Zeitraum</h3><span className="text-xs text-[var(--muted)]">{rows.length} Kunden</span></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row)=>customerRow(customers.find((customer)=>customer.customer_id===row.customer_id)!,row.base,row.bonus,row.total,row.closes))}</div>
      {!rows.length && <p className="rounded-lg border border-dashed border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">{loading?"Provisionen werden geladen...":"Keine Abschlüsse für diese Auswahl."}</p>}
      {assignments.length>0 && <div className="mt-8 border-t border-[var(--line)] pt-6"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Ohne Abschlussdatum</h3><span className="text-xs text-[var(--muted)]">{assignments.length} Kunden · nicht in der Summe</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{assignments.map((customer)=>customerRow(customer,0,0,0))}</div></div>}
    </section></div></WorkspaceShell>;
}
function Metric({label,value}:{label:string;value:number}) {return <div className="min-w-0"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 break-words text-base font-semibold tabular-nums">{formatCurrency(value)}</p></div>;}