import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const invoiceStatusLabels = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
} as const;

export function invoiceTotal(items: { quantity: number; unitPrice: number; vatRate: number }[]) {
  const cents = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice * (1 + item.vatRate / 100) * 100), 0);
  return cents / 100;
}

export function formatCurrency(value: number, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", { style: "currency", currency }).format(value);
}

export function recurringExpenseMonthlyAmount(expense: { isRecurring: boolean; amount: number; expenseDate: string; recurringInterval?: "monthly" | "yearly"; recurringStartDate?: string; recurringEndDate?: string }, monthKey: string) {
  if (!expense.isRecurring) return 0;
  const selectedMonth = monthKey.slice(0, 7);
  const startMonth = expense.recurringStartDate?.slice(0, 7);
  const endMonth = expense.recurringEndDate?.slice(0, 7);
  if ((startMonth && selectedMonth < startMonth) || (endMonth && selectedMonth > endMonth)) return 0;
  const month = Number(selectedMonth.slice(5, 7));
  if (expense.recurringInterval === "yearly") {
    const anniversaryMonth = Number((startMonth ?? expense.expenseDate.slice(0, 7)).slice(5, 7));
    return anniversaryMonth === month ? expense.amount : 0;
  }
  return expense.amount;
}

export function customerMonthlyRevenue(customer: { monthlyRevenue: number; monthlyStartDate?: string; monthlyEndDate?: string }, monthKey: string) {
  const month = monthKey.slice(0, 7);
  const startMonth = customer.monthlyStartDate?.slice(0, 7);
  const endMonth = customer.monthlyEndDate?.slice(0, 7);
  if ((startMonth && month < startMonth) || (endMonth && month > endMonth)) return 0;
  return customer.monthlyRevenue;
}

// Local-time date keys; toISOString() shifts to UTC and yields the previous day/month in CET/CEST.
const pad = (value: number) => String(value).padStart(2, "0");
export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const toMonthKey = (date: Date) => toDateKey(date).slice(0, 7);
export const todayKey = () => toDateKey(new Date());
export function addMonths(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  return toMonthKey(new Date(year, month - 1 + offset, 1));
}
export function monthKeysBetween(from: string, to: string) {
  const keys: string[] = [];
  for (let key = from.slice(0, 7); key <= to.slice(0, 7); key = addMonths(key, 1)) keys.push(key);
  return keys;
}
export function lastDayOfMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${monthKey}-${pad(new Date(year, month, 0).getDate())}`;
}