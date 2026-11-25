"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ContactRound, Mail, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ProspectsTabs } from "@/components/prospects-section";
import { celebrate } from "@/components/ui/celebration";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import type { Tone } from "@/components/ui/tone";
import { hasMessage, prospectMatcher, prospectSearchText } from "@/lib/prospect-search";
import { createProspect, deleteProspect, getProspects, updateProspect } from "@/lib/storage";
import { formatCurrency, todayKey } from "@/lib/utils";
import type { Prospect, ProspectStatus } from "@/types";
import { ErrorNote, Field, FieldGroup, fieldLabel, FormDialog } from "./_components/form-dialog";
import { Message, MessageHeading } from "./_components/message";
import styles from "./pipeline.module.css";

type ProspectForm = Omit<Prospect, "id" | "message" | "messageAt" | "createdAt" | "updatedAt">;
const emptyForm: ProspectForm = { companyName: "", contactName: "", email: "", phone: "", source: "", status: "new", lastContactAt: "", nextTask: "", nextTaskAt: "", estimatedValue: undefined, notes: "" };
const labels: Record<ProspectStatus, string> = { new: "Neu", contacted: "Kontaktiert", meeting: "Gespräch", offer: "Offerte", won: "Gewonnen", lost: "Abgesagt" };
const tones: Record<ProspectStatus, Tone> = { new: "neutral", contacted: "neutral", meeting: "info", offer: "info", won: "positive", lost: "negative" };
const statuses = Object.keys(labels) as ProspectStatus[];
const pageSize = 50;
const isOpen = (status: ProspectStatus) => status !== "won" && status !== "lost";
const sumValue = (items: Prospect[]) => items.reduce((sum, prospect) => sum + (prospect.estimatedValue ?? 0), 0);
const plainAmount = (value: number) => formatCurrency(value).replace(/^CHF\s*/, "");
const countLabel = (count: number) => `${count} ${count === 1 ? "Prospect" : "Prospects"}`;

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<ProspectForm>(emptyForm);
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [withMessage, setWithMessage] = useState(false);
  const [error, setError] = useState("");
  // Typing stays instant; the list follows as soon as there is time for it.
  const search = useDeferredValue(query.trim());

  useEffect(() => { getProspects().then(setProspects).catch((cause) => setError(cause instanceof Error ? cause.message : "Prospects konnten nicht geladen werden.")).finally(() => setLoaded(true)); }, []);

  const stages = useMemo(() => statuses.map((status) => {
    const items = prospects.filter((prospect) => prospect.status === status);
    return { status, items, value: sumValue(items) };
  }), [prospects]);
  const texts = useMemo(() => new Map(prospects.map((prospect) => [prospect.id, prospectSearchText(prospect)])), [prospects]);
  const messages = useMemo(() => prospects.filter(hasMessage).length, [prospects]);
  const shown = useMemo(() => {
    const matches = prospectMatcher(search);
    return stages.filter(({ status }) => filter === "all" || status === filter).map((stage) => {
      if (!search && !withMessage) return stage;
      const items = stage.items.filter((prospect) => (!withMessage || hasMessage(prospect)) && matches(texts.get(prospect.id) ?? ""));
      return { ...stage, items, value: sumValue(items) };
    }).filter(({ items }) => items.length);
  }, [stages, texts, filter, withMessage, search]);
  const hits = shown.reduce((sum, { items }) => sum + items.length, 0);
  const open = prospects.filter((prospect) => isOpen(prospect.status));
  const withoutValue = open.filter((prospect) => prospect.estimatedValue == null).length;
  const editing = prospects.find((prospect) => prospect.id === editingId);
  const highest = Math.max(0, ...stages.map((stage) => stage.value));

  const edit = useCallback((prospect: Prospect) => { const { id, message, messageAt, createdAt, updatedAt, ...values } = prospect; void id; void message; void messageAt; void createdAt; void updatedAt; setForm(values); setEditingId(prospect.id); setShowForm(true); }, []);
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
  const remove = useCallback(async (id: string) => { if (!window.confirm("Prospect löschen?")) return; await deleteProspect(id); setProspects((current) => current.filter((prospect) => prospect.id !== id)); }, []);
  function showAll() { setFilter("all"); setWithMessage(false); setQuery(""); }
  const everything = filter === "all" && !withMessage;
  const set = (key: keyof ProspectForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setValue = (value: string) => setForm((current) => ({ ...current, estimatedValue: value ? Number(value) : undefined }));
  const add = () => { reset(); setShowForm(true); };

  return <WorkspaceShell active="Prospects" title="Wendico / Prospects">
    <div className="page-enter">
      <ProspectsTabs current="/prospects"/>
      <PageHeader title="Prospects" subtitle="Kontakte, nächste Aufgaben und aktuellen Stand pflegen." actions={<button onClick={add} className="primary max-sm:w-full"><Plus size={16} strokeWidth={1.8}/>Prospect hinzufügen</button>}/>
      {error && !showForm && <ErrorNote className="mt-6">{error}</ErrorNote>}

      <section aria-label="Pipeline nach Stand" className="raised mt-7 p-5 sm:p-7">
        {loaded ? <>
          <p className="text-sm text-[var(--muted)]">Offene Pipeline</p>
          <p className="display mt-2 flex flex-wrap items-baseline gap-x-2.5"><span className="text-lg text-[var(--muted)] sm:text-2xl">CHF</span><span className="text-[clamp(2.5rem,5vw,3.5rem)]"><CountUp value={sumValue(open)} format={plainAmount}/></span></p>
          <p className="mt-2 text-sm text-[var(--muted)]">{countLabel(open.length)} von Neu bis Offerte{withoutValue ? `, ${withoutValue} ohne Wert` : ""}</p>
        </> : <div className="w-full max-w-md"><Skeleton className="w-28"/><Skeleton className="mt-4 h-14 w-full"/><Skeleton className="mt-4 w-48"/></div>}
        <div role="group" aria-label="Nach Stand filtern" className={styles.scale}>
          {stages.map(({ status, items, value }) => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(filter === status ? "all" : status)} className={`${styles.stage} ${items.length ? "" : styles.empty}`}>
            <span aria-hidden className={styles.bar} data-won={status === "won" && value > 0 ? "" : undefined}><span style={{ height: `${highest ? Math.max(0, value / highest) * 100 : 0}%` }}/></span>
            <span className={styles.label}>{labels[status]}<span className="money">{items.length}<span className="sr-only"> Prospects</span></span></span>
            <span className={`${styles.value} money`}>{formatCurrency(value)}</span>
          </button>)}
        </div>
      </section>

      <section aria-labelledby="prospects-title" className="panel mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-6 lg:flex-row lg:items-center">
          <h2 id="prospects-title" className="flex-none text-base font-semibold">{filter === "all" ? "Alle Prospects" : labels[filter]}</h2>
          <label className="min-w-0 lg:ml-auto lg:w-full lg:max-w-sm"><span className="sr-only">Prospects durchsuchen</span><span className="relative block"><Search aria-hidden size={17} strokeWidth={1.6} className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-[var(--muted)]"/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Firma, E-Mail, Telefon, Nachricht" className={`field ${styles.search}`}/></span></label>
          <div role="group" aria-label="Prospects filtern" className="pill-track w-fit flex-none">
            <button aria-pressed={everything} onClick={() => { setFilter("all"); setWithMessage(false); }} className={everything ? "filter-active" : "filter"}>Alle<span className="money ml-1">{prospects.length}</span></button>
            <button aria-pressed={withMessage} onClick={() => setWithMessage(!withMessage)} className={withMessage ? "filter-active" : "filter"}>Mit Nachricht<span className="money ml-1">{messages}</span></button>
          </div>
        </div>
        <p role="status" className={search ? "px-5 text-sm text-[var(--muted)] sm:px-7" : "sr-only"}>{search ? `${countLabel(hits)} gefunden` : ""}</p>
        {!loaded ? <div className="space-y-6 p-7">{[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-10"/>)}</div>
          : shown.length ? <ProspectList stages={shown} view={`${filter}|${withMessage}|${search}`} onEdit={edit} onRemove={remove}/>
          : <EmptyState icon={ContactRound} className="pt-6" title={prospects.length ? "Keine Prospects in dieser Ansicht." : "Noch keine Prospects erfasst."} text={prospects.length ? undefined : "Mit dem ersten Eintrag beginnt die Pipeline."} action={prospects.length ? <button onClick={showAll} className="action">Alle anzeigen</button> : undefined}/>}
      </section>
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
      {editing && hasMessage(editing) && <section aria-label="Nachricht" className="tile px-5 py-4 text-sm">
        <MessageHeading at={editing.messageAt}/>
        <p tabIndex={0} className="mt-1.5 max-h-64 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]">{editing.message}</p>
      </section>}
      <FieldGroup title="Nächster Schritt">
        <label className="sm:col-span-2"><span className={fieldLabel}>Nächste Aufgabe</span><input value={form.nextTask ?? ""} onChange={(event) => set("nextTask", event.target.value)} placeholder="z.B. Offerte nachfassen" className="field"/></label>
        <Field label="Nächste Aufgabe am" type="date" value={form.nextTaskAt ?? ""} onChange={(value) => set("nextTaskAt", value)}/>
        <Field label="Zuletzt kontaktiert" type="date" value={form.lastContactAt ?? ""} onChange={(value) => set("lastContactAt", value)}/>
        <label className="sm:col-span-2"><span className={fieldLabel}>Notizen</span><input value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className="field"/></label>
      </FieldGroup>
    </FormDialog>}
  </WorkspaceShell>;
}

