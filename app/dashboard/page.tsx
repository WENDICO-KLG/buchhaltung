"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getCustomers, getExpenses, getInvoices, getMonthlyGoal, getProspects, getSocialMediaOrders, saveMonthlyGoal } from "@/lib/storage";
import { GoalPanel, type GoalForm } from "@/components/dashboard/goal-panel";
import { Hero } from "@/components/dashboard/hero";
import { MonthChart } from "@/components/dashboard/month-chart";
import { PeriodControls } from "@/components/dashboard/period-controls";
import { Pipeline } from "@/components/dashboard/pipeline";
import { Ranking } from "@/components/dashboard/ranking";
import { Receivables } from "@/components/dashboard/receivables";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { dateLabel, monthLabel, Plate, type RangeMode } from "@/components/dashboard/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { canAccessPage, getActiveCompany, getDashboardCommissions } from "@/lib/company";
import type { DashboardCommission } from "@/lib/company";
import { paidSocialMediaExpensesInRange } from "@/lib/social-media";
import type { SocialMediaOrder } from "@/lib/social-media";
import { addMonths, customerOneTimeRevenue, customerRecurringRevenue, invoiceNet, invoiceTotal, lastDayOfMonth, monthKeysBetween, recurringExpenseMonthlyAmount, todayKey } from "@/lib/utils";
import type { Customer, Expense, Invoice, MonthlyGoal, Prospect } from "@/types";

type Range = { from: string; to: string };

const today = todayKey();
const currentMonth = today.slice(0, 7);
const inRange = (date: string, range: Range) => date >= range.from && date <= range.to;
const paidDate = (invoice: Invoice) => invoice.paidAt ?? invoice.issueDate;
const isOverdue = (invoice: Invoice) => invoice.status === "overdue" || (invoice.status === "sent" && invoice.dueDate < today);
// Recurring-covering invoices are already counted via the customer's recurring revenue; other currencies can't be summed into CHF.
const countsAsRevenue = (invoice: Invoice, range: Range) => invoice.status === "paid" && !invoice.coversRecurring && invoice.currency === "CHF" && inRange(paidDate(invoice), range);

