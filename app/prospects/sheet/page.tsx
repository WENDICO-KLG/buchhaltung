import { ExternalLink } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ProspectsTabs } from "@/components/prospects-section";

// Google Sheet der Prospects. Wer es sehen soll, braucht Zugriff in Google Drive. docs.google.com ist dafür in proxy.ts (frame-src) freigegeben.
const sheetUrl = "https://docs.google.com/spreadsheets/d/1RixgpdEGiVDzvoi04tkUbGGIcnoExJdLgBvly1OE_8M/edit";

export default function ProspectSheetPage() {
  return <WorkspaceShell active="Prospects" title="Wendico / Prospects / Tabelle">
    <div className="page-enter pb-10">
      <ProspectsTabs current="/prospects/sheet"/>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--primary)]">Vertrieb · Google Sheets</p>
          <h1 className="mt-3 text-3xl font-semibold">Tabelle</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">Direkt hier oder in Google Drive bearbeiten. Änderungen sind sofort für alle sichtbar.</p>
        </div>
        <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="action whitespace-nowrap"><ExternalLink size={16}/>In Google Sheets öffnen</a>
      </div>
      <iframe title="Prospects-Tabelle" src={sheetUrl} allow="clipboard-write" className="mt-6 block h-[calc(100dvh-17rem)] min-h-[28rem] w-full rounded-2xl border border-[var(--line)] bg-white"/>
      <p className="mt-3 text-xs text-[var(--muted)]">Leer oder Anmeldefenster? Im Browser mit dem Google-Konto anmelden, das für die Tabelle freigegeben ist, oder die Tabelle über den Knopf oben öffnen.</p>
    </div>
  </WorkspaceShell>;
}
