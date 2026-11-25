"use client";

import { useEffect, useState } from "react";
import { Building2, Check, MailPlus, Pencil, Trash2, X } from "lucide-react";
import { companyMemberName, companyPages, setCompanyMemberName, setMemberPages } from "@/lib/company";
import type { CompanyPage } from "@/lib/company";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { acceptCompanyInvitation, companyRoleLabels, createCompany, getActiveCompany, getCompanyInvitations, getCompanyMembers, getMyCompanies, getMyInvitations, inviteCompanyMember, removeCompanyMember, revokeCompanyInvitation, selectCompany, setCompanyMemberRole } from "@/lib/company";
import type { CompanyInvitation, CompanyMember, CompanyMembership } from "@/lib/company";

type EditableRole = CompanyInvitation["role"];
const roles: EditableRole[] = ["viewer", "member", "admin"];

async function loadTeam() {
  const { data: { user } } = await supabase.auth.getUser();
  const [companies, active, incoming] = await Promise.all([getMyCompanies(), getActiveCompany(), getMyInvitations()]);
  const [members, invitations] = active ? await Promise.all([getCompanyMembers(active.company_id), ["owner", "admin"].includes(active.role) ? getCompanyInvitations(active.company_id) : Promise.resolve([])]) : [[], []];
  return { companies, active, incoming, members, invitations, userId: user?.id };
}

