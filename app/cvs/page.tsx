"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, FileImage, FileText, FolderOpen, Upload } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocuments, getDocumentUrl, uploadDocument } from "@/lib/storage";
import type { Document } from "@/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const fileRef = useRef<HTMLInputElement>(null); const [form, setForm] = useState({ name: "", documentDate: new Date().toISOString().slice(0, 10) });
  useEffect(() => { getDocuments().then(setDocuments).catch((cause) => setNotice(cause instanceof Error ? cause.message : "Belege konnten nicht geladen werden.")).finally(() => setLoading(false)); }, []);
  async function upload(file?: File) { if (!file || !form.name) { setNotice("Bitte Bezeichnung und Datei angeben."); return; } setBusy(true); try { const document = await uploadDocument(form, file); setDocuments((current) => [document, ...current]); setForm((current) => ({ ...current, name: "" })); setNotice("Beleg gespeichert."); if (fileRef.current) fileRef.current.value = ""; } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Upload fehlgeschlagen."); } finally { setBusy(false); } }
  async function preview(document: Document) { if (document.storagePath) window.open(await getDocumentUrl(document.storagePath), "_blank", "noopener,noreferrer"); }
  const saved = notice === "Beleg gespeichert.";
  const years = [...new Set(documents.map((document) => document.documentDate.slice(0, 4)))].sort().reverse();
  return <WorkspaceShell active="Belege" title="Wendico / Belege"><div className="page-enter">
    <PageHeader title="Belege" subtitle="Geschäftliche Belege einfach hochladen und wiederfinden."/>
    {notice && <div role={saved ? "status" : "alert"} className={`mt-6 rounded-xl border px-4 py-3 text-sm ${saved ? "border-[color-mix(in_srgb,var(--emerald)_40%,transparent)] bg-[var(--emerald-soft)] text-[var(--emerald)]" : "border-[color-mix(in_srgb,var(--coral)_40%,transparent)] bg-[var(--coral-soft)] text-[var(--coral)]"}`}>{notice}</div>}
    <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section aria-label="Beleg hochladen" className="raised grid gap-5 rounded-2xl p-5 md:p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:order-2">
        <h2 className="text-lg font-semibold">Beleg hochladen</h2>
        <Field label="Bezeichnung" value={form.name} onChange={(value) => setForm({ ...form, name: value })}/>
        <Field label="Datum" type="date" value={form.documentDate} onChange={(value) => setForm({ ...form, documentDate: value })}/>
        <label className="block"><span className="mb-2 block text-[13px] text-[var(--muted)]">Datei</span>
          <span className={`relative flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--field)] px-4 py-5 text-center transition-colors focus-within:border-[var(--gold)] focus-within:ring-3 focus-within:ring-[var(--gold-soft)] hover:border-[var(--gold)] ${busy ? "opacity-60" : ""}`}>
            <Upload aria-hidden size={22} strokeWidth={1.5} className="text-[var(--gold)]"/>
            <span aria-hidden className="mt-3 text-sm font-semibold">{busy ? "Beleg wird hochgeladen..." : "Datei auswählen oder ablegen"}</span>
            <span className="mt-1 text-[13px] text-[var(--muted)]">PDF, PNG, JPG oder WebP, maximal 10 MB</span>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" disabled={busy} onChange={(event) => upload(event.target.files?.[0])} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"/>
          </span>
        </label>
      </section>
      <section aria-label="Belege" aria-busy={loading} className="panel overflow-hidden rounded-2xl">
        {years.map((year, index) => { const entries = documents.filter((document) => document.documentDate.startsWith(year)); return <div key={year} className={index ? "border-t border-[var(--hairline)]" : ""}>
          <div className="flex items-baseline justify-between px-5 pb-3 pt-5 md:px-7 md:pt-6"><h2 className="display text-2xl">{year}</h2><span className="text-[13px] text-[var(--muted)]">{entries.length} {entries.length === 1 ? "Beleg" : "Belege"}</span></div>
          <ul>{entries.map((document) => { const Icon = document.fileType?.startsWith("image/") ? FileImage : FileText; return <li key={document.id} className="flex items-center gap-4 border-t border-[var(--line)] px-5 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] md:px-7">
            <Icon aria-hidden size={22} strokeWidth={1.4} className="flex-none text-[var(--muted)]"/>
            <div className="min-w-0 flex-1"><h3 className="break-words font-semibold leading-snug">{document.name}</h3><p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-[var(--muted)]"><span className="money">{new Date(document.documentDate).toLocaleDateString("de-CH")}</span><span className="max-w-full truncate">{document.fileName}</span></p></div>
            <button disabled={!document.storagePath} onClick={() => preview(document)} aria-label={`Ansehen: ${document.name}`} className="action flex-none px-3 disabled:opacity-40"><Eye size={17} strokeWidth={1.7}/><span className="hidden sm:inline">Ansehen</span></button>
          </li>; })}</ul>
        </div>; })}
        {!documents.length && (loading ? <div className="grid gap-4 p-6">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-12"/>)}</div> : <EmptyState icon={FolderOpen} title={busy ? "Beleg wird hochgeladen..." : "Noch keine Belege abgelegt."}/>)}
      </section>
    </div>
  </div></WorkspaceShell>;
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="min-w-0"><span className="mb-2 block text-[13px] text-[var(--muted)]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field min-w-0"/></label>; }