type Stage = { status: ProspectStatus; items: Prospect[]; value: number };
type RowActions = { onEdit: (prospect: Prospect) => void; onRemove: (id: string) => void };

const ProspectList = memo(function ProspectList({ stages, view, ...actions }: { stages: Stage[]; view: string } & RowActions) {
  return <div className="pb-2">{stages.map((stage) => <StageSection key={stage.status} stage={stage} view={view} {...actions}/>)}</div>;
});

function StageSection({ stage: { status, items, value }, view, onEdit, onRemove }: { stage: Stage; view: string } & RowActions) {
  // A new search or filter starts at the first rows again.
  const [more, setMore] = useState({ view, limit: pageSize });
  const limit = more.view === view ? more.limit : pageSize;
  return <section aria-label={labels[status]} className="px-5 sm:px-7">
    <h3 className="flex items-center justify-between gap-4 pb-2.5 pt-6 text-sm"><span className="flex items-center gap-3"><Status tone={tones[status]}>{labels[status]}</Status><span className="money text-[13.5px] font-normal text-[var(--muted)]">{items.length}</span></span><span className="money text-[13.5px] font-normal text-[var(--muted)]">{formatCurrency(value)}</span></h3>
    <ul>{items.slice(0, limit).map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} onEdit={onEdit} onRemove={onRemove}/>)}</ul>
    {items.length > limit && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--line)] py-4"><button onClick={() => setMore({ view, limit: limit + pageSize })} aria-label={`Mehr anzeigen: ${labels[status]}`} className="action">Mehr anzeigen</button><span className="money text-[13.5px] text-[var(--muted)]">{limit} von {items.length}</span></div>}
  </section>;
}

