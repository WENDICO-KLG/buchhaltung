import { ExternalLink } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { ProspectsTabs } from "@/components/prospects-section";

// Google Sheet der Prospects. Wer es sehen soll, braucht Zugriff in Google Drive. docs.google.com ist dafür in proxy.ts (frame-src) freigegeben.
const sheetUrl = "https://docs.google.com/spreadsheets/d/1RixgpdEGiVDzvoi04tkUbGGIcnoExJdLgBvly1OE_8M/edit";

export default function ProspectSheetPage() {
  return <WorkspaceShell active="Prospects" title="Wendico / Prospects / Tabelle">
    <div className="page-enter pb-10">
      <ProspectsTabs current="/prospects/sheet"/>
      <PageHeader title="Tabelle" subtitle="Direkt hier oder in Google Drive bearbeiten. Änderungen sind sofort für alle sichtbar." actions={<a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="action whitespace-nowrap max-sm:w-full"><ExternalLink size={16}/>In Google Sheets öffnen</a>}/>
      <div className="raised mt-7 rounded-2xl p-1.5 sm:p-2"><iframe title="Prospects-Tabelle" src={sheetUrl} allow="clipboard-write" className="block h-[calc(100dvh-19rem)] min-h-[28rem] w-full rounded-xl bg-white"/></div>
      <p className="mt-4 max-w-prose text-sm text-[var(--muted)]">Leer oder Anmeldefenster? Im Browser mit dem Google-Konto anmelden, das für die Tabelle freigegeben ist, oder die Tabelle über den Knopf oben öffnen.</p>
    </div>
  </WorkspaceShell>;
}
