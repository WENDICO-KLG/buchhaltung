import { supabase } from "@/lib/supabase";

export type CompanyRole = "owner" | "admin" | "member" | "viewer";
export const companyPages = { dashboard: "Übersicht", todos: "To-Dos", analytics: "Ausgaben", cvs: "Belege", customers: "Kunden", prospects: "Prospects", profile: "Unternehmen", calculator: "Rechner", "social-media": "Ayleen Social Media" };
export type CompanyPage = keyof typeof companyPages;
export type CompanyMembership = { company_id: string; company_name: string; role: CompanyRole; allowed_pages?: CompanyPage[] };
export type CompanyMember = { user_id: string; email: string; role: CompanyRole; display_name?: string | null; allowed_pages?: CompanyPage[] };
export const canAccessPage = (company: CompanyMembership, page: string) => company.role === "owner" || company.role === "admin" || page === "settings" || (company.allowed_pages ?? []).includes(page as CompanyPage);
export type CommissionCustomer = { customer_id: string; company_name: string; amount: number | string; payment_date?: string | null; member_id?: string | null; member_name?: string | null; rate: number | string };
export const getCommissionCustomers = (companyId: string) => rpc<CommissionCustomer[]>("commission_customers", { company: companyId });
export type DashboardCommission = { payment_date: string; total: number | string };
export const getDashboardCommissions = async () => rpc<DashboardCommission[]>("dashboard_commissions", { company: await currentCompanyId() });
export const setCustomerCommission = (companyId: string, customerId: string, memberId: string, rate: number) => rpc<null>("set_customer_commission", { company: companyId, customer: customerId, member: memberId || null, percentage: rate });
export const setMemberPages = (companyId: string, userId: string, pages: CompanyPage[]) => rpc<null>("set_member_pages", { company: companyId, member: userId, pages });
export const companyMemberName = (member: CompanyMember) => member.display_name?.trim() || member.email;
export type CompanyInvitation = { id: string; company_id: string; company_name: string; email: string; role: "admin" | "member" | "viewer"; expires_at: string };

export const companyRoleLabels: Record<CompanyRole, string> = { owner: "Inhaber", admin: "Administrator", member: "Mitarbeiter", viewer: "Leser" };

async function rpc<Result>(name: string, args?: Record<string, unknown>): Promise<Result> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.code === "PGRST202" ? "Die Firmen-Migration muss zuerst in Supabase ausgefuehrt werden." : error.message);
  return data as Result;
}

export const getMyCompanies = () => rpc<CompanyMembership[]>("my_companies");
export const getMyInvitations = () => rpc<CompanyInvitation[]>("my_company_invitations");
export const getCompanyMembers = (companyId: string) => rpc<CompanyMember[]>("company_team", { company: companyId });
export const getCompanyInvitations = (companyId: string) => rpc<CompanyInvitation[]>("company_pending_invitations", { company: companyId });
export const createCompany = (name: string) => rpc<string>("create_company", { company_name: name.trim() });
export const inviteCompanyMember = (companyId: string, email: string, role: CompanyInvitation["role"]) => rpc<string>("invite_company_member", { company: companyId, invited_email: email.trim().toLowerCase(), invited_role: role });
export const acceptCompanyInvitation = (id: string) => rpc<string>("accept_company_invitation", { invitation: id });
export const revokeCompanyInvitation = (id: string) => rpc<null>("revoke_company_invitation", { invitation: id });
export const setCompanyMemberRole = (companyId: string, userId: string, role: CompanyInvitation["role"]) => rpc<null>("set_company_member_role", { company: companyId, member: userId, new_role: role });
export const setCompanyMemberName = (companyId: string, userId: string, name: string) => rpc<null>("set_company_member_name", { company: companyId, member: userId, member_name: name.trim() });
export const removeCompanyMember = (companyId: string, userId: string) => rpc<null>("remove_company_member", { company: companyId, member: userId });

export async function getActiveCompany(): Promise<CompanyMembership | undefined> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du musst angemeldet sein.");
  const companies = await getMyCompanies();
  const selected = typeof window === "undefined" ? null : window.localStorage.getItem(`wendico-company.${data.user.id}`);
  return companies.find((company) => company.company_id === selected) ?? companies[0];
}

export async function selectCompany(companyId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du musst angemeldet sein.");
  window.localStorage.setItem(`wendico-company.${data.user.id}`, companyId);
  window.location.reload();
}

export async function currentCompanyId(write = false, manage = false) {
  const company = await getActiveCompany();
  if (!company) throw new Error("Bitte erstelle eine Firma oder nimm eine Einladung in den Einstellungen an.");
  if (write && company.role === "viewer") throw new Error("Du hast nur Leserechte in dieser Firma.");
  if (manage && !["owner", "admin"].includes(company.role)) throw new Error("Nur Inhaber und Administratoren duerfen das Firmenprofil bearbeiten.");
  return company.company_id;
}