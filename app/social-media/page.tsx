"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, Save, Share2, Trash2, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { canAccessPage, getActiveCompany } from "@/lib/company";
import { deleteSocialMediaOrder, getSocialMediaOrders, saveSocialMediaOrder, setSocialMediaOrderPaid } from "@/lib/storage";
import { socialMediaMonthSummary } from "@/lib/social-media";
import type { SocialMediaOrder } from "@/lib/social-media";
import { addMonths, formatCurrency, todayKey } from "@/lib/utils";

function monthLabel(month: string) { return new Date(`${month}-01T12:00:00`).toLocaleDateString("de-CH", { month: "long", year: "numeric" }); }
function message(cause: unknown) { return cause instanceof Error ? cause.message : "Die Aktion konnte nicht ausgeführt werden."; }

export default function SocialMediaPage() {
  const [orders, setOrders] = useState<SocialMediaOrder[]>([]);
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [writable, setWritable] = useState(false);
  const [manager, setManager] = useState(false);
  const [editor, setEditor] = useState<SocialMediaOrder | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    getActiveCompany().then(async (company) => {
      if (!company || !canAccessPage(company, "social-media")) return;
      const data = await getSocialMediaOrders();
      if (active) { setOrders(data); setWritable(company.role !== "viewer"); setManager(["owner", "admin"].includes(company.role)); }
    }).catch((cause) => { if (active) { setError(message(cause)); setFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function act(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (cause) { setError(message(cause)); }
    finally { pending.current = false; setBusy(false); }
  }

  function replaceOrder(order: SocialMediaOrder) { setOrders((current) => [order, ...current.filter((entry) => entry.id !== order.id)]); }
  const summary = socialMediaMonthSummary(orders, month);
  const entries = orders.filter((order) => order.serviceDate.startsWith(month)).sort((left, right) => right.serviceDate.localeCompare(left.serviceDate) || left.title.localeCompare(right.title));
  const blank = loading || failed;
  const months = [...new Set([month, ...orders.map((order) => order.serviceDate.slice(0, 7))])].sort().reverse();

  return <WorkspaceShell active="Ayleen Social Media" title="Wendico / Ayleen Social Media">
    <div className="social-media-page page-enter">
      <PageHeader title="Ayleen Social Media" actions={writable && <button className="primary w-full whitespace-nowrap sm:w-auto" disabled={busy || loading || failed} onClick={() => setEditor("new")}><Plus size={17}/>Auftrag erfassen</button>}/>
      {error && <div role="alert" className="mt-6 tile flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm text-[var(--coral)]"><span aria-hidden className="dot dot-off"/>{error}{failed && <button className="action" onClick={() => { setError(""); setFailed(false); setLoading(true); setReload((current) => current + 1); }}>Erneut laden</button>}</div>}
      {notice && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-[var(--ink)]"><span aria-hidden className="dot dot-on"/>{notice}</p>}
      {editor !== null && <OrderEditor key={editor === "new" ? `new-${month}` : editor.id} order={editor === "new" ? undefined : editor} month={month} busy={busy} onClose={() => setEditor(null)} onSave={(form) => void act(async () => {
        const saved = await saveSocialMediaOrder(form, editor === "new" ? undefined : editor.id);
        replaceOrder(saved); setMonth(saved.serviceDate.slice(0, 7)); setEditor(null); setNotice("Auftrag gespeichert.");
      })}/>}
      <section aria-label="Monat im Überblick" className="raised mt-7 overflow-hidden" aria-busy={loading}>
        <div className="p-6 md:p-9">
          <div className="flex flex-wrap-reverse items-start justify-between gap-x-6 gap-y-7">
            <h2 className="sr-only">{monthLabel(month)}</h2>
            <Stat size="lg" label="Noch auszuzahlen" value={blank ? "–" : <CountUp value={summary.open} format={formatCurrency}/>}/>
            <div className="pill-track w-full sm:w-auto">
              <button className="icon-button" title="Vorheriger Monat" aria-label="Vorheriger Monat" disabled={month === "1900-01"} onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={17} strokeWidth={1.6}/></button>
              <label className="min-w-0 flex-1 sm:flex-none"><span className="sr-only">Monat</span><input type="month" min="1900-01" max="9999-12" value={month} className="money min-h-10 w-full min-w-0 rounded-full bg-transparent px-3 text-center text-sm font-medium text-[var(--ink)] focus-visible:-outline-offset-2 pointer-coarse:min-h-11 sm:w-48" onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value) && event.target.value >= "1900-01" && event.target.value <= "9999-12") setMonth(event.target.value); }}/></label>
              <button className="icon-button" title="Nächster Monat" aria-label="Nächster Monat" disabled={month === "9999-12"} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={17} strokeWidth={1.6}/></button>
            </div>
          </div>
          <ProgressBar className="mt-7" value={blank ? 0 : summary.paid} max={summary.total} tone="positive" label="Anteil bereits bezahlt"/>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 [&_.money]:whitespace-nowrap max-sm:[&_.money]:text-xl">
            <Stat label="Bereits bezahlt" value={blank ? "–" : formatCurrency(summary.paid)}/>
            <Stat label="Vergütung gesamt" value={blank ? "–" : formatCurrency(summary.total)}/>
            <Stat label="Aufträge" value={blank ? "–" : String(summary.count)}/>
          </div>
        </div>
      </section>
      <section className="panel mt-5 overflow-hidden pb-1" aria-label="Aufträge im ausgewählten Monat" aria-busy={loading}>
        {loading ? <div className="grid gap-4 p-6" aria-label="Aufträge werden geladen">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-14"/>)}</div> : !failed && !entries.length ? <EmptyState icon={Share2} title={`Keine Aufträge für ${monthLabel(month)}.`}/> : <div className="divide-y divide-[var(--line)]">{entries.map((order) => {
          const editable = writable && (!order.paidAt || manager);
          return <article key={order.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] md:px-7 lg:grid-cols-[minmax(0,1fr)_auto_11rem_92px] lg:gap-x-6">
            <div className="min-w-0"><h3 className="break-words font-semibold leading-snug [overflow-wrap:anywhere]">{order.title}</h3><div className="flex flex-wrap items-center gap-x-4 text-[13px] text-[var(--muted)]"><time dateTime={order.serviceDate}>{new Date(`${order.serviceDate}T12:00:00`).toLocaleDateString("de-CH")}</time><a className="inline-flex min-h-11 min-w-0 items-center gap-1.5 text-[var(--ink)] underline decoration-[var(--hairline)] underline-offset-4 hover:decoration-[var(--gold)] lg:min-h-8" href={order.postUrl} target="_blank" rel="noopener noreferrer" aria-label={`Post öffnen: ${order.title}`}><ExternalLink size={14} strokeWidth={1.7} className="shrink-0"/>Post öffnen</a></div></div>
            <p className="money self-start text-right text-base font-semibold lg:self-center">{formatCurrency(order.amount)}</p>
            <div><label className={`inline-flex min-h-11 items-center gap-3 text-sm cursor-pointer has-[:disabled]:cursor-default ${order.paidAt ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}><input type="checkbox" className="switch" checked={Boolean(order.paidAt)} disabled={!manager || busy} onChange={(event) => { const paid = event.target.checked; void act(async () => { replaceOrder(await setSocialMediaOrderPaid(order.id, paid)); setNotice(paid ? "Zahlung bestätigt." : "Auftrag wieder als offen markiert."); }); }} aria-label={`Bezahlt: ${order.title}`}/><span>{order.paidAt ? "Bezahlt" : "Noch offen"}{order.paidAt && <span className="block text-[13px] text-[var(--muted)]">am {new Date(order.paidAt).toLocaleDateString("de-CH")}</span>}</span></label></div>
            <div className="flex justify-end gap-1">{editable && <><button className="icon-button" title="Auftrag bearbeiten" aria-label={`Auftrag bearbeiten: ${order.title}`} disabled={busy} onClick={() => setEditor(order)}><Pencil size={16} strokeWidth={1.6}/></button><button className="icon-button hover:text-[var(--coral)]" title="Auftrag löschen" aria-label={`Auftrag löschen: ${order.title}`} disabled={busy} onClick={() => { if (window.confirm(`„${order.title}“ endgültig löschen?`)) void act(async () => { await deleteSocialMediaOrder(order.id); setOrders((current) => current.filter((entry) => entry.id !== order.id)); if (editor !== "new" && editor?.id === order.id) setEditor(null); setNotice("Auftrag gelöscht."); }); }}><Trash2 size={16} strokeWidth={1.6}/></button></>}</div>
          </article>;
        })}</div>}
      </section>
      {!loading && !failed && orders.length > 0 && <section className="panel mt-5 overflow-hidden" aria-label="Monatsübersicht"><h2 className="px-5 pb-4 pt-6 text-base font-semibold md:px-7">Monatsübersicht</h2>
        <table className="w-full text-left text-sm"><thead className="hidden text-[13px] text-[var(--muted)] sm:table-header-group"><tr className="[&>th]:font-medium"><th className="pb-3 pl-5 pr-3 md:pl-7">Monat</th><th className="px-3 pb-3 text-right">Aufträge</th><th className="px-3 pb-3 text-right">Gesamt</th><th className="px-3 pb-3 text-right">Bezahlt</th><th className="pb-3 pl-3 pr-5 text-right md:pr-7">Offen</th></tr></thead>
          <tbody>{months.map((key) => { const totals = socialMediaMonthSummary(orders, key); return <tr key={key} className={`grid grid-cols-3 gap-x-3 border-t border-[var(--line)] px-5 pb-4 pt-1 sm:table-row sm:p-0 ${key === month ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
            <th scope="row" className="col-span-3 flex items-center justify-between font-medium sm:table-cell sm:pl-5 sm:pr-3 md:pl-7"><button className={`inline-flex min-h-11 items-center gap-2.5 whitespace-nowrap hover:text-[var(--ink)] ${key === month ? "font-semibold" : "font-normal"}`} onClick={() => setMonth(key)} aria-current={key === month ? "true" : undefined}><span aria-hidden className={`dot ${key === month ? "dot-on" : ""}`}/>{monthLabel(key)}</button><span className="text-[13px] font-normal text-[var(--muted)] sm:hidden">{totals.count} {totals.count === 1 ? "Auftrag" : "Aufträge"}</span></th>
            <td className="money hidden px-3 text-right sm:table-cell">{totals.count}</td>
            {([["Gesamt", totals.total], ["Bezahlt", totals.paid], ["Offen", totals.open]] as const).map(([label, value]) => <td key={label} className={`money whitespace-nowrap sm:px-3 sm:text-right ${label === "Offen" ? "md:pr-7" : ""}`}><span className="block text-xs text-[var(--muted)] sm:hidden">{label}</span>{formatCurrency(value)}</td>)}
          </tr>; })}</tbody></table></section>}
    </div>
  </WorkspaceShell>;
}

