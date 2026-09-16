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