function computePeriod(range: Range, invoices: Invoice[], expenses: Expense[], customers: Customer[], commissionRows: DashboardCommission[], socialMediaOrders: SocialMediaOrder[]) {
  const months = monthKeysBetween(range.from, range.to);
  const invoiceRevenue = invoices.filter((invoice) => countsAsRevenue(invoice, range)).reduce((sum, invoice) => sum + invoiceNet(invoice.items), 0);
  const oneTimeRevenue = customers.reduce((sum, customer) => sum + customerOneTimeRevenue(customer, range.from, range.to), 0);
  const recurringByMonth = months.map((key) => customers.reduce((sum, customer) => sum + customerRecurringRevenue(customer, key), 0));
  const recurringCostsByMonth = months.map((key) => expenses.reduce((sum, expense) => sum + recurringExpenseMonthlyAmount(expense, key), 0));
  const recurringRevenue = recurringByMonth.reduce((sum, value) => sum + value, 0);
  const recurringCosts = recurringCostsByMonth.reduce((sum, value) => sum + value, 0);
  const oneTimeCosts = expenses.filter((expense) => !expense.isRecurring && inRange(expense.expenseDate, range)).reduce((sum, expense) => sum + expense.amount, 0) + paidSocialMediaExpensesInRange(socialMediaOrders, range.from, range.to);
  const plannedRevenue = months.reduce((sum, key, index) => key > currentMonth ? sum + recurringByMonth[index] : sum, 0);
  const plannedCosts = months.reduce((sum, key, index) => key > currentMonth ? sum + recurringCostsByMonth[index] : sum, 0);
  const revenue = invoiceRevenue + oneTimeRevenue + recurringRevenue;
  const costs = oneTimeCosts + recurringCosts;
  const commissions = commissionRows.filter((row) => inRange(row.payment_date, range)).reduce((sum, row) => sum + Number(row.total), 0);
  return { revenue, costs, commissions, profit: revenue - costs - commissions, recurringRevenue, recurringCosts, plannedRevenue, plannedCosts };
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [socialMediaOrders, setSocialMediaOrders] = useState<SocialMediaOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [commissions, setCommissions] = useState<DashboardCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>();
  const [error, setError] = useState("");

  const [rangeMode, setRangeMode] = useState<RangeMode>("month");
  const [rangeMonth, setRangeMonth] = useState(currentMonth);
  const [rangeYear, setRangeYear] = useState(Number(today.slice(0, 4)));
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [customTo, setCustomTo] = useState(today);

  const [goalLoad, setGoalLoad] = useState({ month: "", failed: false });
  const [goal, setGoal] = useState<MonthlyGoal>();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalForm>({ revenueTarget: "", expenseBudget: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const goalMonth = rangeMode === "month" ? rangeMonth : currentMonth;

  useEffect(() => {
    Promise.all([getInvoices(), getExpenses(), getCustomers(), getDashboardCommissions(), getSocialMediaOrders()])
      .then(([invoiceData, expenseData, customerData, commissionData, socialMediaData]) => { setInvoices(invoiceData); setExpenses(expenseData); setCustomers(customerData); setCommissions(commissionData); setSocialMediaOrders(socialMediaData); })
      .catch(() => { setLoadFailed(true); setError("Finanzdaten konnten nicht geladen werden."); })
      .finally(() => setLoading(false));
  }, []);

  // Optional extra: the pipeline never blocks or fails the finance figures.
  useEffect(() => {
    let cancelled = false;
    getActiveCompany()
      .then((company) => company && canAccessPage(company, "prospects") ? getProspects() : undefined)
      .then((data) => { if (!cancelled) setProspects(data); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMonthlyGoal(goalMonth)
      .then((data) => {
        if (cancelled) return;
        setGoal(data);
        setGoalLoad({ month: goalMonth, failed: false });
        setEditingGoal(false);
        setGoalForm({ revenueTarget: data?.revenueTarget.toString() ?? "", expenseBudget: data?.expenseBudget.toString() ?? "", notes: data?.notes ?? "" });
      })
      .catch(() => { if (cancelled) return; setGoal(undefined); setEditingGoal(false); setGoalLoad({ month: goalMonth, failed: true }); setError("Monatsziel konnte nicht geladen werden."); });
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

  const metrics = useMemo(() => computePeriod(range, invoices, expenses, customers, commissions, socialMediaOrders), [range, invoices, expenses, customers, commissions, socialMediaOrders]);
  const previous = useMemo(() => previousRange && computePeriod(previousRange, invoices, expenses, customers, commissions, socialMediaOrders), [previousRange, invoices, expenses, customers, commissions, socialMediaOrders]);
  const goalMetrics = useMemo(() => computePeriod({ from: `${goalMonth}-01`, to: lastDayOfMonth(goalMonth) }, invoices, expenses, customers, commissions, socialMediaOrders), [goalMonth, invoices, expenses, customers, commissions, socialMediaOrders]);

  const receivables = useMemo(() => {
    const open = invoices.filter(({ status }) => status === "sent" || status === "overdue");
    const overdue = open.filter(isOverdue);
    return { openCount: open.length, openAmount: open.filter((invoice) => invoice.currency === "CHF").reduce((sum, invoice) => sum + invoiceTotal(invoice.items), 0), overdueCount: overdue.length, overdueAmount: overdue.filter((invoice) => invoice.currency === "CHF").reduce((sum, invoice) => sum + invoiceTotal(invoice.items), 0) };
  }, [invoices]);

  const overdueInvoices = useMemo(() => invoices.filter((invoice) => (invoice.status === "sent" || invoice.status === "overdue") && isOverdue(invoice)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [invoices]);

  const foreignCurrencyCount = useMemo(() => invoices.filter((invoice) => invoice.status === "paid" && invoice.currency !== "CHF" && inRange(paidDate(invoice), range)).length, [invoices, range]);

  const chartData = useMemo(() => {
    const keys = rangeMode === "month" ? Array.from({ length: 6 }, (_, index) => addMonths(rangeMonth, index - 5)) : monthKeysBetween(range.from, range.to);
    return keys.map((key) => {
      const monthRange = rangeMode === "custom" ? { from: key === keys[0] ? range.from : `${key}-01`, to: key === keys[keys.length - 1] ? range.to : lastDayOfMonth(key) } : { from: `${key}-01`, to: lastDayOfMonth(key) };
      const values = computePeriod(monthRange, invoices, expenses, customers, commissions, socialMediaOrders);
      return { month: new Date(`${key}-01T12:00:00`).toLocaleDateString("de-CH", { month: "short", year: keys.length > 12 || rangeMode === "custom" ? "2-digit" : undefined }), Einnahmen: values.revenue, Ausgaben: values.costs, Provisionen: values.commissions, "Netto Gewinn": values.profit };
    });
  }, [rangeMode, rangeMonth, range, invoices, expenses, customers, commissions, socialMediaOrders]);

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
    const socialMediaCosts = paidSocialMediaExpensesInRange(socialMediaOrders, range.from, range.to);
    if (socialMediaCosts > 0) totals.set("Ayleen Social Media", (totals.get("Ayleen Social Media") ?? 0) + socialMediaCosts);
    return [...totals].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [range, expenses, socialMediaOrders]);

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
    {error && <div role="alert" className="tile mb-6 flex items-center gap-3 px-5 py-3.5 text-sm text-[var(--coral)]"><CircleAlert aria-hidden size={18} strokeWidth={1.6} className="flex-none"/>{error}</div>}

    <PageHeader className="max-xl:!flex-col max-xl:!items-stretch max-xl:[&>:last-child]:!justify-start" title="Übersicht" subtitle={periodLabel} actions={<PeriodControls mode={rangeMode} onMode={setRangeMode} month={rangeMonth} onMonth={setRangeMonth} year={rangeYear} from={customFrom} onFrom={setCustomFrom} to={customTo} onTo={setCustomTo} onShift={shiftPeriod}
      onToday={(rangeMode === "month" && rangeMonth !== currentMonth) || (rangeMode === "year" && rangeYear !== Number(today.slice(0, 4))) ? () => { setRangeMonth(currentMonth); setRangeYear(Number(today.slice(0, 4))); } : undefined}/>}/>

    <div className="mt-7 grid grid-cols-1 gap-5 md:gap-6">
      {loadFailed ? <Plate><EmptyState icon={CircleAlert} title="Keine Zahlen verfügbar" text="Die Finanzdaten konnten nicht geladen werden." action={<button onClick={() => window.location.reload()} className="action">Neu laden</button>}/></Plate> : <>
        <div className="grid grid-cols-1 gap-5 md:gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
          <Hero metrics={metrics} previous={previous} comparisonLabel={comparisonLabel} loading={loading} margin={margin} periodLabel={periodLabel} mode={rangeMode} month={rangeMonth} year={rangeYear} onShift={shiftPeriod}
            note={foreignCurrencyCount > 0 ? `${foreignCurrencyCount} bezahlte Rechnung${foreignCurrencyCount === 1 ? "" : "en"} in Fremdwährung im Zeitraum – nicht im CHF-Umsatz enthalten.` : undefined}/>
          <GoalPanel month={goalMonth} goal={goal} revenue={goalMetrics.revenue} costs={goalMetrics.costs} loading={loading || goalLoad.month !== goalMonth} failed={goalLoad.failed} editing={editingGoal} onEditing={setEditingGoal} form={goalForm} onForm={setGoalForm} saving={saving} onSubmit={submitGoal}/>
        </div>
        <div className="grid grid-cols-1 gap-5 md:gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
          <div className="grid min-w-0 grid-cols-1 max-xl:order-2"><MonthChart data={chartData} subtitle={rangeMode === "month" ? "Letzte 6 Monate" : "Pro Monat im Zeitraum"} highlightLast={rangeMode === "month"} loading={loading}/></div>
          <Receivables totals={receivables} overdue={overdueInvoices} today={today} loading={loading}/>
        </div>
      </>}
      {prospects && <Pipeline prospects={prospects} month={currentMonth}/>}
      {!loadFailed && <div className="grid grid-cols-1 gap-5 md:gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <Plate className="grid h-full grid-cols-1 gap-9 lg:grid-cols-2 lg:gap-0 lg:[&>:first-child]:border-r lg:[&>:first-child]:border-[var(--line)] lg:[&>:first-child]:pr-7 lg:[&>:last-child]:pl-7">
          <Ranking title="Einnahmen nach Kunde" subtitle={periodLabel} rows={revenueByCustomer} kind="income" empty="Keine Einnahmen im Zeitraum." href="/customers" loading={loading}/>
          <Ranking title="Ausgaben nach Posten" subtitle={periodLabel} rows={costsByVendor} kind="cost" empty="Keine Ausgaben im Zeitraum." href="/analytics" loading={loading}/>
        </Plate>
        <RecentInvoices invoices={recent} isOverdue={isOverdue} loading={loading}/>
      </div>}
    </div>
  </div></WorkspaceShell>;
}
