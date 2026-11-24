"use client";

import { useEffect, useMemo, useState } from "react";
import { ContactRound, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ProspectsTabs } from "@/components/prospects-section";
import { celebrate } from "@/components/ui/celebration";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { Guilloche } from "@/components/ui/guilloche";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { Status } from "@/components/ui/status";
import { toneColor, type Tone } from "@/components/ui/tone";
import { createProspect, deleteProspect, getProspects, updateProspect } from "@/lib/storage";
import { formatCurrency, todayKey } from "@/lib/utils";
import type { Prospect, ProspectStatus } from "@/types";
import { ErrorNote, Field, FieldGroup, fieldLabel, FormDialog } from "./_components/form-dialog";

type ProspectForm = Omit<Prospect, "id" | "createdAt" | "updatedAt">;
const emptyForm: ProspectForm = { companyName: "", contactName: "", email: "", phone: "", source: "", status: "new", lastContactAt: "", nextTask: "", nextTaskAt: "", estimatedValue: undefined, notes: "" };
const labels: Record<ProspectStatus, string> = { new: "Neu", contacted: "Kontaktiert", meeting: "Gespräch", offer: "Offerte", won: "Gewonnen", lost: "Abgesagt" };
const tones: Record<ProspectStatus, Tone> = { new: "neutral", contacted: "neutral", meeting: "info", offer: "info", won: "positive", lost: "negative" };
const statuses = Object.keys(labels) as ProspectStatus[];
const isOpen = (status: ProspectStatus) => status !== "won" && status !== "lost";
const sumValue = (items: Prospect[]) => items.reduce((sum, prospect) => sum + (prospect.estimatedValue ?? 0), 0);
const countLabel = (count: number) => `${count} ${count === 1 ? "Prospect" : "Prospects"}`;

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<ProspectForm>(emptyForm);
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");
  const [error, setError] = useState("");

  useEffect(() => { getProspects().then(setProspects).catch((cause) => setError(cause instanceof Error ? cause.message : "Prospects konnten nicht geladen werden.")).finally(() => setLoaded(true)); }, []);

  const stages = useMemo(() => statuses.map((status) => {
    const items = prospects.filter((prospect) => prospect.status === status);
    return { status, items, value: sumValue(items) };
  }), [prospects]);
  const shown = stages.filter(({ status, items }) => filter === "all" ? items.length : status === filter && items.length);
  const open = prospects.filter((prospect) => isOpen(prospect.status));
  const withoutValue = open.filter((prospect) => prospect.estimatedValue == null).length;
  const highest = Math.max(0, ...stages.map((stage) => stage.value));

  function edit(prospect: Prospect) { const { id, createdAt, updatedAt, ...values } = prospect; void id; void createdAt; void updatedAt; setForm(values); setEditingId(prospect.id); setShowForm(true); }
  function reset() { setForm(emptyForm); setEditingId(undefined); setShowForm(false); setError(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (editingId) {
        const savedStatus = prospects.find((prospect) => prospect.id === editingId)?.status;
        await updateProspect(editingId, form);
        setProspects((current) => current.map((prospect) => prospect.id === editingId ? { ...prospect, ...form } : prospect));
        if (savedStatus && savedStatus !== "won" && form.status === "won") celebrate({ title: form.companyName, amount: form.estimatedValue });
      } else {
        const prospect = await createProspect(form);
        setProspects((current) => [prospect, ...current]);
      }
      reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Prospect konnte nicht gespeichert werden."); }
  }
  async function remove(id: string) { if (!window.confirm("Prospect löschen?")) return; await deleteProspect(id); setProspects((current) => current.filter((prospect) => prospect.id !== id)); }
  const set = (key: keyof ProspectForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setValue = (value: string) => setForm((current) => ({ ...current, estimatedValue: value ? Number(value) : undefined }));
  const add = () => { reset(); setShowForm(true); };

  return <WorkspaceShell active="Prospects" title="Wendico / Prospects">
    <div className="page-enter">
      <ProspectsTabs current="/prospects"/>
      <PageHeader title="Prospects" subtitle="Kontakte, nächste Aufgaben und aktuellen Stand pflegen." actions={<button onClick={add} className="primary max-sm:w-full"><Plus size={16}/>Prospect hinzufügen</button>}/>
      {error && !showForm && <ErrorNote className="mt-6">{error}</ErrorNote>}

      <section aria-label="Pipeline nach Stand" className="panel relative isolate mt-8 overflow-hidden rounded-3xl">
        <Guilloche className="absolute -right-20 -top-44 -z-10 w-[34rem] max-sm:-right-64"/>
        <div className="p-5 sm:p-8">
          {loaded
            ? <Stat size="lg" label="Offene Pipeline" value={<CountUp value={sumValue(open)} format={formatCurrency}/>} hint={`${countLabel(open.length)} von Neu bis Offerte${withoutValue ? `, ${withoutValue} ohne Wert` : ""}`}/>
            : <div className="w-full max-w-md"><Skeleton className="w-28"/><Skeleton className="mt-4 h-14 w-full"/><Skeleton className="mt-4 w-48"/></div>}
        </div>
        <div role="group" aria-label="Nach Stand filtern" className="grid grid-cols-2 gap-px border-t border-[var(--line)] bg-[var(--line)] md:grid-cols-3 xl:grid-cols-6">
          {stages.map(({ status, items, value }) => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(filter === status ? "all" : status)} className={`flex min-w-0 flex-col p-4 text-left transition-colors focus-visible:outline-offset-[-3px] sm:px-5 sm:py-5 ${filter === status ? "bg-[var(--surface-soft)] shadow-[inset_0_2px_0_var(--gold)]" : "bg-[var(--surface)] hover:bg-[var(--surface-soft)]"}`}>
            <span className="flex w-full items-baseline justify-between gap-2 text-sm"><span className={filter === status ? "font-semibold" : "text-[var(--muted)]"}>{labels[status]}</span><span className="money text-[var(--muted)]">{items.length}<span className="sr-only"> Prospects</span></span></span>
            <span className="money mt-2 text-base font-semibold tracking-tight sm:text-lg">{formatCurrency(value)}</span>
            <span aria-hidden className="mt-4 block h-1 w-full overflow-hidden rounded-full bg-[var(--ring-track)]"><span className="bar-value block h-full rounded-full" style={{ width: `${highest ? Math.max(0, value / highest) * 100 : 0}%`, background: toneColor[tones[status]] }}/></span>
          </button>)}
        </div>
      </section>

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{filter === "all" ? "Alle Prospects" : labels[filter]}</h2>
        <button aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={filter === "all" ? "filter-active" : "filter"}>Alle<span className="money ml-2 text-[var(--muted)]">{prospects.length}</span></button>
      </div>

      <div className="panel mt-4 overflow-hidden rounded-2xl bg-[var(--surface)]">
        {!loaded ? <div className="space-y-6 p-6">{[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-10"/>)}</div>
          : shown.length ? shown.map(({ status, items, value }) => <section key={status} aria-label={labels[status]} className="border-t border-[var(--line)] first:border-t-0">
            <h3 className="flex items-center justify-between gap-4 bg-[var(--surface-soft)] px-4 py-3 text-sm sm:px-6"><span className="flex items-center gap-3"><Status tone={tones[status]} className="text-sm font-semibold">{labels[status]}</Status><span className="money font-normal text-[var(--muted)]">{items.length}</span></span><span className="money font-semibold text-[var(--muted)]">{formatCurrency(value)}</span></h3>
            <ul>{items.map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} onEdit={() => edit(prospect)} onRemove={() => remove(prospect.id)}/>)}</ul>
          </section>)
          : <EmptyState icon={ContactRound} title={prospects.length ? "Keine Prospects in dieser Ansicht." : "Noch keine Prospects erfasst."} text={prospects.length ? undefined : "Mit dem ersten Eintrag beginnt die Pipeline."} action={prospects.length ? <button onClick={() => setFilter("all")} className="action">Alle anzeigen</button> : undefined}/>}
      </div>
    </div>

    {showForm && <FormDialog title={editingId ? "Prospect bearbeiten" : "Prospect hinzufügen"} submitLabel={editingId ? "Änderungen speichern" : "Prospect speichern"} error={error} onSubmit={submit} onClose={reset}>
      <FieldGroup title="Stand und Wert">
        <div className="sm:col-span-2"><Field label="Firma / Name" required value={form.companyName} onChange={(value) => set("companyName", value)}/></div>
        <label><span className={fieldLabel}>Aktueller Stand</span><select value={form.status} onChange={(event) => set("status", event.target.value)} className="field">{statuses.map((key) => <option key={key} value={key}>{labels[key]}</option>)}</select></label>
        <Field label="Wahrscheinlicher Auftragswert (CHF)" type="number" value={form.estimatedValue?.toString() ?? ""} onChange={setValue}/>
      </FieldGroup>
      <FieldGroup title="Kontakt">
        <Field label="Kontaktperson" value={form.contactName ?? ""} onChange={(value) => set("contactName", value)}/>
        <Field label="Quelle" value={form.source ?? ""} onChange={(value) => set("source", value)}/>
        <Field label="E-Mail" type="email" value={form.email ?? ""} onChange={(value) => set("email", value)}/>
        <Field label="Telefon" value={form.phone ?? ""} onChange={(value) => set("phone", value)}/>
      </FieldGroup>
      <FieldGroup title="Nächster Schritt">
        <label className="sm:col-span-2"><span className={fieldLabel}>Nächste Aufgabe</span><input value={form.nextTask ?? ""} onChange={(event) => set("nextTask", event.target.value)} placeholder="z.B. Offerte nachfassen" className="field"/></label>
        <Field label="Nächste Aufgabe am" type="date" value={form.nextTaskAt ?? ""} onChange={(value) => set("nextTaskAt", value)}/>
        <Field label="Zuletzt kontaktiert" type="date" value={form.lastContactAt ?? ""} onChange={(value) => set("lastContactAt", value)}/>
        <label className="sm:col-span-2"><span className={fieldLabel}>Notizen</span><input value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className="field"/></label>
      </FieldGroup>
    </FormDialog>}
  </WorkspaceShell>;
}

