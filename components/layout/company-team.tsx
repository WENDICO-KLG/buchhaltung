"use client";

import { useEffect, useState } from "react";
import { Building2, Check, MailPlus, Trash2, Users, X } from "lucide-react";
import { acceptCompanyInvitation, companyRoleLabels, createCompany, getActiveCompany, getCompanyInvitations, getCompanyMembers, getMyCompanies, getMyInvitations, inviteCompanyMember, removeCompanyMember, revokeCompanyInvitation, selectCompany, setCompanyMemberRole } from "@/lib/company";
import type { CompanyInvitation, CompanyMember, CompanyMembership } from "@/lib/company";

type EditableRole = CompanyInvitation["role"];
const roles: EditableRole[] = ["viewer", "member", "admin"];

async function loadTeam() {
  const [companies, active, incoming] = await Promise.all([getMyCompanies(), getActiveCompany(), getMyInvitations()]);
  const [members, invitations] = active ? await Promise.all([getCompanyMembers(active.company_id), ["owner", "admin"].includes(active.role) ? getCompanyInvitations(active.company_id) : Promise.resolve([])]) : [[], []];
  return { companies, active, incoming, members, invitations };
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
  const manage = active?.role === "owner" || active?.role === "admin";

  function applyTeam(data: Awaited<ReturnType<typeof loadTeam>>) {
    setCompanies(data.companies); setActive(data.active); setIncoming(data.incoming);
    setMembers(data.members); setInvitations(data.invitations);
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

  return <section className="mt-8 border-y border-white/10 py-6" aria-labelledby="company-team-title">
    <div className="flex items-center gap-3"><Users size={20} className="text-[#56c8ff]"/><h2 id="company-team-title" className="text-lg font-semibold text-white">Firma & Team</h2></div>
    {loading ? <p className="mt-5 animate-pulse text-sm text-[#8292ae]">Team wird geladen...</p> : <>
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-emerald-400">{notice}</p>}
      {incoming.length > 0 && <div className="mt-5 space-y-3">{incoming.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-white">{invite.company_name}</p><p className="text-xs text-[#8292ae]">Einladung als {companyRoleLabels[invite.role]} · bis {new Date(invite.expires_at).toLocaleDateString("de-CH")}</p></div><button disabled={busy} className="action" onClick={() => act(async () => { const companyId = await acceptCompanyInvitation(invite.id); await selectCompany(companyId); }, "Einladung angenommen.")}><Check size={16}/>Annehmen</button></div>)}</div>}
      {active && <>
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="block min-w-0 text-sm text-[#8292ae]">Aktive Firma<select aria-label="Aktive Firma" className="field mt-2 w-full" value={active.company_id} disabled={busy} onChange={(event) => act(() => selectCompany(event.target.value), "Firma gewechselt.")}>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select></label><p className="pb-3 text-sm text-[#8292ae]">{companyRoleLabels[active.role]}</p></div>
        {manage && <form className="mt-6 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]" onSubmit={(event) => { event.preventDefault(); act(async () => { await inviteCompanyMember(active.company_id, email, role); setEmail(""); }, "Einladung erstellt. Sie erscheint nach Anmeldung mit bestaetigter E-Mail in den Einstellungen des Empfaengers."); }}>
          <label className="block min-w-0 text-sm text-[#8292ae]">E-Mail-Adresse<input className="field mt-2 w-full" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy}/></label>
          <label className="block text-sm text-[#8292ae]">Rolle<select className="field mt-2 w-full" value={role} onChange={(event) => setRole(event.target.value as EditableRole)} disabled={busy}>{roles.filter((value) => value !== "admin" || active.role === "owner").map((value) => <option key={value} value={value}>{companyRoleLabels[value]}</option>)}</select></label>
          <button className="action whitespace-nowrap" disabled={busy} type="submit"><MailPlus size={16}/>Einladen</button>
        </form>}
        <div className="mt-6 divide-y divide-white/10">{members.map((member) => {
          const editable = manage && member.role !== "owner" && (active.role === "owner" || member.role !== "admin");
          return <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><p className="min-w-0 break-all text-sm text-white">{member.email}</p><div className="flex items-center gap-2">{editable ? <select className="field w-40" aria-label={`Rolle von ${member.email}`} value={member.role} disabled={busy} onChange={(event) => act(() => setCompanyMemberRole(active.company_id, member.user_id, event.target.value as EditableRole), "Rolle aktualisiert.")}>{roles.filter((value) => value !== "admin" || active.role === "owner").map((value) => <option key={value} value={value}>{companyRoleLabels[value]}</option>)}</select> : <span className="text-sm text-[#8292ae]">{companyRoleLabels[member.role]}</span>}{editable && <button type="button" className="header-icon-button" disabled={busy} title="Mitglied entfernen" aria-label={`${member.email} entfernen`} onClick={() => { if (window.confirm(`${member.email} aus der Firma entfernen?`)) act(() => removeCompanyMember(active.company_id, member.user_id), "Mitglied entfernt."); }}><Trash2 size={16}/></button>}</div></div>;
        })}</div>
        {invitations.length > 0 && <div className="mt-6"><h3 className="text-sm font-semibold text-white">Offene Einladungen</h3>{invitations.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3"><div className="min-w-0"><p className="break-all text-sm text-white">{invite.email}</p><p className="text-xs text-[#8292ae]">{companyRoleLabels[invite.role]} · bis {new Date(invite.expires_at).toLocaleDateString("de-CH")}</p></div>{(active.role === "owner" || invite.role !== "admin") && <button type="button" className="header-icon-button" disabled={busy} title="Einladung widerrufen" aria-label={`Einladung fuer ${invite.email} widerrufen`} onClick={() => act(() => revokeCompanyInvitation(invite.id), "Einladung widerrufen.")}><X size={16}/></button>}</div>)}</div>}
      </>}
      {!active && !error && <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); act(async () => { const companyId = await createCompany(name); await selectCompany(companyId); }, "Firma erstellt."); }}><label className="block min-w-0 flex-1 text-sm text-[#8292ae]">Firmenname<input className="field mt-2 w-full" required maxLength={200} value={name} disabled={busy} onChange={(event) => setName(event.target.value)}/></label><button type="submit" className="action whitespace-nowrap" disabled={busy}><Building2 size={16}/>Firma erstellen</button></form>}
    </>}
  </section>;
}