import { supabase } from "@/lib/supabase";
import type { CompanyProfile, Customer, Document, Expense, Invoice, MonthlyGoal, Prospect, Todo, TodoComment, WorkspaceFile, WorkspaceItem, WorkspaceModule } from "@/types";

type InvoiceRow = { id: string; user_id: string; invoice_number: string; customer_name: string; customer_email?: string; customer_address?: string; issue_date: string; due_date: string; status: Invoice["status"]; currency: string; items: Invoice["items"]; notes?: string; paid_at?: string; created_at: string; updated_at: string };

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du musst angemeldet sein.");
  return data.user.id;
}

function databaseError(error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  void error;
  return new Error("Die Aktion konnte nicht ausgeführt werden. Bitte versuche es erneut.");
}

const newId = (kind: string) => `${kind}-${crypto.randomUUID()}`;

const invoiceFromRow = (row: InvoiceRow): Invoice => ({ id: row.id, invoiceNumber: row.invoice_number, customerName: row.customer_name, customerEmail: row.customer_email, customerAddress: row.customer_address, issueDate: row.issue_date, dueDate: row.due_date, status: row.status, currency: row.currency, items: row.items ?? [], notes: row.notes, paidAt: row.paid_at, createdAt: row.created_at, updatedAt: row.updated_at });
const invoiceToRow = (invoice: Invoice, userId: string): InvoiceRow => ({ id: invoice.id, user_id: userId, invoice_number: invoice.invoiceNumber, customer_name: invoice.customerName, customer_email: invoice.customerEmail, customer_address: invoice.customerAddress, issue_date: invoice.issueDate, due_date: invoice.dueDate, status: invoice.status, currency: invoice.currency, items: invoice.items, notes: invoice.notes, paid_at: invoice.paidAt, created_at: invoice.createdAt, updated_at: invoice.updatedAt });
function validateInvoice(invoice: Pick<Invoice, "invoiceNumber" | "customerName" | "issueDate" | "dueDate" | "items">) {
  if (!invoice.invoiceNumber.trim() || !invoice.customerName.trim()) throw new Error("Rechnungsnummer und Kunde sind erforderlich.");
  if (invoice.dueDate < invoice.issueDate) throw new Error("Das Fälligkeitsdatum darf nicht vor dem Rechnungsdatum liegen.");
  if (!invoice.items.length || invoice.items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0 || item.vatRate < 0 || item.vatRate > 100)) throw new Error("Bitte prüfe die Rechnungspositionen und Beträge.");
}

export async function getInvoices(): Promise<Invoice[]> { const userId = await currentUserId(); const { data, error } = await supabase.from("invoices").select("*").eq("user_id", userId).order("issue_date", { ascending: false }); if (error) throw databaseError(error); return (data as InvoiceRow[] ?? []).map(invoiceFromRow); }
export async function getInvoice(id: string) { const userId = await currentUserId(); const { data, error } = await supabase.from("invoices").select("*").eq("id", id).eq("user_id", userId).maybeSingle(); if (error) throw databaseError(error); return data ? invoiceFromRow(data as InvoiceRow) : undefined; }
export async function createInvoice(input: Omit<Invoice, "id" | "createdAt" | "updatedAt">) { validateInvoice(input); const userId = await currentUserId(); const now = new Date().toISOString().slice(0, 10); const invoice: Invoice = { ...input, id: newId("invoice"), createdAt: now, updatedAt: now }; const { error } = await supabase.from("invoices").insert(invoiceToRow(invoice, userId)); if (error) throw databaseError(error); return invoice; }
export async function updateInvoice(id: string, changes: Partial<Invoice>) { const userId = await currentUserId(); const current = await getInvoice(id); if (!current) return undefined; const invoice: Invoice = { ...current, ...changes, updatedAt: new Date().toISOString().slice(0, 10) }; validateInvoice(invoice); const { error } = await supabase.from("invoices").update(invoiceToRow(invoice, userId)).eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); return invoice; }
export async function deleteInvoice(id: string) { const userId = await currentUserId(); const { error } = await supabase.from("invoices").delete().eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }

export async function getExpenses(): Promise<Expense[]> { const userId = await currentUserId(); const { data, error } = await supabase.from("expenses").select("*").eq("user_id", userId).order("expense_date", { ascending: false }); if (error) throw databaseError(error); return (data ?? []).map((row) => ({ id: row.id, vendor: row.vendor, description: row.description, amount: Number(row.amount), currency: row.currency, expenseDate: row.expense_date, isRecurring: row.is_recurring ?? false, recurringInterval: row.recurring_interval ?? undefined, recurringStartDate: row.recurring_start_date ?? undefined, recurringEndDate: row.recurring_end_date ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at })); }
export async function createExpense(input: Omit<Expense, "id" | "createdAt" | "updatedAt">) { const userId = await currentUserId(); const now = new Date().toISOString().slice(0, 10); const expense: Expense = { ...input, id: newId("expense"), createdAt: now, updatedAt: now }; const { error } = await supabase.from("expenses").insert({ id: expense.id, user_id: userId, vendor: expense.vendor, description: expense.description, amount: expense.amount, currency: expense.currency, expense_date: expense.expenseDate, is_recurring: expense.isRecurring, recurring_interval: expense.isRecurring ? expense.recurringInterval : null, recurring_start_date: expense.isRecurring ? expense.recurringStartDate || null : null, recurring_end_date: expense.isRecurring ? expense.recurringEndDate || null : null, created_at: now, updated_at: now }); if (error) throw databaseError(error); return expense; }
export async function updateExpense(id: string, changes: Partial<Expense>) { const userId = await currentUserId(); const payload: Record<string, unknown> = { updated_at: new Date().toISOString().slice(0, 10) }; if ("vendor" in changes) payload.vendor = changes.vendor; if ("description" in changes) payload.description = changes.description; if ("amount" in changes) payload.amount = changes.amount; if ("expenseDate" in changes) payload.expense_date = changes.expenseDate; if ("isRecurring" in changes) payload.is_recurring = changes.isRecurring; if ("recurringInterval" in changes) payload.recurring_interval = changes.isRecurring === false ? null : changes.recurringInterval ?? null; if ("recurringStartDate" in changes) payload.recurring_start_date = changes.isRecurring === false ? null : changes.recurringStartDate || null; if ("recurringEndDate" in changes) payload.recurring_end_date = changes.isRecurring === false ? null : changes.recurringEndDate || null; const { error } = await supabase.from("expenses").update(payload).eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }
export async function deleteExpense(id: string) { const userId = await currentUserId(); const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }

export async function getDocuments(): Promise<Document[]> { const userId = await currentUserId(); const { data, error } = await supabase.from("documents").select("*").eq("user_id", userId).order("document_date", { ascending: false }); if (error) throw databaseError(error); return (data ?? []).map((row) => ({ id: row.id, name: row.name, documentDate: row.document_date, fileName: row.file_name, storagePath: row.storage_path, fileType: row.file_type, fileSize: row.file_size, createdAt: row.created_at })); }
export async function uploadDocument(input: { name: string; documentDate: string }, file: File) { const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]); if (!allowedTypes.has(file.type)) throw new Error("Erlaubt sind PDF-, PNG-, JPG- und WebP-Dateien."); if (file.size > 10 * 1024 * 1024) throw new Error("Die Datei darf maximal 10 MB groß sein."); const userId = await currentUserId(); const id = newId("document"); const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin"; const path = `${userId}/${id}/file.${extension || "bin"}`; const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, { upsert: false, contentType: file.type }); if (uploadError) throw databaseError(uploadError); const document: Document = { ...input, id, fileName: file.name.slice(0, 180), fileType: file.type, fileSize: file.size, storagePath: path, createdAt: new Date().toISOString().slice(0, 10) }; const { error } = await supabase.from("documents").insert({ id, user_id: userId, name: document.name, document_date: document.documentDate, file_name: document.fileName, storage_path: path, file_type: document.fileType, file_size: document.fileSize, created_at: document.createdAt }); if (error) { await supabase.storage.from("documents").remove([path]); throw databaseError(error); } return document; }
export async function getDocumentUrl(path: string) { const userId = await currentUserId(); if (!path.startsWith(`${userId}/`) || path.includes("..")) throw new Error("Ungültiger Dokumentpfad."); const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60); if (error) throw databaseError(error); return data.signedUrl; }

