"use client";

import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
import { Calculator } from "@/components/calculator";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Amount, Stat } from "@/components/ui/stat";
import { companyMemberName, getActiveCompany, getCommissionCustomers, getCompanyMembers, setCustomerCommission } from "@/lib/company";
import type { CommissionCustomer, CompanyMember, CompanyMembership } from "@/lib/company";
import { commissionBreakdown } from "@/lib/calculator";
import { formatCurrency, lastDayOfMonth, todayKey } from "@/lib/utils";

const dateInput = "money min-h-10 w-full min-w-0 rounded-full bg-transparent px-3 text-center text-sm font-medium text-[var(--ink)] focus-visible:-outline-offset-2 pointer-coarse:min-h-11";

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
    const pending = busy === customer.customer_id;
    return <article key={customer.customer_id} aria-busy={pending} className="grid min-w-0 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2 md:px-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.9fr)_minmax(0,1.15fr)_minmax(0,1.1fr)] xl:items-center">
      <div className="min-w-0"><h4 className="break-words font-semibold leading-snug [overflow-wrap:anywhere]">{customer.company_name}</h4><p className="mt-1 text-[13px] text-[var(--muted)]">{customer.payment_date ? new Date(`${customer.payment_date}T12:00:00`).toLocaleDateString("de-CH") : "Ohne Abschlussdatum"}</p><p className="mt-2 flex items-baseline justify-between gap-3 text-sm xl:block"><span className="text-[var(--muted)]">Einmaliger Umsatz </span><span className="money whitespace-nowrap font-semibold">{formatCurrency(Number(customer.amount))}</span></p></div>
      <div className="min-w-0">{manage ? <label className="block min-w-0"><span className="mb-2 block text-[13px] text-[var(--muted)]">Mitarbeiter<span className="sr-only"> für {customer.company_name}</span></span><select value={customer.member_id ?? ""} disabled={Boolean(busy)} onChange={(event)=>void assign(customer,event.target.value)} className="field text-sm"><option value="">Nicht zugeteilt</option>{members.filter((person)=>person.role!=="viewer").map((person)=><option key={person.user_id} value={person.user_id}>{companyMemberName(person)}</option>)}</select></label> : <div><p className="text-[13px] text-[var(--muted)]">Mitarbeiter</p><p className="mt-1 break-words text-sm font-semibold">{customer.member_name ?? "Nicht zugeteilt"}</p></div>}</div>
      <dl className="grid min-w-0 gap-1.5 text-sm">{([["Grundprovision · 10 %", base], ["Monatsbonus", bonus]] as const).map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-3"><dt className="text-[var(--muted)]">{label}{label === "Monatsbonus" && bonus > 0 && <span title="Monatsbonus erreicht" className="ml-2 inline-flex items-center gap-1.5 text-[var(--ink)]"><span aria-hidden className="dot dot-on"/>+50 %</span>}</dt><dd className="money whitespace-nowrap font-semibold">{formatCurrency(value)}</dd></div>)}</dl>
      <div className="min-w-0 border-t border-[var(--line)] pt-4 xl:border-0 xl:pt-0 xl:text-right"><div className="flex items-baseline justify-between gap-3 xl:block"><p className="text-[13px] text-[var(--muted)]">Gesamtprovision</p><p className="money mt-1 whitespace-nowrap text-xl font-medium tracking-tight">{formatCurrency(total)}</p></div>
        <p className="mt-1.5 text-balance text-[13px] text-[var(--muted)]">{pending ? "Zuordnung wird gespeichert..." : closes !== undefined && customer.member_id ? `${closes} Abschlüsse im Monat${closes < 3 ? ` · noch ${3 - closes} bis zum Bonus` : " · Bonus erreicht"}` : !customer.payment_date ? "Außerhalb der Zeitraumssumme" : "Noch keinem Mitarbeiter zugeteilt"}</p>
        {!pending && closes !== undefined && customer.member_id && closes < 3 && <ProgressBar className="mt-2.5" value={closes} max={3} label="Abschlüsse bis zum Monatsbonus"/>}</div>
    </article>;
  }
  return <WorkspaceShell active="Rechner" title="Wendico / Rechner"><div className="todo-page page-enter"><PageHeader title="Rechner"/><Calculator/>
    <section className="mt-12" aria-label="Provisionen"><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h2 className="text-xl font-semibold">Provisionen</h2><p className="text-sm text-[var(--muted)]">{selectionLabel} · {employee === "all" ? "Alle Mitarbeiter" : employees.get(employee)}</p></div>
      <div className="mt-6 flex flex-wrap items-center gap-3"><label className="min-w-0 max-sm:w-full sm:w-48 xl:w-56"><span className="sr-only">Mitarbeiter</span><select className="field !min-h-12 rounded-full" value={employee} onChange={(event)=>setEmployee(event.target.value)}><option value="all">Alle Mitarbeiter</option>{[...employees].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <div role="group" aria-label="Zeitraum" className="pill-track max-sm:w-full [&>button]:max-sm:flex-1">{(["month","year","custom"] as const).map((value)=><button key={value} aria-pressed={mode===value} className={mode===value?"filter-active":"filter"} onClick={()=>setMode(value)}>{{month:"Monat",year:"Jahr",custom:"Zeitraum"}[value]}</button>)}</div>
        <div className="pill-track max-sm:w-full">{mode==="month" && <label className="min-w-0 flex-1"><span className="sr-only">Monat</span><input className={dateInput} type="month" value={month} onChange={(event)=>event.target.value && setMonth(event.target.value)}/></label>}
          {mode==="year" && <label className="min-w-0 flex-1"><span className="sr-only">Jahr</span><input className={`${dateInput} sm:w-28`} type="number" min={1900} max={9999} value={year} onChange={(event)=>setYear(event.target.value)}/></label>}
          {mode==="custom" && <><label className="min-w-0 flex-1"><span className="sr-only">Von</span><input type="date" className={dateInput} value={from} onChange={(event)=>setFrom(event.target.value)}/></label><span aria-hidden className="text-[13px] text-[var(--muted)]">bis</span><label className="min-w-0 flex-1"><span className="sr-only">Bis</span><input type="date" className={dateInput} value={to} onChange={(event)=>setTo(event.target.value)}/></label></>}</div>
      </div>
      {invalid && <p role="alert" className="mt-4 text-sm text-[var(--coral)]">Bitte einen gültigen Zeitraum auswählen.</p>}{error && <p role="alert" className="mt-4 text-sm text-[var(--coral)]">{error}</p>}{notice && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[var(--ink)]"><span aria-hidden className="dot dot-on"/>{notice}</p>}
      <div className="panel mt-5 overflow-hidden">
        <div className="p-6 md:p-9"><Stat size="lg" tone="positive" label="Gesamte Provision" value={loading ? "–" : <Amount value={sums.total}/>}/>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-[var(--line)] pt-6 sm:grid-cols-3 [&_.money]:whitespace-nowrap max-sm:[&_.money]:text-xl"><Stat label="Grundprovision · 10 %" value={loading ? "–" : formatCurrency(sums.base)}/><Stat label="Monatsbonus" value={loading ? "–" : formatCurrency(sums.bonus)}/><Stat label="Abschlüsse" value={loading ? "–" : rows.filter((row)=>row.member_id && Number(row.amount)>0).length}/></div></div>
      </div>
      <div className="panel mt-5 overflow-hidden"><div className="flex items-baseline justify-between gap-3 px-5 pb-4 pt-6 md:px-7"><h3 className="text-base font-semibold">Kunden im Zeitraum</h3><span className="text-[13px] text-[var(--muted)]">{rows.length} Kunden</span></div>
        <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">{rows.map((row)=>customerRow(customers.find((customer)=>customer.customer_id===row.customer_id)!,row.base,row.bonus,row.total,row.closes))}
        {!rows.length && (loading ? <div className="grid gap-4 p-6"><p className="sr-only">Provisionen werden geladen...</p><Skeleton className="h-16"/><Skeleton className="h-16"/></div> : <EmptyState icon={Handshake} title="Keine Abschlüsse für diese Auswahl."/>)}</div></div>
      {assignments.length>0 && <div className="panel mt-5 overflow-hidden"><div className="flex flex-wrap items-baseline justify-between gap-x-3 px-5 pb-4 pt-6 md:px-7"><h3 className="text-base font-semibold">Ohne Abschlussdatum</h3><span className="text-[13px] text-[var(--muted)]">{assignments.length} Kunden · nicht in der Summe</span></div><div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">{assignments.map((customer)=>customerRow(customer,0,0,0))}</div></div>}
    </section></div></WorkspaceShell>;
}
