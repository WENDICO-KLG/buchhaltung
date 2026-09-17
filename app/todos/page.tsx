"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Check, ContactRound, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { createTodo, deleteTodo, getCustomers, getProspects, getTodos, updateTodo } from "@/lib/storage";
import type { Customer, Prospect, Todo, TodoStatus } from "@/types";

const statusLabels: Record<TodoStatus, string> = { not_started: "Nicht gestartet", in_progress: "In Bearbeitung", done: "Erledigt" };
const statusShort: Record<TodoStatus, string> = { not_started: "Offen", in_progress: "Aktiv", done: "Fertig" };
const statusOrder: TodoStatus[] = ["not_started", "in_progress", "done"];
const statusColor: Record<TodoStatus, string> = { not_started: "text-[#8292ae]", in_progress: "text-[#f7bd73]", done: "text-[#17b26a]" };
const filters: (TodoStatus | "all")[] = ["all", "not_started", "in_progress", "done"];
const SWIPE_THRESHOLD = 80;

type LinkChoice = "" | `customer:${string}` | `prospect:${string}`;

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [prospects, setProspects] = useState<Prospect[]>([]); const [error, setError] = useState("");
  const [filter, setFilter] = useState<TodoStatus | "all">("all");
  const [title, setTitle] = useState(""); const [dueDate, setDueDate] = useState(""); const [link, setLink] = useState<LinkChoice>("");

  useEffect(() => { Promise.all([getTodos(), getCustomers(), getProspects()]).then(([todoData, customerData, prospectData]) => { setTodos(todoData); setCustomers(customerData); setProspects(prospectData); }).catch((cause) => setError(cause instanceof Error ? cause.message : "To-Dos konnten nicht geladen werden.")); }, []);

  const customerName = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.companyName])), [customers]);
  const prospectName = useMemo(() => new Map(prospects.map((prospect) => [prospect.id, prospect.companyName])), [prospects]);
  const filtered = useMemo(() => todos.filter((todo) => filter === "all" || todo.status === filter), [filter, todos]);

  async function addTodo(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const [linkKind, linkId] = link ? link.split(":") : [undefined, undefined];
    try {
      const todo = await createTodo({ title: title.trim(), status: "not_started", dueDate: dueDate || undefined, customerId: linkKind === "customer" ? linkId : undefined, prospectId: linkKind === "prospect" ? linkId : undefined });
      setTodos((current) => [todo, ...current]);
      setTitle(""); setDueDate(""); setLink("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "To-Do konnte nicht gespeichert werden."); }
  }

  async function setStatus(id: string, status: TodoStatus) {
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, status } : todo));
    try { await updateTodo(id, { status }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Status konnte nicht gespeichert werden."); }
  }

  async function saveEdit(id: string, changes: { title: string; dueDate?: string; customerId?: string; prospectId?: string }) {
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, ...changes } : todo));
    try { await updateTodo(id, changes); } catch (cause) { setError(cause instanceof Error ? cause.message : "To-Do konnte nicht gespeichert werden."); }
  }

  async function remove(id: string) {
    setTodos((current) => current.filter((todo) => todo.id !== id));
    try { await deleteTodo(id); } catch (cause) { setError(cause instanceof Error ? cause.message : "To-Do konnte nicht gelöscht werden."); }
  }

  return <WorkspaceShell active="To-Dos" title="Wendico / To-Dos">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#56c8ff]">Aufgaben</p><h1 className="mt-3 text-3xl font-semibold text-white">To-Dos</h1><p className="mt-2 text-sm text-[#8292ae]">Aufgaben mit Fälligkeit, verknüpft mit Kunden oder Prospects.</p></div></div>
    {error && <div className="mt-5 rounded-xl border border-[#6e3340] bg-[#24131e] px-4 py-3 text-sm text-[#ffaaa0]">{error}</div>}
    <form onSubmit={addTodo} className="panel mt-6 grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto_auto_auto]">
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Neue Aufgabe..." className="field"/>
      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="field sm:w-auto"/>
      <select value={link} onChange={(event) => setLink(event.target.value as LinkChoice)} className="field sm:w-auto">
        <option value="">Kein Bezug</option>
        {customers.map((customer) => <option key={customer.id} value={`customer:${customer.id}`}>Kunde: {customer.companyName}</option>)}
        {prospects.map((prospect) => <option key={prospect.id} value={`prospect:${prospect.id}`}>Prospect: {prospect.companyName}</option>)}
      </select>
      <button className="primary flex items-center justify-center gap-2"><Plus size={16}/>Hinzufügen</button>
    </form>
    <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{filters.map((value) => <button key={value} onClick={() => setFilter(value)} className={filter === value ? "filter-active" : "filter"}>{value === "all" ? "Alle" : statusLabels[value]}</button>)}</div>
    <div className="mt-4 space-y-2">
      {filtered.map((todo) => <TodoRow key={todo.id} todo={todo} customers={customers} prospects={prospects} customerName={customerName.get(todo.customerId ?? "")} prospectName={prospectName.get(todo.prospectId ?? "")} onStatusChange={(status) => setStatus(todo.id, status)} onEdit={(changes) => saveEdit(todo.id, changes)} onDelete={() => remove(todo.id)}/>)}
      {!filtered.length && <div className="panel rounded-2xl py-14 text-center text-sm text-[#8292ae]">Keine To-Dos in dieser Ansicht.</div>}
    </div>
  </WorkspaceShell>;
}