const ProspectRow = memo(function ProspectRow({ prospect, onEdit, onRemove }: { prospect: Prospect } & RowActions) {
  const overdue = isOpen(prospect.status) && Boolean(prospect.nextTaskAt) && prospect.nextTaskAt!.slice(0, 10) < todayKey();
  return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 border-t border-[var(--line)] py-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.05fr)_minmax(0,1.25fr)_7.75rem_auto] xl:gap-x-6 xl:py-5">
    <div className="min-w-0">
      <p className="font-medium leading-snug [overflow-wrap:anywhere]">{prospect.companyName}</p>
      <p className="mt-0.5 text-sm text-[var(--muted)]">{prospect.contactName || prospect.source || "-"}</p>
      {prospect.notes && <p className="mt-1.5 line-clamp-2 text-[13.5px] text-[var(--muted)]">{prospect.notes}</p>}
    </div>
    <div className="text-right xl:order-4"><p className={`money font-medium ${prospect.estimatedValue == null ? "text-[var(--muted)]" : ""}`}>{prospect.estimatedValue != null ? formatCurrency(prospect.estimatedValue) : "-"}</p></div>
    <div className="min-w-0 text-sm max-xl:col-start-1 max-xl:row-start-2 xl:order-2">
      <p className={prospect.nextTask ? "" : "text-[var(--muted)]"}>{prospect.nextTask || "Keine Aufgabe"}</p>
      {prospect.nextTaskAt && <p className={`money mt-0.5 ${overdue ? "font-medium text-[var(--coral)]" : "text-[var(--muted)]"}`}>{overdue ? "Überfällig seit " : ""}{formatDate(prospect.nextTaskAt)}</p>}
      <p className="money mt-0.5 text-[13.5px] text-[var(--muted)]">{prospect.lastContactAt ? `Letzter Kontakt ${formatDate(prospect.lastContactAt)}` : formatDate()}</p>
    </div>
    <div className="min-w-0 text-sm text-[var(--muted)] max-xl:col-span-2 max-xl:col-start-1 max-xl:row-start-3 xl:order-3 xl:space-y-1">
      {prospect.email && <a href={`mailto:${prospect.email}`} className={styles.contact}><Mail aria-hidden size={15} strokeWidth={1.6} className="flex-none"/><span>{prospect.email}</span></a>}
      {prospect.phone && <a href={`tel:${prospect.phone}`} className={`${styles.contact} money`}><Phone aria-hidden size={15} strokeWidth={1.6} className="flex-none"/><span>{prospect.phone}</span></a>}
    </div>
    <div className="flex justify-end gap-2 max-xl:col-start-2 max-xl:row-start-2 max-xl:self-center xl:order-5 xl:-mt-1.5">
      <button onClick={() => onEdit(prospect)} aria-label="Prospect bearbeiten" title={`${prospect.companyName} bearbeiten`} className="icon-button"><Pencil size={15} strokeWidth={1.6}/></button>
      <button onClick={() => onRemove(prospect.id)} aria-label="Prospect löschen" title={`${prospect.companyName} löschen`} className="icon-button hover:!text-[var(--coral)]"><Trash2 size={15} strokeWidth={1.6}/></button>
    </div>
    {hasMessage(prospect) && <Message prospect={prospect}/>}
  </li>;
});
function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString("de-CH") : "Noch kein Kontakt"; }