export async function savePushSubscription(subscription: PushSubscription) {
  const userId = await currentUserId();
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Das Push-Abonnement ist unvollständig.");
  const { error } = await supabase.from("push_subscriptions").upsert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: "user_id,endpoint" });
  if (error) throw databaseError(error);
}

export async function deletePushSubscription(endpoint: string) {
  const userId = await currentUserId();
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  if (error) throw databaseError(error);
}

const emptyProfile: CompanyProfile = { companyName: "Wendico KLG", ownerName: "", email: "", country: "Schweiz", defaultCurrency: "CHF", defaultVatRate: 0 };
export async function getCompanyProfile(): Promise<CompanyProfile> { const userId = await currentUserId(); const { data, error } = await supabase.from("company_profiles").select("*").eq("user_id", userId).maybeSingle(); if (error) throw databaseError(error); if (!data) return emptyProfile; return { companyName: data.company_name, ownerName: data.owner_name, email: data.email, phone: data.phone, address: data.address, postalCode: data.postal_code, city: data.city, country: data.country, website: data.website, vatNumber: data.vat_number, iban: data.iban, defaultCurrency: data.default_currency, defaultVatRate: Number(data.default_vat_rate) }; }
export async function saveCompanyProfile(profile: CompanyProfile) { const userId = await currentUserId(); const { error } = await supabase.from("company_profiles").upsert({ id: `company-${userId}`, user_id: userId, company_name: profile.companyName, owner_name: profile.ownerName, email: profile.email, phone: profile.phone, address: profile.address, postal_code: profile.postalCode, city: profile.city, country: profile.country, website: profile.website, vat_number: profile.vatNumber, iban: profile.iban, default_currency: profile.defaultCurrency, default_vat_rate: profile.defaultVatRate }); if (error) throw databaseError(error); }

export async function getCustomers(): Promise<Customer[]> { const userId = await currentUserId(); const { data, error } = await supabase.from("customers").select("*").eq("user_id", userId).order("company_name"); if (error) throw databaseError(error); return (data ?? []).map((row) => ({ id: row.id, companyName: row.company_name, contactName: row.contact_name, email: row.email, phone: row.phone, address: row.address, project: row.project, monthlyRevenue: Number(row.monthly_revenue ?? 0), oneTimeRevenue: Number(row.one_time_revenue ?? 0), notes: row.notes, logoUrl: row.logo_path ? supabase.storage.from("customer-logos").getPublicUrl(row.logo_path).data.publicUrl : undefined, createdAt: row.created_at, updatedAt: row.updated_at })); }
export async function createCustomer(input: Omit<Customer, "id" | "createdAt" | "updatedAt">) { const userId = await currentUserId(); const now = new Date().toISOString().slice(0, 10); const customer: Customer = { ...input, id: newId("customer"), createdAt: now, updatedAt: now }; const { error } = await supabase.from("customers").insert({ id: customer.id, user_id: userId, company_name: customer.companyName, contact_name: customer.contactName, email: customer.email, phone: customer.phone, address: customer.address, project: customer.project, monthly_revenue: customer.monthlyRevenue, one_time_revenue: customer.oneTimeRevenue, notes: customer.notes, created_at: now, updated_at: now }); if (error) throw databaseError(error); return customer; }
export async function updateCustomer(id: string, changes: Partial<Customer>) { const userId = await currentUserId(); const { error } = await supabase.from("customers").update({ company_name: changes.companyName, contact_name: changes.contactName, email: changes.email, phone: changes.phone, address: changes.address, project: changes.project, monthly_revenue: changes.monthlyRevenue, one_time_revenue: changes.oneTimeRevenue, notes: changes.notes, updated_at: new Date().toISOString().slice(0, 10) }).eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }
export async function deleteCustomer(id: string) { const userId = await currentUserId(); const { error } = await supabase.from("customers").delete().eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }
export async function uploadCustomerLogo(customerId: string, file: File) { const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]); if (!allowedTypes.has(file.type)) throw new Error("Erlaubt sind PNG-, JPG- und WebP-Dateien."); if (file.size > 2 * 1024 * 1024) throw new Error("Das Logo darf maximal 2 MB groß sein."); const userId = await currentUserId(); const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; const path = `${userId}/${customerId}.${extension}`; const { error: uploadError } = await supabase.storage.from("customer-logos").upload(path, file, { upsert: true, contentType: file.type }); if (uploadError) throw databaseError(uploadError); const { error } = await supabase.from("customers").update({ logo_path: path, updated_at: new Date().toISOString().slice(0, 10) }).eq("id", customerId).eq("user_id", userId); if (error) throw databaseError(error); return supabase.storage.from("customer-logos").getPublicUrl(path).data.publicUrl; }