function TodoRow({ todo, customers, prospects, customerName, prospectName, onStatusChange, onEdit, onDelete }: { todo: Todo; customers: Customer[]; prospects: Prospect[]; customerName?: string; prospectName?: string; onStatusChange: (status: TodoStatus) => void; onEdit: (changes: { title: string; dueDate?: string; customerId?: string; prospectId?: string }) => void; onDelete: () => void }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ?? "");
  const [editLink, setEditLink] = useState<LinkChoice>(todo.customerId ? `customer:${todo.customerId}` : todo.prospectId ? `prospect:${todo.prospectId}` : "");

  function startEdit() { setEditTitle(todo.title); setEditDueDate(todo.dueDate ?? ""); setEditLink(todo.customerId ? `customer:${todo.customerId}` : todo.prospectId ? `prospect:${todo.prospectId}` : ""); setIsEditing(true); }
  function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editTitle.trim()) return;
    const [linkKind, linkId] = editLink ? editLink.split(":") : [undefined, undefined];
    onEdit({ title: editTitle.trim(), dueDate: editDueDate || undefined, customerId: linkKind === "customer" ? linkId : undefined, prospectId: linkKind === "prospect" ? linkId : undefined });
    setIsEditing(false);
  }

  function onPointerDown(event: React.PointerEvent) {
    if (isEditing) return;
    if ((event.target as HTMLElement).closest("button, select, input, a")) return;
    startX.current = event.clientX; setDragging(true); (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: React.PointerEvent) { if (!dragging) return; setDragX(event.clientX - startX.current); }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX <= -SWIPE_THRESHOLD) { setDragX(0); if (window.confirm("To-Do wirklich löschen?")) onDelete(); return; }
    if (dragX >= SWIPE_THRESHOLD) { onStatusChange("done"); }
    setDragX(0);
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = Boolean(todo.dueDate && todo.dueDate < today && todo.status !== "done");
  function cycleStatus() { const nextIndex = (statusOrder.indexOf(todo.status) + 1) % statusOrder.length; onStatusChange(statusOrder[nextIndex]); }

  if (isEditing) return <form onSubmit={submitEdit} className="panel grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto_auto_auto]">
    <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="field" autoFocus/>
    <input type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} className="field sm:w-auto"/>
    <select value={editLink} onChange={(event) => setEditLink(event.target.value as LinkChoice)} className="field sm:w-auto">
      <option value="">Kein Bezug</option>
      {customers.map((customer) => <option key={customer.id} value={`customer:${customer.id}`}>Kunde: {customer.companyName}</option>)}
      {prospects.map((prospect) => <option key={prospect.id} value={`prospect:${prospect.id}`}>Prospect: {prospect.companyName}</option>)}
    </select>
    <div className="flex gap-2"><button className="primary flex flex-1 items-center justify-center gap-2"><Check size={16}/>Speichern</button><button type="button" onClick={() => setIsEditing(false)} className="action" aria-label="Abbrechen"><X size={16}/></button></div>
  </form>;

  return <div className="relative overflow-hidden rounded-2xl">
    <div style={{ opacity: dragX !== 0 ? Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1) : 0, transition: dragging ? "none" : "opacity .2s ease" }} className="absolute inset-0 flex items-center justify-between px-6 text-sm font-semibold"><span className="flex items-center gap-2 text-[#17b26a]"><Check size={16}/>Erledigt</span><span className="flex items-center gap-2 text-[#ff8f85]">Löschen<Trash2 size={16}/></span></div>
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ transform: `translateX(${dragX}px)`, transition: dragging ? "none" : "transform .2s ease" }}
      className={`panel relative flex touch-pan-y flex-col gap-2 rounded-2xl p-4 ${todo.status === "done" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`min-w-0 flex-1 text-sm font-semibold text-white ${todo.status === "done" ? "line-through" : ""}`}>{todo.title}</p>
        <div className="hidden shrink-0 gap-1 sm:flex">
          <button onClick={startEdit} aria-label="To-Do bearbeiten" className="icon-button"><Pencil size={15}/></button>
          <button onClick={() => onStatusChange("done")} aria-label="Als erledigt markieren" className="icon-button"><Check size={15}/></button>
          <button onClick={() => { if (window.confirm("To-Do wirklich löschen?")) onDelete(); }} aria-label="To-Do löschen" className="icon-button text-[#ff8f85]"><Trash2 size={15}/></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8292ae]">
        <button onClick={cycleStatus} className={`rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold ${statusColor[todo.status]}`}>{statusShort[todo.status]}</button>
        {todo.dueDate && <span className={`flex items-center gap-1 ${overdue ? "text-[#ff8f85]" : ""}`}><CalendarClock size={12}/>{new Date(`${todo.dueDate}T12:00:00`).toLocaleDateString("de-CH")}</span>}
        {customerName && <span className="flex max-w-[9rem] items-center gap-1 truncate whitespace-nowrap rounded-full bg-[#153a71] px-2 py-0.5 text-[11px] text-[#8edaff]"><Users size={11} className="shrink-0"/><span className="truncate">{customerName}</span></span>}
        {prospectName && <span className="flex max-w-[9rem] items-center gap-1 truncate whitespace-nowrap rounded-full bg-[#153a71] px-2 py-0.5 text-[11px] text-[#8edaff]"><ContactRound size={11} className="shrink-0"/><span className="truncate">{prospectName}</span></span>}
        <button onClick={startEdit} aria-label="To-Do bearbeiten" className="icon-button sm:hidden"><Pencil size={12}/></button>
      </div>
    </div>
  </div>;
}
