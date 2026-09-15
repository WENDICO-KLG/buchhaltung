"use client";

import Link from "next/link";
import { Bell, BellRing, CalendarClock, CheckCircle2, FileWarning, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getDueWorkspaceItems, getInvoices, getProspects, savePushSubscription } from "@/lib/storage";
import type { Invoice, Prospect, WorkspaceItem } from "@/types";

type DueNotification = {
  id: string;
  title: string;
  detail: string;
  date: string;
  href: string;
  kind: "invoice" | "task";
  overdue: boolean;
};

const dateOnly = () => new Date().toISOString().slice(0, 10);

function collectNotifications(invoices: Invoice[], prospects: Prospect[], workspaceItems: WorkspaceItem[]): DueNotification[] {
  const today = dateOnly();
  const invoiceNotifications = invoices
    .filter((invoice) => ["sent", "overdue"].includes(invoice.status) && invoice.dueDate <= today)
    .map((invoice) => ({ id: `invoice-${invoice.id}`, title: `Rechnung ${invoice.invoiceNumber}`, detail: `${invoice.customerName} · fällig ${formatDate(invoice.dueDate)}`, date: invoice.dueDate, href: `/applications/${invoice.id}`, kind: "invoice" as const, overdue: invoice.dueDate < today }));
  const taskNotifications = prospects
    .filter((prospect) => prospect.nextTask && prospect.nextTaskAt && prospect.nextTaskAt <= today && !["won", "lost"].includes(prospect.status))
    .map((prospect) => ({ id: `prospect-${prospect.id}`, title: prospect.nextTask as string, detail: `${prospect.companyName} · fällig ${formatDate(prospect.nextTaskAt as string)}`, date: prospect.nextTaskAt as string, href: "/prospects", kind: "task" as const, overdue: (prospect.nextTaskAt as string) < today }));
  const workspaceNotifications = workspaceItems
    .filter((item) => item.dueDate && !["Erledigt", "Abgeschlossen", "Bezahlt", "Gewonnen", "Archiviert", "Angenommen", "Abgelehnt", "Verloren", "Storniert", "Ehemalig"].includes(item.status))
    .map((item) => ({ id: `workspace-${item.id}`, title: item.title, detail: `${moduleLabel(item.module)} · fällig ${formatDate(item.dueDate as string)}`, date: item.dueDate as string, href: `/workspace/${item.module}`, kind: "task" as const, overdue: (item.dueDate as string) < today }));
  return [...invoiceNotifications, ...taskNotifications, ...workspaceNotifications].sort((a, b) => a.date.localeCompare(b.date));
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DueNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => typeof window === "undefined" || !("Notification" in window) ? "unsupported" : Notification.permission);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("wendico.dismissed-notifications") ?? "[]") as string[]; }
    catch { return []; }
  });
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => Promise.all([getInvoices(), getProspects(), getDueWorkspaceItems()]).then(([invoices, prospects, workspaceItems]) => { if (active) setItems(collectNotifications(invoices, prospects, workspaceItems)); }).catch(() => undefined);
    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, []);

  const visible = useMemo(() => items.filter((item) => !dismissed.includes(item.id)), [dismissed, items]);

  useEffect(() => {
    if (permission !== "granted" || !visible.length) return;
    const today = dateOnly();
    const notifiedKey = `wendico.notified.${today}`;
    const alreadyNotified = JSON.parse(window.localStorage.getItem(notifiedKey) ?? "[]") as string[];
    const pending = visible.filter((item) => !alreadyNotified.includes(item.id));
    async function notify() {
      const registration = await navigator.serviceWorker?.ready;
      for (const item of pending) {
        if (registration) await registration.showNotification(item.title, { body: item.detail, icon: "/icon.png?v=2", tag: item.id, data: { href: item.href } });
        else new Notification(item.title, { body: item.detail, icon: "/icon.png?v=2", tag: item.id });
      }
      if (pending.length) window.localStorage.setItem(notifiedKey, JSON.stringify([...alreadyNotified, ...pending.map((item) => item.id)]));
    }
    void notify();
  }, [permission, visible]);

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    setPushError("");
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== "granted") return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) { setPushError("Push ist noch nicht konfiguriert."); return; }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await savePushSubscription(subscription);
    } catch { setPushError("Push konnte nicht aktiviert werden. Bitte versuche es erneut."); }
  }

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    window.localStorage.setItem("wendico.dismissed-notifications", JSON.stringify(next));
  }

  return <div className="relative">
    <button onClick={() => setOpen((current) => !current)} aria-label="Benachrichtigungen" aria-expanded={open} className="header-icon-button">
      {visible.length ? <BellRing size={18} /> : <Bell size={18} />}
      {visible.length > 0 && <span className="notification-count">{visible.length > 9 ? "9+" : visible.length}</span>}
    </button>
    {open && <div className="notification-popover">
      <div className="flex items-start justify-between border-b border-[var(--line)] px-4 py-3"><div><h2 className="text-sm font-semibold text-[var(--ink)]">Fälligkeiten</h2><p className="mt-0.5 text-xs text-[var(--muted)]">Rechnungen und nächste Aufgaben</p></div><button onClick={() => setOpen(false)} aria-label="Schließen" className="icon-button"><X size={16}/></button></div>
      {permission === "default" && <div className="border-b border-[var(--line)] p-3"><button onClick={enableNotifications} className="primary w-full">Browser-Benachrichtigungen aktivieren</button></div>}
      {permission === "denied" && <p className="border-b border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">Benachrichtigungen sind im Browser blockiert. Die Hinweise bleiben hier sichtbar.</p>}
      {pushError && <p className="border-b border-[var(--line)] px-4 py-3 text-xs text-[#b42318]">{pushError}</p>}
      <div className="max-h-[360px] overflow-y-auto">{visible.length ? visible.map((item) => <div key={item.id} className="notification-row"><Link href={item.href} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 gap-3"><span className={item.overdue ? "notification-icon overdue" : "notification-icon"}>{item.kind === "invoice" ? <FileWarning size={16}/> : <CalendarClock size={16}/>}</span><span className="min-w-0"><strong className="block truncate text-sm text-[var(--ink)]">{item.title}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{item.detail}</span></span></Link><button onClick={() => dismiss(item.id)} title="Erledigt" aria-label={`${item.title} als erledigt markieren`} className="icon-button"><CheckCircle2 size={16}/></button></div>) : <div className="px-5 py-10 text-center text-sm text-[var(--muted)]">Aktuell ist nichts fällig.</div>}</div>
    </div>}
  </div>;
}

function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("de-CH"); }
function moduleLabel(module: string) { return ({ projects: "Projekt", ideas: "Idee", tasks: "Aufgabe", offers: "Offerte", people: "Team", commissions: "Provision", leads: "Lead", operations: "Ablauf" } as Record<string, string>)[module] ?? "Workspace"; }

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}
