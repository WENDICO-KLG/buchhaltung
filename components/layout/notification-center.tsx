"use client";

import Link from "next/link";
import { Bell, CalendarClock, CheckCircle2, FileWarning, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getInvoices, getProspects, getTodos, savePushSubscription } from "@/lib/storage";
import type { Invoice, Prospect, Todo } from "@/types";
import { canAccessPage, getActiveCompany } from "@/lib/company";

type DueNotification = {
  id: string;
  title: string;
  detail: string;
  date: string;
  href: string;
  kind: "invoice" | "task";
  overdue: boolean;
};

const dateOnly = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function collectNotifications(invoices: Invoice[], prospects: Prospect[], todos: Todo[]): DueNotification[] {
  const today = dateOnly();
  const invoiceNotifications = invoices
    .filter((invoice) => ["sent", "overdue"].includes(invoice.status) && invoice.dueDate <= today)
    .map((invoice) => ({ id: `invoice-${invoice.id}`, title: `Rechnung ${invoice.invoiceNumber}`, detail: `${invoice.customerName} · fällig ${formatDate(invoice.dueDate)}`, date: invoice.dueDate, href: "/dashboard", kind: "invoice" as const, overdue: invoice.dueDate < today }));
  const taskNotifications = prospects
    .filter((prospect) => prospect.nextTask && prospect.nextTaskAt && prospect.nextTaskAt <= today && !["won", "lost"].includes(prospect.status))
    .map((prospect) => ({ id: `prospect-${prospect.id}`, title: prospect.nextTask as string, detail: `${prospect.companyName} · fällig ${formatDate(prospect.nextTaskAt as string)}`, date: prospect.nextTaskAt as string, href: "/prospects", kind: "task" as const, overdue: (prospect.nextTaskAt as string) < today }));
  const todoNotifications = todos
    .filter((todo) => todo.dueDate && todo.dueDate <= today && todo.status !== "done")
    .map((todo) => ({ id: `todo-${todo.id}`, title: todo.title, detail: `To-Do · fällig ${formatDate(todo.dueDate as string)}`, date: todo.dueDate as string, href: "/todos", kind: "task" as const, overdue: (todo.dueDate as string) < today }));
  return [...invoiceNotifications, ...taskNotifications, ...todoNotifications].sort((a, b) => a.date.localeCompare(b.date));
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
  const [pushReady, setPushReady] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => getActiveCompany().then(async (company) => {
      if (!company) return;
      const [invoices, prospects, todos] = await Promise.all([
        canAccessPage(company,"dashboard") ? getInvoices() : Promise.resolve([]),
        canAccessPage(company,"prospects") ? getProspects() : Promise.resolve([]),
        canAccessPage(company,"todos") ? getTodos() : Promise.resolve([]),
      ]);
      if (active) setItems(collectNotifications(invoices,prospects,todos));
    }).catch(() => undefined);
    void refresh();
    if ("serviceWorker" in navigator) navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => { if (active) setPushReady(Boolean(subscription)); }).catch(() => undefined);
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
    let alreadyNotified: string[] = [];
    try { alreadyNotified = JSON.parse(window.localStorage.getItem(notifiedKey) ?? "[]") as string[]; }
    catch { window.localStorage.removeItem(notifiedKey); }
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
      setPushReady(true);
    } catch { setPushError("Push konnte nicht aktiviert werden. Bitte versuche es erneut."); }
  }

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    window.localStorage.setItem("wendico.dismissed-notifications", JSON.stringify(next));
  }

  return <div className="relative" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <button onClick={() => setOpen((current) => !current)} aria-label="Benachrichtigungen" aria-expanded={open} className="header-icon-button">
      <Bell size={20} strokeWidth={1.9} />
      {visible.length > 0 && <span aria-hidden className="notification-count"/>}
    </button>
    {open && <div role="region" aria-label="Fälligkeiten" className="notification-popover overlay">
      <div className="flex items-start justify-between border-b border-[var(--line)] py-4 pl-5 pr-4"><div><h2 className="text-base font-semibold text-[var(--ink)]">Fälligkeiten{visible.length > 0 && <span className="money ml-2 font-normal text-[var(--muted)]">{visible.length}</span>}</h2><p className="mt-0.5 text-sm text-[var(--muted)]">Rechnungen und nächste Aufgaben</p></div><button onClick={() => setOpen(false)} aria-label="Schließen" className="icon-button"><X size={16}/></button></div>
      {(permission === "default" || permission === "granted" && !pushReady) && <div className="border-b border-[var(--line)] p-3"><button onClick={enableNotifications} className="primary w-full">{permission === "granted" ? "Push-Dienst verbinden" : "Browser-Benachrichtigungen aktivieren"}</button></div>}
      {permission === "granted" && pushReady && <p className="border-b border-[var(--line)] px-5 py-3 text-sm font-medium text-[var(--emerald)]">Push-Benachrichtigungen sind aktiv.</p>}
      {permission === "denied" && <p className="border-b border-[var(--line)] px-5 py-3 text-sm text-[var(--muted)]">Benachrichtigungen sind im Browser blockiert. Die Hinweise bleiben hier sichtbar.</p>}
      {pushError && <p className="border-b border-[var(--line)] px-5 py-3 text-sm text-[var(--coral)]">{pushError}</p>}
      <div className="max-h-[min(360px,60dvh)] overflow-y-auto">{visible.length ? visible.map((item) => <div key={item.id} className="notification-row"><Link href={item.href} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3"><span className={item.overdue ? "notification-icon overdue" : "notification-icon"}>{item.kind === "invoice" ? <FileWarning size={16}/> : <CalendarClock size={16}/>}</span><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-[var(--ink)]">{item.title}</strong><span className="mt-0.5 block text-[13px] text-[var(--muted)]">{item.overdue && <span className="font-medium text-[var(--coral)]">Überfällig · </span>}{item.detail}</span></span></Link><button onClick={() => dismiss(item.id)} title="Erledigt" aria-label={`${item.title} als erledigt markieren`} className="icon-button"><CheckCircle2 size={16}/></button></div>) : <div className="px-5 py-10 text-center text-sm text-[var(--muted)]">Aktuell ist nichts fällig.</div>}</div>
    </div>}
  </div>;
}

function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("de-CH"); }

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}
