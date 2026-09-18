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
  const startMonth = (expense.recurringStartDate ?? expense.expenseDate).slice(0, 7);
  const endMonth = expense.recurringEndDate?.slice(0, 7);
  if (selectedMonth < startMonth || (endMonth && selectedMonth > endMonth)) return 0;
  const month = Number(selectedMonth.slice(5, 7));
  if (expense.recurringInterval === "yearly") {
    const anniversaryMonth = Number(startMonth.slice(5, 7));
    return anniversaryMonth === month ? expense.amount : 0;
  }
  return expense.amount;
}