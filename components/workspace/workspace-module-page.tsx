"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Download, FileUp, Mail, Pencil, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { createWorkspaceItem, deleteWorkspaceItem, getWorkspaceFiles, getWorkspaceFileUrl, getWorkspaceItems, updateWorkspaceItem, uploadWorkspaceFile } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import type { WorkspaceFile, WorkspaceItem, WorkspaceModule, WorkspacePriority } from "@/types";

export type WorkspaceModuleConfig = {
  module: WorkspaceModule; navLabel: string; eyebrow: string; title: string; description: string; addLabel: string; titleLabel: string; subtitleLabel: string; statuses: string[];
  amountLabel?: string; contactFields?: boolean; dateFields?: boolean; files?: boolean;
};

type FormValue = Omit<WorkspaceItem, "id" | "module" | "createdAt" | "updatedAt" | "amount" | "tags"> & { amount: string; tags: string };

const moduleLinks = [
  ["Projekte", "/workspace/projects"], ["Ideen", "/workspace/ideas"], ["Aufgaben", "/workspace/tasks"], ["Offerten", "/workspace/offers"],
  ["Team & Partner", "/workspace/people"], ["Provisionen", "/workspace/commissions"], ["Leads", "/workspace/leads"], ["Abläufe", "/workspace/operations"],
];