function ProspectRow({ prospect, onEdit, onRemove }: { prospect: Prospect; onEdit: () => void; onRemove: () => void }) {
  const overdue = isOpen(prospect.status) && Boolean(prospect.nextTaskAt) && prospect.nextTaskAt!.slice(0, 10) < todayKey();
  return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 border-t border-[var(--line)] px-4 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.05fr)_minmax(0,1.25fr)_7.75rem_auto] lg:gap-x-6">
    <div className="min-w-0">
      <p className="font-semibold leading-snug [overflow-wrap:anywhere]">{prospect.companyName}</p>
      <p className="mt-0.5 text-sm text-[var(--muted)]">{prospect.contactName || prospect.source || "-"}</p>
      {prospect.notes && <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--muted)]">{prospect.notes}</p>}
    </div>
    <div className="text-right lg:order-4"><p className={`money font-semibold ${prospect.estimatedValue == null ? "text-[var(--muted)]" : ""}`}>{prospect.estimatedValue != null ? formatCurrency(prospect.estimatedValue) : "-"}</p></div>
    <div className="col-span-2 min-w-0 text-sm max-lg:col-start-1 lg:order-2 lg:col-span-1">
      <p className={prospect.nextTask ? "" : "text-[var(--muted)]"}>{prospect.nextTask || "Keine Aufgabe"}</p>
      {prospect.nextTaskAt && <p className={`money mt-0.5 ${overdue ? "font-medium text-[var(--coral)]" : "text-[var(--muted)]"}`}>{overdue ? "Überfällig seit " : ""}{formatDate(prospect.nextTaskAt)}</p>}
      <p className="money mt-0.5 text-[13px] text-[var(--muted)]">{prospect.lastContactAt ? `Letzter Kontakt ${formatDate(prospect.lastContactAt)}` : formatDate()}</p>
    </div>
    <div className="col-span-2 flex min-w-0 flex-wrap gap-x-5 text-sm text-[var(--muted)] max-lg:col-start-1 max-lg:row-start-3 max-lg:pr-24 lg:order-3 lg:col-span-1 lg:block lg:space-y-1">
      {prospect.email && <a href={`mailto:${prospect.email}`} className="flex min-w-0 items-center gap-2 hover:text-[var(--ink)] max-lg:min-h-11"><Mail aria-hidden size={14} className="flex-none"/><span className="truncate">{prospect.email}</span></a>}
      {prospect.phone && <a href={`tel:${prospect.phone}`} className="money flex min-w-0 items-center gap-2 hover:text-[var(--ink)] max-lg:min-h-11"><Phone aria-hidden size={14} className="flex-none"/><span className="truncate">{prospect.phone}</span></a>}
    </div>
    <div className="flex justify-end gap-1 max-lg:col-start-2 max-lg:row-start-3 max-lg:self-center lg:order-5 lg:-mt-1.5">
      <button onClick={onEdit} aria-label="Prospect bearbeiten" title={`${prospect.companyName} bearbeiten`} className="icon-button"><Pencil size={16}/></button>
      <button onClick={onRemove} aria-label="Prospect löschen" title={`${prospect.companyName} löschen`} className="icon-button hover:!text-[var(--coral)]"><Trash2 size={16}/></button>
    </div>
  </li>;
}
function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString("de-CH") : "Noch kein Kontakt"; }