export async function getProspects(): Promise<Prospect[]> { const userId = await currentUserId(); const { data, error } = await supabase.from("prospects").select("*").eq("user_id", userId).order("updated_at", { ascending: false }); if (error) throw databaseError(error); return (data ?? []).map((row) => ({ id: row.id, companyName: row.company_name, contactName: row.contact_name, email: row.email, phone: row.phone, source: row.source, status: row.status, lastContactAt: row.last_contact_at, nextTask: row.next_task, nextTaskAt: row.next_task_at, estimatedValue: row.estimated_value == null ? undefined : Number(row.estimated_value), notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at })); }
export async function createProspect(input: Omit<Prospect, "id" | "createdAt" | "updatedAt">) { const userId = await currentUserId(); const now = new Date().toISOString().slice(0, 10); const prospect: Prospect = { ...input, id: newId("prospect"), createdAt: now, updatedAt: now }; const { error } = await supabase.from("prospects").insert({ id: prospect.id, user_id: userId, company_name: prospect.companyName, contact_name: prospect.contactName, email: prospect.email, phone: prospect.phone, source: prospect.source, status: prospect.status, last_contact_at: prospect.lastContactAt, next_task: prospect.nextTask, next_task_at: prospect.nextTaskAt, estimated_value: prospect.estimatedValue, notes: prospect.notes, created_at: now, updated_at: now }); if (error) throw databaseError(error); return prospect; }
export async function updateProspect(id: string, changes: Partial<Prospect>) { const userId = await currentUserId(); const { error } = await supabase.from("prospects").update({ company_name: changes.companyName, contact_name: changes.contactName, email: changes.email, phone: changes.phone, source: changes.source, status: changes.status, last_contact_at: changes.lastContactAt, next_task: changes.nextTask, next_task_at: changes.nextTaskAt, estimated_value: changes.estimatedValue, notes: changes.notes, updated_at: new Date().toISOString().slice(0, 10) }).eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }
export async function deleteProspect(id: string) { const userId = await currentUserId(); const { error } = await supabase.from("prospects").delete().eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }

const todoFromRow = (row: { id: string; title: string; notes?: string; status: Todo["status"]; due_date?: string; customer_id?: string; prospect_id?: string; created_at: string; updated_at: string }): Todo => ({ id: row.id, title: row.title, notes: row.notes, status: row.status, dueDate: row.due_date, customerId: row.customer_id, prospectId: row.prospect_id, createdAt: row.created_at, updatedAt: row.updated_at });
export async function getTodos(): Promise<Todo[]> { const userId = await currentUserId(); const { data, error } = await supabase.from("todos").select("*").eq("user_id", userId).order("due_date", { ascending: true, nullsFirst: false }); if (error) throw databaseError(error); return (data ?? []).map(todoFromRow); }
export async function createTodo(input: Omit<Todo, "id" | "createdAt" | "updatedAt">) { const userId = await currentUserId(); const now = new Date().toISOString().slice(0, 10); const todo: Todo = { ...input, id: newId("todo"), createdAt: now, updatedAt: now }; const { error } = await supabase.from("todos").insert({ id: todo.id, user_id: userId, title: todo.title, notes: todo.notes, status: todo.status, due_date: todo.dueDate || null, customer_id: todo.customerId || null, prospect_id: todo.prospectId || null, created_at: now, updated_at: now }); if (error) throw databaseError(error); return todo; }
export async function updateTodo(id: string, changes: Partial<Todo>) { const userId = await currentUserId(); const payload: Record<string, unknown> = { updated_at: new Date().toISOString().slice(0, 10) }; if ("title" in changes) payload.title = changes.title; if ("notes" in changes) payload.notes = changes.notes; if ("status" in changes) payload.status = changes.status; if ("dueDate" in changes) payload.due_date = changes.dueDate || null; if ("customerId" in changes) payload.customer_id = changes.customerId || null; if ("prospectId" in changes) payload.prospect_id = changes.prospectId || null; const { error } = await supabase.from("todos").update(payload).eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }
export async function deleteTodo(id: string) { const userId = await currentUserId(); const { error } = await supabase.from("todos").delete().eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }

export async function getTodoComments(todoId: string): Promise<TodoComment[]> { const userId = await currentUserId(); const { data, error } = await supabase.from("todo_comments").select("*").eq("user_id", userId).eq("todo_id", todoId).order("created_at", { ascending: true }); if (error) throw databaseError(error); return (data ?? []).map((row) => ({ id: row.id, todoId: row.todo_id, body: row.body, createdAt: row.created_at })); }
export async function createTodoComment(todoId: string, body: string): Promise<TodoComment> { const trimmed = body.trim(); if (!trimmed) throw new Error("Kommentar darf nicht leer sein."); const userId = await currentUserId(); const comment: TodoComment = { id: newId("comment"), todoId, body: trimmed, createdAt: new Date().toISOString() }; const { error } = await supabase.from("todo_comments").insert({ id: comment.id, user_id: userId, todo_id: todoId, body: trimmed }); if (error) throw databaseError(error); return comment; }
export async function deleteTodoComment(id: string) { const userId = await currentUserId(); const { error } = await supabase.from("todo_comments").delete().eq("id", id).eq("user_id", userId); if (error) throw databaseError(error); }

export async function getWorkspaceItems(module: WorkspaceModule): Promise<WorkspaceItem[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("workspace_items").select("*").eq("user_id", userId).eq("module", module).order("updated_at", { ascending: false });
  if (error) throw databaseError(error);
  return (data ?? []).map((row) => ({ id: row.id, module: row.module, title: row.title, subtitle: row.subtitle, description: row.description, status: row.status, priority: row.priority, owner: row.owner, contactName: row.contact_name, email: row.email, phone: row.phone, amount: row.amount == null ? undefined : Number(row.amount), startDate: row.start_date, dueDate: row.due_date, tags: row.tags ?? [], createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function getAllWorkspaceItems(): Promise<WorkspaceItem[]> {
  const modules: WorkspaceModule[] = ["projects", "ideas", "tasks", "offers", "people", "commissions", "leads", "operations"];
  return (await Promise.all(modules.map(getWorkspaceItems))).flat();
}

export async function getDueWorkspaceItems(): Promise<WorkspaceItem[]> {
  const userId = await currentUserId(); const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("workspace_items").select("*").eq("user_id", userId).lte("due_date", today).order("due_date");
  if (error) throw databaseError(error);
  return (data ?? []).map((row) => ({ id: row.id, module: row.module, title: row.title, subtitle: row.subtitle, description: row.description, status: row.status, priority: row.priority, owner: row.owner, contactName: row.contact_name, email: row.email, phone: row.phone, amount: row.amount == null ? undefined : Number(row.amount), startDate: row.start_date, dueDate: row.due_date, tags: row.tags ?? [], createdAt: row.created_at, updatedAt: row.updated_at }));
}

function workspaceRow(item: WorkspaceItem, userId: string) {
  return { id: item.id, user_id: userId, module: item.module, title: item.title, subtitle: item.subtitle, description: item.description, status: item.status, priority: item.priority, owner: item.owner, contact_name: item.contactName, email: item.email, phone: item.phone, amount: item.amount, start_date: item.startDate, due_date: item.dueDate, tags: item.tags, created_at: item.createdAt, updated_at: item.updatedAt };
}

export async function createWorkspaceItem(input: Omit<WorkspaceItem, "id" | "createdAt" | "updatedAt">) {
  const userId = await currentUserId(); const now = new Date().toISOString().slice(0, 10);
  const item: WorkspaceItem = { ...input, id: newId(input.module), createdAt: now, updatedAt: now };
  const { error } = await supabase.from("workspace_items").insert(workspaceRow(item, userId));
  if (error) throw databaseError(error); return item;
}

export async function updateWorkspaceItem(id: string, changes: Partial<WorkspaceItem>) {
  const userId = await currentUserId();
  const payload = { title: changes.title, subtitle: changes.subtitle, description: changes.description, status: changes.status, priority: changes.priority, owner: changes.owner, contact_name: changes.contactName, email: changes.email, phone: changes.phone, amount: changes.amount, start_date: changes.startDate || null, due_date: changes.dueDate || null, tags: changes.tags, updated_at: new Date().toISOString().slice(0, 10) };
  const { error } = await supabase.from("workspace_items").update(payload).eq("id", id).eq("user_id", userId);
  if (error) throw databaseError(error);
}

export async function deleteWorkspaceItem(id: string) {
  const userId = await currentUserId();
  const { data: files } = await supabase.from("workspace_files").select("storage_path").eq("item_id", id).eq("user_id", userId);
  if (files?.length) await supabase.storage.from("workspace-files").remove(files.map((file) => file.storage_path));
  const { error } = await supabase.from("workspace_items").delete().eq("id", id).eq("user_id", userId);
  if (error) throw databaseError(error);
}

export async function getWorkspaceFiles(itemIds: string[]): Promise<WorkspaceFile[]> {
  if (!itemIds.length) return [];
  const userId = await currentUserId();
  const { data, error } = await supabase.from("workspace_files").select("*").eq("user_id", userId).in("item_id", itemIds).order("created_at", { ascending: false });
  if (error) throw databaseError(error);
  return (data ?? []).map((row) => ({ id: row.id, itemId: row.item_id, name: row.name, storagePath: row.storage_path, fileType: row.file_type, fileSize: row.file_size, createdAt: row.created_at }));
}

export async function uploadWorkspaceFile(itemId: string, file: File) {
  const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
  if (!allowedTypes.has(file.type)) throw new Error("Dieser Dateityp ist nicht erlaubt.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Die Datei darf maximal 15 MB groß sein.");
  const userId = await currentUserId(); const id = newId("file"); const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"; const path = `${userId}/${itemId}/${id}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("workspace-files").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw databaseError(uploadError);
  const workspaceFile: WorkspaceFile = { id, itemId, name: file.name.slice(0, 180), storagePath: path, fileType: file.type, fileSize: file.size, createdAt: new Date().toISOString().slice(0, 10) };
  const { error } = await supabase.from("workspace_files").insert({ id, user_id: userId, item_id: itemId, name: workspaceFile.name, storage_path: path, file_type: file.type, file_size: file.size, created_at: workspaceFile.createdAt });
  if (error) { await supabase.storage.from("workspace-files").remove([path]); throw databaseError(error); }
  return workspaceFile;
}

export async function getWorkspaceFileUrl(path: string) {
  const userId = await currentUserId(); if (!path.startsWith(`${userId}/`) || path.includes("..")) throw new Error("Ungültiger Dateipfad.");
  const { data, error } = await supabase.storage.from("workspace-files").createSignedUrl(path, 60);
  if (error) throw databaseError(error); return data.signedUrl;
}

export async function getMonthlyGoal(month: string): Promise<MonthlyGoal | undefined> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("monthly_goals").select("*").eq("user_id", userId).eq("month", month).maybeSingle();
  if (error) throw databaseError(error);
  return data ? { id: data.id, month: data.month, revenueTarget: Number(data.revenue_target), recurringRevenueTarget: Number(data.recurring_revenue_target), expenseBudget: Number(data.expense_budget), notes: data.notes, createdAt: data.created_at, updatedAt: data.updated_at } : undefined;
}

export async function saveMonthlyGoal(input: Omit<MonthlyGoal, "id" | "createdAt" | "updatedAt">) {
  const userId = await currentUserId(); const now = new Date().toISOString().slice(0, 10);
  const goal: MonthlyGoal = { ...input, id: `${userId}-${input.month}`, createdAt: now, updatedAt: now };
  const { error } = await supabase.from("monthly_goals").upsert({ id: goal.id, user_id: userId, month: goal.month, revenue_target: goal.revenueTarget, recurring_revenue_target: goal.recurringRevenueTarget, expense_budget: goal.expenseBudget, notes: goal.notes, created_at: now, updated_at: now }, { onConflict: "user_id,month" });
  if (error) throw databaseError(error); return goal;
}

