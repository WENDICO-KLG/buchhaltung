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
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (1 + item.vatRate / 100), 0);
}

export function formatCurrency(value: number, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", { style: "currency", currency }).format(value);
}