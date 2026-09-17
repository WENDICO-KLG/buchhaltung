export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type ProspectStatus = "new" | "contacted" | "meeting" | "offer" | "won" | "lost";
export type WorkspaceModule = "projects" | "ideas" | "tasks" | "offers" | "people" | "commissions" | "leads" | "operations";
export type WorkspacePriority = "low" | "medium" | "high";
export type TodoStatus = "not_started" | "in_progress" | "done";

export interface Todo {
    id: string;
    title: string;
    notes?: string;
    status: TodoStatus;
    dueDate?: string;
    customerId?: string;
    prospectId?: string;
    createdAt: string;
    updatedAt: string;
  }

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }

export interface Invoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail?: string;
    customerAddress?: string;
    issueDate: string;
    dueDate: string;
    status: InvoiceStatus;
    currency: string;
    items: InvoiceItem[];
    notes?: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
  }

export type RecurringInterval = "monthly" | "yearly";

export interface Expense {
    id: string;
    vendor: string;
    description: string;
    amount: number;
    currency: string;
    expenseDate: string;
    isRecurring: boolean;
    recurringInterval?: RecurringInterval;
    createdAt: string;
    updatedAt: string;
  }

export interface Document {
    id: string;
    name: string;
    documentDate: string;
    fileName?: string;
    storagePath?: string;
    fileType?: string;
    fileSize?: number;
    createdAt: string;
  }

export interface CompanyProfile {
    companyName: string;
    ownerName: string;
    email: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country: string;
    website?: string;
    vatNumber?: string;
    iban?: string;
    defaultCurrency: string;
    defaultVatRate: number;
}

  export interface Customer {
    id: string;
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    project?: string;
    monthlyRevenue: number;
    oneTimeRevenue: number;
    notes?: string;
    logoUrl?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Prospect {
    id: string;
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    source?: string;
    status: ProspectStatus;
    lastContactAt?: string;
    nextTask?: string;
    nextTaskAt?: string;
    estimatedValue?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  }

export interface WorkspaceItem {
  id: string;
  module: WorkspaceModule;
  title: string;
  subtitle?: string;
  description?: string;
  status: string;
  priority: WorkspacePriority;
  owner?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  amount?: number;
  startDate?: string;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceFile {
  id: string;
  itemId: string;
  name: string;
  storagePath: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
}

export interface MonthlyGoal {
  id: string;
  month: string;
  revenueTarget: number;
  recurringRevenueTarget: number;
  expenseBudget: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}