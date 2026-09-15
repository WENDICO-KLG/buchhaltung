"use client";

import { useEffect, useState } from "react";
import { Building2, Check } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/storage";
import type { CompanyProfile } from "@/types";

const fields: { key: keyof CompanyProfile; label: string; type?: string }[] = [
  { key: "companyName", label: "Unternehmensname" }, { key: "ownerName", label: "Gesellschafter / Ansprechpartner" },
  { key: "email", label: "E-Mail", type: "email" }, { key: "phone", label: "Telefon" }, { key: "address", label: "Straße und Hausnummer" },
  { key: "postalCode", label: "PLZ" }, { key: "city", label: "Ort" }, { key: "country", label: "Land" },
  { key: "website", label: "Webseite" }, { key: "vatNumber", label: "UID (falls vorhanden)" }, { key: "iban", label: "IBAN" },
];

export default function CompanyPage() {
  const [profile, setProfile] = useState<CompanyProfile>(); const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  useEffect(() => { getCompanyProfile().then(setProfile).catch((cause) => setError(cause instanceof Error ? cause.message : "Firmendaten konnten nicht geladen werden.")); }, []);
  if (!profile) return <WorkspaceShell active="Unternehmen"><p className="text-sm text-[#8292ae]">Firmendaten werden geladen...</p></WorkspaceShell>;
  const loadedProfile = profile; const update = (key: keyof CompanyProfile, value: string) => setProfile((current) => current ? { ...current, [key]: value } : current);
  async function submit(event: React.FormEvent) { event.preventDefault(); try { await saveCompanyProfile({ ...loadedProfile, defaultCurrency: "CHF", defaultVatRate: loadedProfile.defaultVatRate || 0 }); setSaved(true); window.setTimeout(() => setSaved(false), 2000); } catch (cause) { setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen."); } }
  return <WorkspaceShell active="Unternehmen" title="Wendico / Unternehmen"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#56c8ff]">Stammdaten</p><h1 className="mt-3 text-3xl font-semibold text-white">Wendico KLG</h1><p className="mt-2 text-sm text-[#8292ae]">Die Angaben, die auf Rechnungen erscheinen.</p></div>{error && <div className="mt-5 rounded-xl border border-[#6e3340] bg-[#24131e] px-4 py-3 text-sm text-[#ffaaa0]">{error}</div>}<div className="mt-8 grid gap-5 lg:grid-cols-[.65fr_1.35fr]"><section className="panel rounded-2xl p-6"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#14315d] text-[#7bcaff]"><Building2 size={28}/></div><h2 className="mt-5 text-xl font-semibold text-white">{profile.companyName}</h2><p className="mt-2 text-sm text-[#8292ae]">{profile.ownerName}</p><p className="mt-5 text-xs leading-6 text-[#7185a6]">{profile.address}<br/>{profile.postalCode} {profile.city}<br/>{profile.country}</p></section><form onSubmit={submit} className="panel rounded-2xl p-5 md:p-7"><div className="grid gap-4 sm:grid-cols-2">{fields.map(({ key, label, type }) => <label key={key} className={key === "address" || key === "iban" ? "sm:col-span-2" : ""}><span className="mb-2 block text-xs text-[#8292ae]">{label}</span><input required={["companyName", "ownerName", "email", "country"].includes(key)} type={type ?? "text"} value={String(profile[key] ?? "")} onChange={(event) => update(key, event.target.value)} className="field"/></label>)}</div><button className="primary mt-6 flex items-center gap-2">{saved && <Check size={16}/>} {saved ? "Gespeichert" : "Speichern"}</button></form></div></WorkspaceShell>;
}
