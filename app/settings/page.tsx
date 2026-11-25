"use client";

import { flushSync } from "react-dom";
import { crossFade } from "@/components/ui/motion";
import { useEffect, useState } from "react";
import { Database, Download, Moon, ShieldCheck, Sun } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyTeam } from "@/components/layout/company-team";
import { cn } from "@/lib/utils";
import { getAllWorkspaceItems, getCompanyProfile, getCustomers, getDocuments, getExpenses, getInvoices, getProspects, getWorkspaceFiles } from "@/lib/storage";

export default function SettingsPage() {
  const [notice, setNotice] = useState(""); const [lightMode, setLightMode] = useState(false);
  useEffect(() => { const update = () => setLightMode(document.documentElement.classList.contains("light")); update(); window.addEventListener("wendico-books-theme", update); return () => window.removeEventListener("wendico-books-theme", update); }, []);
  async function exportData() { const workspace = await getAllWorkspaceItems(); const payload = { invoices: await getInvoices(), expenses: await getExpenses(), documents: await getDocuments(), customers: await getCustomers(), prospects: await getProspects(), workspace, workspaceFiles: await getWorkspaceFiles(workspace.map((item) => item.id)), company: await getCompanyProfile(), exportedAt: new Date().toISOString() }; const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `wendico-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setNotice("Daten exportiert."); }
  function toggleTheme() { const next = lightMode ? "dark" : "light"; crossFade(() => { document.documentElement.classList.toggle("light", next === "light"); window.localStorage.setItem("wendico-books.theme", next); flushSync(() => { window.dispatchEvent(new CustomEvent("wendico-books-theme")); }); }); }
  return <WorkspaceShell active="Einstellungen" title="Wendico / Einstellungen">
    <div className="page-enter">
      <PageHeader title="Einstellungen" subtitle="Datensicherung, Darstellung und Zugriff."/>
      <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <CompanyTeam/>
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:sticky xl:top-[calc(var(--header-h)+2rem)] xl:grid-cols-1">
          <Section icon={lightMode ? Sun : Moon} title="Darstellung" description={lightMode ? "Helle Oberfläche" : "Dunkle Oberfläche"} control={<label className="-m-2 flex p-2"><input type="checkbox" role="switch" className="switch" aria-label="Dunkle Oberfläche" checked={!lightMode} onChange={toggleTheme}/></label>}/>
          <Section icon={Database} title="Datensicherung" description="Lade eine Kopie aller Geschäfts- und Kontaktdaten herunter."><button onClick={exportData} className="action"><Download size={16} strokeWidth={1.6}/>Daten exportieren</button>{notice && <p role="status" className="mt-3 flex items-center gap-2.5 text-sm text-[var(--emerald)]"><span aria-hidden className="dot dot-on"/>{notice}</p>}</Section>
          <Section icon={ShieldCheck} title="Sicherheit" description="Supabase schützt den Zugriff auf eure Daten." className="sm:col-span-2 xl:col-span-1"><p className="text-[13.5px] leading-relaxed text-[var(--muted)]">Leser sehen Firmendaten. Mitarbeiter bearbeiten Geschäftsdaten. Administratoren verwalten zusätzlich das Team und Firmenprofil. Nur Inhaber ernennen Administratoren.</p></Section>
        </div>
      </div>
    </div>
  </WorkspaceShell>;
}
function Section({ icon: Icon, title, description, control, className, children }: { icon: typeof Database; title: string; description: string; control?: React.ReactNode; className?: string; children?: React.ReactNode }) { return <section className={cn("tile p-6", className)}><div className="flex items-start justify-between gap-4"><h2 className="text-base font-semibold">{title}</h2>{control}</div><p className="mt-1 flex items-start gap-2 text-[13.5px] text-[var(--muted)]"><Icon aria-hidden size={15} strokeWidth={1.6} className="mt-0.5 shrink-0"/>{description}</p>{children && <div className="mt-5">{children}</div>}</section>; }