function OrderEditor({ order, month, busy, onClose, onSave }: { order?: SocialMediaOrder; month: string; busy: boolean; onClose: () => void; onSave: (input: { title: string; postUrl: string; serviceDate: string; amount: number }) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  // Opened from a row further down, the editor would otherwise stay out of view.
  useEffect(() => { formRef.current?.scrollIntoView({ block: "nearest" }); }, []);
  const [title, setTitle] = useState(order?.title ?? "");
  const [postUrl, setPostUrl] = useState(order?.postUrl ?? "");
  const [serviceDate, setServiceDate] = useState(order?.serviceDate ?? (todayKey().startsWith(month) ? todayKey() : `${month}-01`));
  const [amount, setAmount] = useState(order ? String(order.amount) : "");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSave({ title: title.trim(), postUrl: postUrl.trim(), serviceDate, amount: Number(amount) }); }
  return <form ref={formRef} onSubmit={submit} className="scroll-mt-24 scroll-mb-24 panel mt-6 p-6 md:p-7" aria-label={order ? "Auftrag bearbeiten" : "Auftrag erfassen"}>
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{order ? "Auftrag bearbeiten" : "Neuer Auftrag"}</h2><button type="button" className="header-icon-button" title="Abbrechen" aria-label="Abbrechen" disabled={busy} onClick={onClose}><X size={17} strokeWidth={1.6}/></button></div>
    <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="min-w-0"><span className="mb-2 block text-[13px] text-[var(--muted)]">Auftrag</span><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="field"/></label>
      <label className="min-w-0"><span className="mb-2 block text-[13px] text-[var(--muted)]">Post-Link</span><input type="url" required maxLength={2048} value={postUrl} onChange={(event) => setPostUrl(event.target.value)} className="field"/></label>
      <label className="min-w-0"><span className="mb-2 block text-[13px] text-[var(--muted)]">Leistungsdatum</span><input type="date" required min="1900-01-01" max="9999-12-31" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} className="field min-w-0"/></label>
      <label className="min-w-0"><span className="mb-2 block text-[13px] text-[var(--muted)]">Preis (CHF)</span><input type="number" required min="0" max="9999999.99" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="field"/></label>
    </fieldset>
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" className="action" disabled={busy} onClick={onClose}>Abbrechen</button><button type="submit" className="primary gap-2" disabled={busy}><Save size={16}/>{busy ? "Wird gespeichert..." : "Speichern"}</button></div>
  </form>;
}