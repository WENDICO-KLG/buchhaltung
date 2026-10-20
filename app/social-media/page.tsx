"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, Save, Share2, Trash2, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
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
  const months = [...new Set([month, ...orders.map((order) => order.serviceDate.slice(0, 7))])].sort().reverse();

  return <WorkspaceShell active="Ayleen Social Media" title="Wendico / Ayleen Social Media">
    <div className="social-media-page page-enter pb-16 [letter-spacing:0]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex min-w-0 items-center gap-3 text-2xl font-semibold"><Share2 size={23} className="shrink-0 text-[var(--primary)]"/><span>Ayleen Social Media</span></h1>
        {writable && <button className="primary gap-2 whitespace-nowrap" disabled={busy || loading || failed} onClick={() => setEditor("new")}><Plus size={16}/>Auftrag erfassen</button>}
      </div>
      {error && <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--danger)] p-4 text-sm text-[var(--danger)]">{error}{failed && <button className="action" onClick={() => { setError(""); setFailed(false); setLoading(true); setReload((current) => current + 1); }}>Erneut laden</button>}</div>}
      {notice && <p role="status" className="mt-4 text-sm text-[var(--primary)]">{notice}</p>}
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div className="flex items-end gap-2">
          <button className="header-icon-button" title="Vorheriger Monat" aria-label="Vorheriger Monat" disabled={month === "1900-01"} onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={18}/></button>
          <label className="min-w-0"><span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Monat</span><input type="month" min="1900-01" max="9999-12" value={month} className="field w-44 sm:w-52" onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value) && event.target.value >= "1900-01" && event.target.value <= "9999-12") setMonth(event.target.value); }}/></label>
          <button className="header-icon-button" title="Nächster Monat" aria-label="Nächster Monat" disabled={month === "9999-12"} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18}/></button>
        </div>
        <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-b border-[var(--line)] py-6 lg:grid-cols-4" aria-busy={loading}>
        {([['Aufträge', loading || failed ? '–' : String(summary.count)], ['Vergütung gesamt', loading || failed ? '–' : formatCurrency(summary.total)], ['Bereits bezahlt', loading || failed ? '–' : formatCurrency(summary.paid)], ['Noch auszuzahlen', loading || failed ? '–' : formatCurrency(summary.open)]]).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-medium text-[var(--muted)]">{label}</dt><dd className={`mt-2 break-words text-xl font-semibold tabular-nums ${label === "Noch auszuzahlen" ? "text-[var(--primary)]" : ""}`}>{value}</dd></div>)}
      </dl>
      {editor !== null && <OrderEditor key={editor === "new" ? `new-${month}` : editor.id} order={editor === "new" ? undefined : editor} month={month} busy={busy} onClose={() => setEditor(null)} onSave={(form) => void act(async () => {
        const saved = await saveSocialMediaOrder(form, editor === "new" ? undefined : editor.id);
        replaceOrder(saved); setMonth(saved.serviceDate.slice(0, 7)); setEditor(null); setNotice("Auftrag gespeichert.");
      })}/>}
      <section className="mt-6" aria-label="Aufträge im ausgewählten Monat" aria-busy={loading}>
        {loading ? <div className="space-y-3" aria-label="Aufträge werden geladen">{[0, 1, 2].map((index) => <div key={index} className="h-20 animate-pulse rounded-lg bg-[var(--surface-soft)]"/>)}</div> : !failed && !entries.length ? <p className="border-b border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">Keine Aufträge für {monthLabel(month)}.</p> : <div className="divide-y divide-[var(--line)]">{entries.map((order) => {
          const editable = writable && (!order.paidAt || manager);
          return <article key={order.id} className="grid min-w-0 gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_140px_200px_88px] lg:items-center">
            <div className="min-w-0"><h3 className="break-words font-semibold [overflow-wrap:anywhere]">{order.title}</h3><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]"><time dateTime={order.serviceDate}>{new Date(`${order.serviceDate}T12:00:00`).toLocaleDateString("de-CH")}</time><a className="inline-flex min-w-0 items-center gap-1 text-[var(--primary)] hover:underline" href={order.postUrl} target="_blank" rel="noopener noreferrer" aria-label={`Post öffnen: ${order.title}`}><ExternalLink size={13} className="shrink-0"/>Post öffnen</a></div></div>
            <p className="font-semibold tabular-nums">{formatCurrency(order.amount)}</p>
            <div><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={Boolean(order.paidAt)} disabled={!manager || busy} onChange={(event) => { const paid = event.target.checked; void act(async () => { replaceOrder(await setSocialMediaOrderPaid(order.id, paid)); setNotice(paid ? "Zahlung bestätigt." : "Auftrag wieder als offen markiert."); }); }} aria-label={`Bezahlt: ${order.title}`}/>{order.paidAt ? "Bezahlt" : "Noch offen"}</label>{order.paidAt && <p className="mt-1 text-xs text-[var(--muted)]">am {new Date(order.paidAt).toLocaleDateString("de-CH")}</p>}</div>
            <div className="flex gap-1 lg:justify-end">{editable && <><button className="header-icon-button" title="Auftrag bearbeiten" aria-label={`Auftrag bearbeiten: ${order.title}`} disabled={busy} onClick={() => setEditor(order)}><Pencil size={15}/></button><button className="header-icon-button" title="Auftrag löschen" aria-label={`Auftrag löschen: ${order.title}`} disabled={busy} onClick={() => { if (window.confirm(`„${order.title}“ endgültig löschen?`)) void act(async () => { await deleteSocialMediaOrder(order.id); setOrders((current) => current.filter((entry) => entry.id !== order.id)); if (editor !== "new" && editor?.id === order.id) setEditor(null); setNotice("Auftrag gelöscht."); }); }}><Trash2 size={15}/></button></>}</div>
          </article>;
        })}</div>}
      </section>
      {!loading && !failed && orders.length > 0 && <section className="mt-10 border-t border-[var(--line)] pt-6" aria-label="Monatsübersicht"><h2 className="text-lg font-semibold">Monatsübersicht</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[var(--line)] text-xs text-[var(--muted)]"><tr><th className="py-3 pr-5">Monat</th><th className="px-3 py-3 text-right">Aufträge</th><th className="px-3 py-3 text-right">Gesamt</th><th className="px-3 py-3 text-right">Bezahlt</th><th className="py-3 pl-3 text-right">Offen</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{months.map((key) => { const totals = socialMediaMonthSummary(orders, key); return <tr key={key} className={key === month ? "bg-[var(--surface-soft)]" : ""}><th className="py-3 pr-5 font-medium"><button className="whitespace-nowrap text-[var(--primary)] hover:underline" onClick={() => setMonth(key)} aria-current={key === month ? "true" : undefined}>{monthLabel(key)}</button></th><td className="px-3 py-3 text-right tabular-nums">{totals.count}</td>{[totals.total, totals.paid, totals.open].map((value, index) => <td key={index} className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatCurrency(value)}</td>)}</tr>; })}</tbody></table></div></section>}
    </div>
  </WorkspaceShell>;
}

