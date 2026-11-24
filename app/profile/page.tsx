"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/storage";
import type { CompanyProfile } from "@/types";

const fields: { key: keyof CompanyProfile; label: string; type?: string }[] = [
  { key: "companyName", label: "Unternehmensname" }, { key: "ownerName", label: "Gesellschafter / Ansprechpartner" },
  { key: "email", label: "E-Mail", type: "email" }, { key: "phone", label: "Telefon" }, { key: "address", label: "Straße und Hausnummer" },
  { key: "postalCode", label: "PLZ" }, { key: "city", label: "Ort" }, { key: "country", label: "Land" },
  { key: "website", label: "Webseite" }, { key: "vatNumber", label: "UID (falls vorhanden)" }, { key: "iban", label: "IBAN" },
];

const groups: { title: string; keys: (keyof CompanyProfile)[] }[] = [
  { title: "Firma", keys: ["companyName", "ownerName"] },
  { title: "Kontakt", keys: ["email", "phone", "website"] },
  { title: "Adresse", keys: ["address", "postalCode", "city", "country"] },
  { title: "Rechnung", keys: ["vatNumber", "iban"] },
];
const wide: (keyof CompanyProfile)[] = ["address", "iban", "website", "vatNumber", "country"];

export default function CompanyPage() {
  const [profile, setProfile] = useState<CompanyProfile>(); const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  useEffect(() => { getCompanyProfile().then(setProfile).catch((cause) => setError(cause instanceof Error ? cause.message : "Firmendaten konnten nicht geladen werden.")); }, []);
  if (!profile) return <WorkspaceShell active="Unternehmen" title="Wendico / Unternehmen">{error ? <p role="alert" className="tile flex items-center gap-3 px-5 py-3.5 text-sm text-[var(--coral)]"><span aria-hidden className="dot dot-off"/>{error}</p> : <><p role="status" className="sr-only">Firmendaten werden geladen...</p><Skeleton className="h-11 w-64"/><div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]"><Skeleton className="h-72 !rounded-[1.6875rem]"/><Skeleton className="h-[34rem] !rounded-[1.6875rem]"/></div></>}</WorkspaceShell>;
  const loadedProfile = profile; const update = (key: keyof CompanyProfile, value: string) => setProfile((current) => current ? { ...current, [key]: value } : current);
  async function submit(event: React.FormEvent) { event.preventDefault(); try { await saveCompanyProfile({ ...loadedProfile, defaultCurrency: "CHF", defaultVatRate: loadedProfile.defaultVatRate || 0 }); setSaved(true); window.setTimeout(() => setSaved(false), 2000); } catch (cause) { setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen."); } }
  const contact = [profile.phone, profile.email, profile.website].filter(Boolean);
  return <WorkspaceShell active="Unternehmen" title="Wendico / Unternehmen">
    <div className="page-enter">
      <PageHeader title="Wendico KLG" subtitle="Die Angaben, die auf Rechnungen erscheinen."/>
      {error && <div role="alert" className="tile mt-6 flex items-center gap-3 px-5 py-3.5 text-sm text-[var(--coral)]"><span aria-hidden className="dot dot-off"/>{error}</div>}
      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
        <section className="raised p-6 [overflow-wrap:anywhere] sm:p-8 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <h2 className="text-[1.75rem] font-medium leading-tight tracking-[-.02em]">{profile.companyName}</h2>
          <p className="mt-1.5 text-sm text-[var(--muted)]">{profile.ownerName}</p>
          <p className="mt-8 text-sm leading-6">{profile.address}<br/>{profile.postalCode} {profile.city}<br/>{profile.country}</p>
          {contact.length > 0 && <div className="mt-5 text-sm leading-6 text-[var(--muted)]">{contact.map((line) => <p key={line}>{line}</p>)}</div>}
          {(profile.iban || profile.vatNumber) && <dl className="money mt-7 space-y-3 border-t border-[var(--line)] pt-6 text-sm">
            {profile.iban && <div><dt className="text-[13px] text-[var(--muted)]">IBAN</dt><dd className="mt-0.5 font-medium">{profile.iban}</dd></div>}
            {profile.vatNumber && <div><dt className="text-[13px] text-[var(--muted)]">UID</dt><dd className="mt-0.5 font-medium">{profile.vatNumber}</dd></div>}
          </dl>}
        </section>
        <form onSubmit={submit} className="plate px-5 pb-6 sm:px-8 sm:pb-8">
          <div className="divide-y divide-[var(--line)]">{groups.map((group) => <fieldset key={group.title} className="grid min-w-0 gap-x-4 gap-y-4 py-7 sm:grid-cols-2 sm:py-8 xl:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1fr)]">
            <legend className="sr-only">{group.title}</legend>
            <p aria-hidden className="text-base font-semibold sm:col-span-2 xl:col-span-1 xl:row-start-1">{group.title}</p>
            {group.keys.flatMap((groupKey) => fields.filter(({ key }) => key === groupKey)).map(({ key, label, type }) => <label key={key} className={`min-w-0 ${wide.includes(key) ? "sm:col-span-2 xl:col-start-2" : group.keys.filter((item) => !wide.includes(item)).indexOf(key) % 2 ? "xl:col-start-3" : "xl:col-start-2"}`}><span className="mb-1.5 block text-[13px] text-[var(--muted)]">{label}</span><input required={["companyName", "ownerName", "email", "country"].includes(key)} type={type ?? "text"} value={String(profile[key] ?? "")} onChange={(event) => update(key, event.target.value)} className="field"/></label>)}
          </fieldset>)}</div>
          <button className="primary mt-1 w-full sm:w-auto sm:min-w-40 xl:ml-[8.5rem]">{saved && <Check size={17}/>} {saved ? "Gespeichert" : "Speichern"}</button>
          <span role="status" className="sr-only">{saved ? "Gespeichert" : ""}</span>
        </form>
      </div>
    </div>
  </WorkspaceShell>;
}