export function WorkspaceModulePage({ config }: { config: WorkspaceModuleConfig }) {
  const blank = (): FormValue => ({ title: "", subtitle: "", description: "", status: config.statuses[0], priority: "medium", owner: "", contactName: "", email: "", phone: "", amount: "", startDate: "", dueDate: "", tags: "" });
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [form, setForm] = useState<FormValue>(blank);
  const [editingId, setEditingId] = useState<string>();
  const [expandedId, setExpandedId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getWorkspaceItems(config.module).then(async (data) => {
      if (!active) return;
      setItems(data);
      setFiles(await getWorkspaceFiles(data.map((item) => item.id)));
    }).catch((cause) => setNotice(cause instanceof Error ? cause.message : "Daten konnten nicht geladen werden."));
    return () => { active = false; };
  }, [config.module]);

  const filtered = useMemo(() => items
    .filter((item) => status === "all" || item.status === status)
    .filter((item) => `${item.title} ${item.subtitle ?? ""} ${item.owner ?? ""} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [items, query, status]);
  const due = items.filter((item) => item.dueDate && item.dueDate <= new Date().toISOString().slice(0, 10) && !["Erledigt", "Abgeschlossen", "Bezahlt", "Gewonnen", "Archiviert", "Angenommen", "Abgelehnt", "Verloren", "Storniert", "Ehemalig"].includes(item.status)).length;
  const totalAmount = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  const update = (key: keyof FormValue, value: string) => setForm((current) => ({ ...current, [key]: value }));
  function reset() { setForm(blank()); setEditingId(undefined); setShowForm(false); setNotice(""); }
  function edit(item: WorkspaceItem) {
    setForm({ title: item.title, subtitle: item.subtitle ?? "", description: item.description ?? "", status: item.status, priority: item.priority, owner: item.owner ?? "", contactName: item.contactName ?? "", email: item.email ?? "", phone: item.phone ?? "", amount: item.amount?.toString() ?? "", startDate: item.startDate ?? "", dueDate: item.dueDate ?? "", tags: item.tags.join(", ") });
    setEditingId(item.id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    const payload = { module: config.module, ...form, amount: form.amount ? Number(form.amount) : undefined, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) };
    try {
      if (editingId) {
        await updateWorkspaceItem(editingId, payload);
        setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...payload, updatedAt: new Date().toISOString().slice(0, 10) } : item));
      } else {
        const item = await createWorkspaceItem(payload);
        setItems((current) => [item, ...current]);
      }
      reset();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Eintrag konnte nicht gespeichert werden."); }
    finally { setBusy(false); }
  }
  async function remove(item: WorkspaceItem) { if (!window.confirm(`${item.title} löschen?`)) return; await deleteWorkspaceItem(item.id); setItems((current) => current.filter(({ id }) => id !== item.id)); setFiles((current) => current.filter(({ itemId }) => itemId !== item.id)); }
  async function upload(itemId: string, file?: File) { if (!file) return; setBusy(true); try { const uploaded = await uploadWorkspaceFile(itemId, file); setFiles((current) => [uploaded, ...current]); setNotice("Datei gespeichert."); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Upload fehlgeschlagen."); } finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; } }
  async function openFile(file: WorkspaceFile) { window.open(await getWorkspaceFileUrl(file.storagePath), "_blank", "noopener,noreferrer"); }

  return <WorkspaceShell active="Workspace" title={`Wendico / ${config.title}`}>
    <div className="page-enter">
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">{moduleLinks.map(([label, href]) => <Link key={href} href={href} className={`filter whitespace-nowrap ${label === config.navLabel ? "filter-active" : ""}`}>{label}</Link>)}</nav>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--primary)]">{config.eyebrow}</p><h1 className="mt-2 text-3xl font-semibold text-[var(--ink)]">{config.title}</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{config.description}</p></div><button onClick={() => { reset(); setShowForm(true); }} className="primary flex items-center gap-2"><Plus size={16}/>{config.addLabel}</button></div>
      {notice && <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">{notice}</div>}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3"><Metric label="Einträge" value={String(items.length)}/><Metric label="Aktuell fällig" value={String(due)}/>{config.amountLabel && <Metric label="Gesamtwert" value={formatCurrency(totalAmount)}/>}</section>
      {showForm && <Editor config={config} form={form} editing={Boolean(editingId)} busy={busy} update={update} close={reset} submit={submit}/>} 
      <div className="panel mt-5 rounded-xl p-3"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3.5 text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suchen..." className="field pl-9"/></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="field sm:w-48"><option value="all">Alle Status</option>{config.statuses.map((value) => <option key={value}>{value}</option>)}</select></div></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">{filtered.map((item) => <ItemCard key={item.id} item={item} files={files.filter((file) => file.itemId === item.id)} filesEnabled={Boolean(config.files)} expanded={expandedId === item.id} busy={busy} edit={() => edit(item)} remove={() => remove(item)} toggle={() => setExpandedId(expandedId === item.id ? undefined : item.id)} upload={(file) => upload(item.id, file)} openFile={openFile} fileInput={fileInput}/>)}{!filtered.length && <div className="panel col-span-full rounded-xl py-14 text-center text-sm text-[var(--muted)]">Keine Einträge in dieser Ansicht.</div>}</div>
    </div>
  </WorkspaceShell>;
}

function Editor({ config, form, editing, busy, update, close, submit }: { config: WorkspaceModuleConfig; form: FormValue; editing: boolean; busy: boolean; update: (key: keyof FormValue, value: string) => void; close: () => void; submit: (event: React.FormEvent) => void }) {
  return <form onSubmit={submit} className="panel page-enter mt-5 rounded-xl p-5"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold text-[var(--ink)]">{editing ? "Eintrag bearbeiten" : config.addLabel}</h2><button type="button" onClick={close} className="icon-button" aria-label="Formular schließen"><X size={17}/></button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label={config.titleLabel} value={form.title} required onChange={(value) => update("title", value)}/><Field label={config.subtitleLabel} value={form.subtitle ?? ""} onChange={(value) => update("subtitle", value)}/><Select label="Status" value={form.status} values={config.statuses} onChange={(value) => update("status", value)}/><Select label="Priorität" value={form.priority} values={["low", "medium", "high"]} labels={{ low: "Niedrig", medium: "Normal", high: "Hoch" }} onChange={(value) => update("priority", value)}/><Field label="Verantwortlich" value={form.owner ?? ""} onChange={(value) => update("owner", value)}/>{config.amountLabel && <Field label={`${config.amountLabel} (CHF)`} type="number" value={form.amount} onChange={(value) => update("amount", value)}/>} {config.contactFields && <><Field label="Kontaktperson" value={form.contactName ?? ""} onChange={(value) => update("contactName", value)}/><Field label="E-Mail" type="email" value={form.email ?? ""} onChange={(value) => update("email", value)}/><Field label="Telefon" value={form.phone ?? ""} onChange={(value) => update("phone", value)}/></>}{config.dateFields && <><Field label="Startdatum" type="date" value={form.startDate ?? ""} onChange={(value) => update("startDate", value)}/><Field label="Fällig / Termin" type="date" value={form.dueDate ?? ""} onChange={(value) => update("dueDate", value)}/></>}<Field label="Tags (mit Komma trennen)" value={form.tags} onChange={(value) => update("tags", value)}/><label className="sm:col-span-2 lg:col-span-3"><span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Beschreibung / Notizen</span><textarea rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} className="field"/></label></div><div className="mt-5 flex gap-2"><button disabled={busy} className="primary">{busy ? "Speichert..." : "Speichern"}</button><button type="button" onClick={close} className="action">Abbrechen</button></div></form>;
}

function ItemCard({ item, files, filesEnabled, expanded, busy, edit, remove, toggle, upload, openFile, fileInput }: { item: WorkspaceItem; files: WorkspaceFile[]; filesEnabled: boolean; expanded: boolean; busy: boolean; edit: () => void; remove: () => void; toggle: () => void; upload: (file?: File) => void; openFile: (file: WorkspaceFile) => void; fileInput: React.RefObject<HTMLInputElement | null> }) {
  return <article className="panel card-lift rounded-xl p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Status value={item.status}/><Priority value={item.priority}/></div><h2 className="mt-3 truncate text-lg font-semibold text-[var(--ink)]">{item.title}</h2>{item.subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{item.subtitle}</p>}</div><div className="flex gap-1"><button onClick={edit} className="icon-button" aria-label="Bearbeiten"><Pencil size={15}/></button><button onClick={remove} className="icon-button text-[#d92d20]" aria-label="Löschen"><Trash2 size={15}/></button></div></div>{item.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p>}<div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--muted)]">{item.owner && <span>Verantwortlich<br/><strong className="text-[var(--ink)]">{item.owner}</strong></span>}{item.dueDate && <span><CalendarDays size={13} className="mr-1 inline"/>Termin<br/><strong className="text-[var(--ink)]">{formatDate(item.dueDate)}</strong></span>}{item.amount != null && <span>Wert<br/><strong className="text-[var(--ink)]">{formatCurrency(item.amount)}</strong></span>}{item.email && <a href={`mailto:${item.email}`}><Mail size={13} className="mr-1 inline"/>{item.email}</a>}{item.phone && <a href={`tel:${item.phone}`}><Phone size={13} className="mr-1 inline"/>{item.phone}</a>}</div>{item.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{item.tags.map((tag) => <span key={tag} className="rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] text-[var(--primary)]">{tag}</span>)}</div>}{filesEnabled && <div className="mt-4 border-t border-[var(--line)] pt-4"><div className="flex items-center justify-between"><button onClick={toggle} className="text-xs font-semibold text-[var(--primary)]">{files.length} Datei{files.length === 1 ? "" : "en"}</button><label className="action cursor-pointer"><FileUp size={14}/>Datei<input ref={fileInput} type="file" className="hidden" disabled={busy} onChange={(event) => upload(event.target.files?.[0])}/></label></div>{expanded && <div className="mt-3 space-y-2">{files.map((file) => <button key={file.id} onClick={() => openFile(file)} className="flex w-full items-center justify-between rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-left text-xs text-[var(--muted)]"><span className="truncate">{file.name}</span><Download size={14}/></button>)}{!files.length && <p className="text-xs text-[var(--muted)]">Noch keine Dateien.</p>}</div>}</div>}</article>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label><span className="mb-2 block text-xs font-semibold text-[var(--muted)]">{label}</span><input required={required} type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? ".01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="field"/></label>; }
function Select({ label, value, values, labels, onChange }: { label: string; value: string; values: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) { return <label><span className="mb-2 block text-xs font-semibold text-[var(--muted)]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="field">{values.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}</select></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="panel rounded-xl p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-xl font-semibold text-[var(--ink)]">{value}</p></div>; }
function Status({ value }: { value: string }) { return <span className="rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold text-[var(--primary)]">{value}</span>; }
function Priority({ value }: { value: WorkspacePriority }) { return <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${value === "high" ? "bg-[#fee4e2] text-[#b42318]" : "bg-[var(--surface-soft)] text-[var(--muted)]"}`}>{{ low: "Niedrig", medium: "Normal", high: "Hoch" }[value]}</span>; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("de-CH"); }