export function CompanyTeam() {
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [active, setActive] = useState<CompanyMembership>();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [incoming, setIncoming] = useState<CompanyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EditableRole>("member");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string>();
  const [editingNameId, setEditingNameId] = useState<string>();
  const [memberName, setMemberName] = useState("");
  const manage = active?.role === "owner" || active?.role === "admin";

  function applyTeam(data: Awaited<ReturnType<typeof loadTeam>>) {
    setCompanies(data.companies); setActive(data.active); setIncoming(data.incoming);
    setMembers(data.members); setInvitations(data.invitations);
    setUserId(data.userId);
  }

  useEffect(() => {
    let mounted = true;
    loadTeam().then((data) => { if (mounted) applyTeam(data); }).catch((failure: unknown) => { if (mounted) setError(failure instanceof Error ? failure.message : "Firma konnte nicht geladen werden."); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); applyTeam(await loadTeam()); setNotice(success); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Aktion fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  return <section className="plate min-w-0 p-5 sm:p-8" aria-labelledby="company-team-title">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4"><h2 id="company-team-title" className="text-base font-semibold">Firma & Team</h2>{active && <p className="text-[13.5px] text-[var(--muted)]">{companyRoleLabels[active.role]}</p>}</div>
    {loading ? <div className="mt-6 space-y-4"><p role="status" className="sr-only">Team wird geladen...</p><Skeleton className="h-11"/><Skeleton className="h-16"/><Skeleton className="h-16"/></div> : <>
      {error && <p role="alert" className="mt-5 flex items-center gap-3 text-sm text-[var(--coral)]"><span aria-hidden className="dot dot-off"/>{error}</p>}
      {notice && <p role="status" className="mt-5 flex items-center gap-3 text-sm text-[var(--emerald)]"><span aria-hidden className="dot dot-on"/>{notice}</p>}
      {incoming.length > 0 && <div className="mt-5 space-y-3">{incoming.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.375rem] p-5 shadow-[var(--edge-shadow)]"><div className="min-w-0"><p className="break-words text-base font-semibold">{invite.company_name}</p><p className="money text-sm text-[var(--muted)]">Einladung als {companyRoleLabels[invite.role]} · bis {new Date(invite.expires_at).toLocaleDateString("de-CH")}</p></div><button disabled={busy} className="action" onClick={() => act(async () => { const companyId = await acceptCompanyInvitation(invite.id); await selectCompany(companyId); }, "Einladung angenommen.")}><Check size={16}/>Annehmen</button></div>)}</div>}
      {active && <>
        <div className="mt-6"><label className="block min-w-0 text-[13.5px] text-[var(--muted)]">Aktive Firma<select aria-label="Aktive Firma" className="field mt-1.5 w-full" value={active.company_id} disabled={busy} onChange={(event) => act(() => selectCompany(event.target.value), "Firma gewechselt.")}>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select></label></div>
        {manage && <form className="mt-5 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]" onSubmit={(event) => { event.preventDefault(); act(async () => { await inviteCompanyMember(active.company_id, email, role); setEmail(""); }, "Einladung erstellt. Sie erscheint nach Anmeldung mit bestaetigter E-Mail in den Einstellungen des Empfaengers."); }}>
          <label className="block min-w-0 text-[13.5px] text-[var(--muted)]">E-Mail-Adresse<input className="field mt-1.5 w-full" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy}/></label>
          <label className="block text-[13.5px] text-[var(--muted)]">Rolle<select className="field mt-1.5 w-full" value={role} onChange={(event) => setRole(event.target.value as EditableRole)} disabled={busy}>{roles.filter((value) => value !== "admin" || active.role === "owner").map((value) => <option key={value} value={value}>{companyRoleLabels[value]}</option>)}</select></label>
          <button className="action whitespace-nowrap" disabled={busy} type="submit"><MailPlus size={16}/>Einladen</button>
        </form>}
        <div className="mt-8 divide-y divide-[var(--line)] border-t border-[var(--line)]">{members.map((member) => {
          const editable = manage && member.role !== "owner" && (active.role === "owner" || member.role !== "admin");
          const label = companyMemberName(member);
          const nameEditable = manage && (active.role === "owner" || member.role === "member" || member.role === "viewer" || member.user_id === userId);
          return <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 py-6">
            <span aria-hidden className="user-avatar">{label.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
            <div className={`min-w-0 flex-1 ${editingNameId === member.user_id ? "basis-full sm:basis-32" : "basis-32"}`}>
              {editingNameId === member.user_id ? <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void act(async () => { await setCompanyMemberName(active.company_id, member.user_id, memberName); setEditingNameId(undefined); }, "Name gespeichert."); }}>
                <label className="min-w-0 flex-1 text-[13.5px] text-[var(--muted)]">Anzeigename<input autoFocus className="field mt-1" maxLength={100} value={memberName} disabled={busy} onChange={(event) => setMemberName(event.target.value)}/></label>
                <button type="submit" className="header-icon-button" disabled={busy} title="Name speichern" aria-label="Name speichern"><Check size={16}/></button>
                <button type="button" className="header-icon-button" disabled={busy} onClick={() => setEditingNameId(undefined)} title="Abbrechen" aria-label="Namensänderung abbrechen"><X size={16}/></button>
              </form> : <div className="flex items-center gap-1"><p className="min-w-0 break-words text-base font-semibold [overflow-wrap:anywhere]">{label}</p>{nameEditable && <button type="button" className="icon-button ml-1 shrink-0" disabled={busy} title="Name bearbeiten" aria-label={`Name von ${label} bearbeiten`} onClick={() => { setEditingNameId(member.user_id); setMemberName(member.display_name ?? ""); }}><Pencil size={15} strokeWidth={1.6}/></button>}</div>}
              {member.display_name && <p className="text-[13.5px] text-[var(--muted)] [overflow-wrap:anywhere]">{member.email}</p>}
            </div>
            <div className={`flex items-center gap-1 ${editable ? "w-full sm:w-auto" : ""}`}>{editable ? <select className="field sm:w-44" aria-label={`Rolle von ${label}`} value={member.role} disabled={busy} onChange={(event) => act(() => setCompanyMemberRole(active.company_id, member.user_id, event.target.value as EditableRole), "Rolle aktualisiert.")}>{roles.filter((value) => value !== "admin" || active.role === "owner").map((value) => <option key={value} value={value}>{companyRoleLabels[value]}</option>)}</select> : <span className="text-sm text-[var(--muted)]">{companyRoleLabels[member.role]}</span>}{editable && <button type="button" className="header-icon-button shrink-0" disabled={busy} title="Mitglied entfernen" aria-label={`${label} entfernen`} onClick={() => { if (window.confirm(`${label} aus der Firma entfernen?`)) act(() => removeCompanyMember(active.company_id, member.user_id), "Mitglied entfernt."); }}><Trash2 size={16} strokeWidth={1.6}/></button>}</div>
            {manage && ["member","viewer"].includes(member.role) && <fieldset className="w-full min-w-0 sm:pl-[3.75rem]"><legend className="mb-2 text-[13.5px] text-[var(--muted)]">Seitenzugriff für {label}</legend><div className="grid gap-x-10 min-[560px]:grid-cols-2">{(Object.entries(companyPages) as [CompanyPage,string][]).map(([page,pageLabel]) => <label key={page} className="flex min-h-12 min-w-0 cursor-pointer flex-row-reverse items-center justify-between gap-3 text-sm text-[var(--muted)] transition-colors has-[:checked]:text-[var(--ink)]"><input type="checkbox" role="switch" className="switch" disabled={busy} checked={(member.allowed_pages ?? []).includes(page)} onChange={(event) => { const pages = member.allowed_pages ?? []; void act(() => setMemberPages(active.company_id,member.user_id,event.target.checked ? [...pages,page] : pages.filter((value) => value !== page)), "Seitenzugriff gespeichert."); }}/>{pageLabel}</label>)}</div></fieldset>}
          </div>;
        })}</div>
        {invitations.length > 0 && <div className="mt-6"><h3 className="text-base font-semibold">Offene Einladungen</h3>{invitations.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0"><div className="min-w-0"><p className="break-all text-sm font-medium">{invite.email}</p><p className="money text-sm text-[var(--muted)]">{companyRoleLabels[invite.role]} · bis {new Date(invite.expires_at).toLocaleDateString("de-CH")}</p></div>{(active.role === "owner" || invite.role !== "admin") && <button type="button" className="header-icon-button" disabled={busy} title="Einladung widerrufen" aria-label={`Einladung fuer ${invite.email} widerrufen`} onClick={() => act(() => revokeCompanyInvitation(invite.id), "Einladung widerrufen.")}><X size={16}/></button>}</div>)}</div>}
      </>}
      {!active && !error && <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); act(async () => { const companyId = await createCompany(name); await selectCompany(companyId); }, "Firma erstellt."); }}><label className="block min-w-0 flex-1 basis-56 text-[13.5px] text-[var(--muted)]">Firmenname<input className="field mt-1.5 w-full" required maxLength={200} value={name} disabled={busy} onChange={(event) => setName(event.target.value)}/></label><button type="submit" className="action whitespace-nowrap" disabled={busy}><Building2 size={16}/>Firma erstellen</button></form>}
    </>}
  </section>;
}