function OrderEditor({ order, month, busy, onClose, onSave }: { order?: SocialMediaOrder; month: string; busy: boolean; onClose: () => void; onSave: (input: { title: string; postUrl: string; serviceDate: string; amount: number }) => void }) {
  const [title, setTitle] = useState(order?.title ?? "");
  const [postUrl, setPostUrl] = useState(order?.postUrl ?? "");
  const [serviceDate, setServiceDate] = useState(order?.serviceDate ?? (todayKey().startsWith(month) ? todayKey() : `${month}-01`));
  const [amount, setAmount] = useState(order ? String(order.amount) : "");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSave({ title: title.trim(), postUrl: postUrl.trim(), serviceDate, amount: Number(amount) }); }
  return <form onSubmit={submit} className="mt-6 border-y border-[var(--line)] bg-[var(--surface-soft)] px-4 py-5" aria-label={order ? "Auftrag bearbeiten" : "Auftrag erfassen"}>
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{order ? "Auftrag bearbeiten" : "Neuer Auftrag"}</h2><button type="button" className="header-icon-button" title="Abbrechen" aria-label="Abbrechen" disabled={busy} onClick={onClose}><X size={17}/></button></div>
    <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="min-w-0"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Auftrag</span><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="field"/></label>
      <label className="min-w-0"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Post-Link</span><input type="url" required maxLength={2048} value={postUrl} onChange={(event) => setPostUrl(event.target.value)} className="field"/></label>
      <label className="min-w-0"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Leistungsdatum</span><input type="date" required min="1900-01-01" max="9999-12-31" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} className="field min-w-0"/></label>
      <label className="min-w-0"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Preis (CHF)</span><input type="number" required min="0" max="9999999.99" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="field"/></label>
    </fieldset>
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" className="action" disabled={busy} onClick={onClose}>Abbrechen</button><button type="submit" className="primary gap-2" disabled={busy}><Save size={16}/>{busy ? "Wird gespeichert..." : "Speichern"}</button></div>
  </form>;
}