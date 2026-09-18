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

export function recurringExpenseMonthlyAmount(expense: { isRecurring: boolean; amount: number; recurringInterval?: "monthly" | "yearly"; recurringStartDate?: string; recurringEndDate?: string }, monthKey: string) {
  if (!expense.isRecurring) return 0;
  const monthStart = `${monthKey}-01`;
  const [year, month] = monthKey.split("-").map(Number);
  const monthEnd = `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  if (expense.recurringStartDate && expense.recurringStartDate > monthEnd) return 0;
  if (expense.recurringEndDate && expense.recurringEndDate < monthStart) return 0;
  return expense.recurringInterval === "yearly" ? expense.amount / 12 : expense.amount;
}