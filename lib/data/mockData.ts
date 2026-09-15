import type { Expense, Invoice } from "@/types";

export const mockInvoices: Invoice[] = [
  { id: "inv-01", invoiceNumber: "2026-001", customerName: "Pangea Wealth", issueDate: "2026-09-01", dueDate: "2026-09-15", status: "paid", currency: "CHF", items: [{ id: "item-1", description: "Webdesign und Entwicklung", quantity: 1, unitPrice: 4200, vatRate: 0 }], paidAt: "2026-09-12", createdAt: "2026-09-01", updatedAt: "2026-09-12" },
  { id: "inv-02", invoiceNumber: "2026-002", customerName: "Ayleen Podgorny", issueDate: "2026-09-05", dueDate: "2026-09-19", status: "sent", currency: "CHF", items: [{ id: "item-2", description: "Website-Paket", quantity: 1, unitPrice: 1800, vatRate: 0 }], createdAt: "2026-09-05", updatedAt: "2026-09-05" },
  { id: "inv-03", invoiceNumber: "2026-003", customerName: "Janik Plätscher", issueDate: "2026-09-08", dueDate: "2026-09-22", status: "draft", currency: "CHF", items: [{ id: "item-3", description: "Wartung und Content-System", quantity: 1, unitPrice: 950, vatRate: 0 }], createdAt: "2026-09-08", updatedAt: "2026-09-08" },
];

export const mockExpenses: Expense[] = [
  { id: "exp-01", vendor: "Vercel", description: "Hosting", amount: 24, currency: "CHF", expenseDate: "2026-09-02", createdAt: "2026-09-02", updatedAt: "2026-09-02" },
  { id: "exp-02", vendor: "Adobe", description: "Creative Cloud", amount: 65.45, currency: "CHF", expenseDate: "2026-09-03", createdAt: "2026-09-03", updatedAt: "2026-09-03" },
];
