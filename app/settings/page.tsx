"use client";

import { useEffect, useState } from "react";
import { Database, Download, Moon, ShieldCheck, Sun } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyTeam } from "@/components/layout/company-team";
import { getAllWorkspaceItems, getCompanyProfile, getCustomers, getDocuments, getExpenses, getInvoices, getProspects, getWorkspaceFiles } from "@/lib/storage";

export default function SettingsPage() {
  const [notice, setNotice] = useState(""); const [lightMode, setLightMode] = useState(false);
  useEffect(() => { const update = () => setLightMode(document.documentElement.classList.contains("light")); update(); window.addEventListener("wendico-books-theme", update); return () => window.removeEventListener("wendico-books-theme", update); }, []);
  async function exportData() { const workspace = await getAllWorkspaceItems(); const payload = { invoices: await getInvoices(), expenses: await getExpenses(), documents: await getDocuments(), customers: await getCustomers(), prospects: await getProspects(), workspace, workspaceFiles: await getWorkspaceFiles(workspace.map((item) => item.id)), company: await getCompanyProfile(), exportedAt: new Date().toISOString() }; const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `wendico-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setNotice("Daten exportiert."); }
  function toggleTheme() { const next = lightMode ? "dark" : "light"; document.documentElement.classList.toggle("light", next === "light"); window.localStorage.setItem("wendico-books.theme", next); window.dispatchEvent(new CustomEvent("wendico-books-theme")); }
  return <WorkspaceShell active="Einstellungen" title="Wendico / Einstellungen">
    <div className="page-enter">
      <PageHeader title="Einstellungen" subtitle="Datensicherung, Darstellung und Zugriff."/>
      <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <CompanyTeam/>
        <div className="plate divide-y divide-[var(--line)] rounded-2xl px-5 sm:px-7 xl:sticky xl:top-[calc(var(--header-h)+2rem)]">
          <Section icon={Database} title="Datensicherung" description="Lade eine Kopie aller Geschäfts- und Kontaktdaten herunter."><button onClick={exportData} className="action"><Download size={17}/>Daten exportieren</button>{notice && <p role="status" className="mt-3 text-sm text-[var(--emerald)]">{notice}</p>}</Section>
          <Section icon={lightMode ? Sun : Moon} title="Darstellung" description="Wechsle zwischen heller und dunkler Oberfläche."><button onClick={toggleTheme} className="action">{lightMode ? <Moon size={17}/> : <Sun size={17}/>}Modus wechseln</button></Section>
          <Section icon={ShieldCheck} title="Sicherheit" description="Supabase schützt den Zugriff auf eure Daten."><p className="text-sm text-[var(--muted)]">Leser sehen Firmendaten. Mitarbeiter bearbeiten Geschäftsdaten. Administratoren verwalten zusätzlich das Team und Firmenprofil. Nur Inhaber ernennen Administratoren.</p></Section>
        </div>
      </div>
    </div>
  </WorkspaceShell>;
}
function Section({ icon: Icon, title, description, children }: { icon: typeof Database; title: string; description: string; children: React.ReactNode }) { return <section className="py-6"><h2 className="flex items-center gap-2.5 text-lg font-semibold"><Icon aria-hidden size={19} strokeWidth={1.6} className="text-[var(--muted)]"/>{title}</h2><p className="mt-1.5 text-sm text-[var(--muted)]">{description}</p><div className="mt-4">{children}</div></section>; }
