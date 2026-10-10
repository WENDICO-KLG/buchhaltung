"use client";

import { useEffect, useRef, useState } from "react";
import { closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, KeyboardCoordinateGetter } from "@dnd-kit/core";
import { CalendarClock, Check, Circle, CircleCheck, ContactRound, GripVertical, LayoutPanelTop, LoaderCircle, MessageSquare, Plus, Search, Send, Trash2, UserRound, Users, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { createTodo, createTodoComment, deleteTodo, getCustomers, getProspects, getTodoComments, getTodos, updateTodo } from "@/lib/storage";
import { todayKey } from "@/lib/utils";
import { currentCompanyId, getCompanyMembers } from "@/lib/company";
import type { CompanyMember } from "@/lib/company";
import type { Customer, Prospect, Todo, TodoComment, TodoStatus } from "@/types";

const statusLabels: Record<TodoStatus, string> = { not_started: "Offen", in_progress: "In Bearbeitung", done: "Erledigt" };
const statusOrder: TodoStatus[] = ["not_started", "in_progress", "done"];
const statusIcons = { not_started: Circle, in_progress: LoaderCircle, done: CircleCheck };
const focusLabels = { all: "Alle Aufgaben", overdue: "Überfällig", today: "Heute fällig", undated: "Ohne Termin" };
type Focus = keyof typeof focusLabels;
type LinkChoice = "" | `customer:${string}` | `prospect:${string}`;
type TodoInput = Omit<Todo, "id" | "createdAt" | "updatedAt">;

const boardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) return undefined;
  event.preventDefault();
  const columns = context.droppableContainers.getEnabled().map((container) => context.droppableRects.get(container.id)).filter((rect) => rect !== undefined).sort((left, right) => left.left - right.left);
  const direction = event.code === "ArrowRight" || event.code === "ArrowDown" ? 1 : -1;
  const centerX = currentCoordinates.x + (context.collisionRect?.width ?? 0) / 2;
  const currentIndex = columns.findIndex((rect) => centerX >= rect.left && centerX <= rect.right);
  const target = columns[currentIndex + direction];
  return target ? { x: target.left + 12, y: target.top + 60 } : currentCoordinates;
};

function matchesFocus(todo: Todo, focus: Focus, today: string) {
  if (focus === "all") return true;
  if (todo.status === "done") return false;
  if (focus === "undated") return !todo.dueDate;
  return Boolean(todo.dueDate && (focus === "today" ? todo.dueDate === today : todo.dueDate < today));
}

function compareTodos(left: Todo, right: Todo) {
  if (left.status === "done" && right.status === "done") return right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id);
  return (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31") || right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id);
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [focus, setFocus] = useState<Focus>("all");
  const [query, setQuery] = useState("");
  const [linkFilter, setLinkFilter] = useState<LinkChoice | "all">("all");
  const [editor, setEditor] = useState<Todo | "new" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [showAllDone, setShowAllDone] = useState(false);
  const [reload, setReload] = useState(0);
  const pendingIds = useRef(new Set<string>());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: boardCoordinates }));

  useEffect(() => {
    let active = true;
    Promise.all([getTodos(), getCustomers(), getProspects(), currentCompanyId().then(getCompanyMembers)]).then(([todoData, customerData, prospectData, memberData]) => {
      if (active) { setTodos(todoData); setCustomers(customerData); setProspects(prospectData); setMembers(memberData); }
    }).catch((cause) => { if (active) { setLoadFailed(true); setError(cause instanceof Error ? cause.message : "Aufgaben konnten nicht geladen werden."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  function begin(id: string) { pendingIds.current.add(id); setPending([...pendingIds.current]); }
  function finish(id: string) { pendingIds.current.delete(id); setPending([...pendingIds.current]); }
  function relationName(todo: Todo) { return customers.find((customer) => customer.id === todo.customerId)?.companyName ?? prospects.find((prospect) => prospect.id === todo.prospectId)?.companyName; }
  function assigneeName(todo: Todo) { return todo.assigneeId ? members.find((member) => member.user_id === todo.assigneeId)?.email ?? "Mitglied nicht mehr verfügbar" : "Nicht zugewiesen"; }

  async function setStatus(id: string, status: TodoStatus) {
    const previous = todos.find((todo) => todo.id === id);
    if (!previous || previous.status === status || pendingIds.current.has(id)) return;
    begin(id); setError(""); setNotice("");
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, status } : todo));
    try {
      await updateTodo(id, { status });
      setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, updatedAt: todayKey() } : todo));
      setNotice(`„${previous.title}“: ${statusLabels[status]}.`);
    } catch (cause) {
      setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, status: previous.status } : todo));
      setError(`${cause instanceof Error ? cause.message : "Status konnte nicht gespeichert werden."} Der vorherige Status wurde wiederhergestellt.`);
    } finally { finish(id); }
  }

  function endDrag({ active, over }: DragEndEvent) {
    setDragId(null);
    if (over && statusOrder.includes(over.id as TodoStatus)) void setStatus(String(active.id), over.id as TodoStatus);
  }

  async function save(input: TodoInput) {
    if (editor === null) return;
    const id = editor === "new" ? "new" : editor.id;
    if (pendingIds.current.has(id)) throw new Error("Diese Aufgabe wird gerade gespeichert.");
    begin(id);
    try {
      if (editor === "new") {
        const todo = await createTodo(input);
        setTodos((current) => [todo, ...current]); setNotice("Aufgabe erstellt.");
      } else {
        await updateTodo(editor.id, input);
        setTodos((current) => current.map((todo) => todo.id === editor.id ? { ...todo, ...input, updatedAt: todayKey() } : todo));
        setNotice("Aufgabe gespeichert.");
      }
      setError(""); setEditor(null);
    } finally { finish(id); }
  }

  async function remove(todo: Todo) {
    if (!window.confirm(`„${todo.title}“ und die zugehörigen Kommentare endgültig löschen?`)) return;
    if (pendingIds.current.has(todo.id)) throw new Error("Diese Aufgabe wird gerade gespeichert.");
    begin(todo.id);
    try { await deleteTodo(todo.id); setTodos((current) => current.filter((item) => item.id !== todo.id)); setEditor(null); setNotice("Aufgabe gelöscht."); }
    finally { finish(todo.id); }
  }

  const today = todayKey();
  const search = query.trim().toLocaleLowerCase("de-CH");
  const filtered = todos.filter((todo) => matchesFocus(todo, focus, today))
    .filter((todo) => assigneeFilter === "all" || (todo.assigneeId ?? "") === assigneeFilter)
    .filter((todo) => linkFilter === "all" || (linkFilter === "" ? !todo.customerId && !todo.prospectId : linkFilter === (todo.customerId ? `customer:${todo.customerId}` : `prospect:${todo.prospectId}`)))
    .filter((todo) => `${todo.title} ${todo.notes ?? ""} ${relationName(todo) ?? ""}`.toLocaleLowerCase("de-CH").includes(search)).sort(compareTodos);
  const openCount = todos.filter((todo) => todo.status !== "done").length;
  const dragTodo = todos.find((todo) => todo.id === dragId);
  const hasFilters = focus !== "all" || Boolean(query) || linkFilter !== "all" || assigneeFilter !== "all";

  return <WorkspaceShell active="To-Dos" title="Wendico / To-Dos">
    <div className="todo-page page-enter pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)]"><LayoutPanelTop size={15}/>Tagesgeschäft</div><h1 className="mt-2 text-3xl font-semibold">To-Dos</h1></div>
        <button onClick={() => setEditor("new")} disabled={loading || loadFailed} className="primary gap-2 whitespace-nowrap"><Plus size={16}/>Aufgabe erstellen</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-b border-[var(--line)] pb-5 text-sm text-[var(--muted)]">
        <span><strong className="text-[var(--ink)]">{loading ? "–" : openCount}</strong> offen</span>
        <span className={todos.some((todo) => matchesFocus(todo, "overdue", today)) ? "text-[var(--danger)]" : ""}><strong>{loading ? "–" : todos.filter((todo) => matchesFocus(todo, "overdue", today)).length}</strong> überfällig</span>
        <span><strong className="text-[var(--ink)]">{loading ? "–" : todos.filter((todo) => matchesFocus(todo, "today", today)).length}</strong> heute fällig</span>
      </div>
      {error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">{error}{loadFailed && <button onClick={() => { setError(""); setLoadFailed(false); setLoading(true); setReload((current) => current + 1); }} className="action">Erneut laden</button>}</div>}
      <div className="sr-only" role="status" aria-live="polite">{notice}</div>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Suche</span><span className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-9" placeholder="Aufgabe oder Unternehmen"/></span></label>
        <label className="lg:w-64"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Bezug</span><select value={linkFilter} onChange={(event) => setLinkFilter(event.target.value as LinkChoice | "all")} className="field"><option value="all">Alle Bezüge</option><LinkOptions customers={customers} prospects={prospects}/></select></label>
        <label className="min-w-0 lg:w-64"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Verantwortlich</span><select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="field"><option value="all">Alle Mitglieder</option><option value="">Nicht zugewiesen</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.email}</option>)}</select></label>
      </div>
      <div className="my-4 flex flex-wrap items-center gap-2" role="group" aria-label="Aufgabenfokus">
        {(Object.keys(focusLabels) as Focus[]).map((value) => <button key={value} aria-pressed={focus === value} onClick={() => setFocus(value)} className={focus === value ? "filter-active" : "filter"}>{focusLabels[value]}{value !== "all" && <span className="ml-2 tabular-nums">{todos.filter((todo) => matchesFocus(todo, value, today)).length}</span>}</button>)}
        {hasFilters && <button className="icon-button" title="Filter zurücksetzen" aria-label="Filter zurücksetzen" onClick={() => { setFocus("all"); setQuery(""); setLinkFilter("all"); setAssigneeFilter("all"); }}><X size={16}/></button>}
      </div>
      <DndContext sensors={sensors} collisionDetection={(args) => args.pointerCoordinates ? pointerWithin(args) : closestCorners(args)} onDragStart={({ active }) => setDragId(String(active.id))} onDragEnd={endDrag} onDragCancel={() => setDragId(null)} accessibility={{ screenReaderInstructions: { draggable: "Leertaste zum Aufnehmen. Mit den Pfeiltasten die Statusspalte wählen. Leertaste zum Ablegen, Escape zum Abbrechen." }, announcements: {
        onDragStart: ({ active }) => `Aufgabe ${todos.find((todo) => todo.id === active.id)?.title ?? ""} aufgenommen.`,
        onDragOver: ({ over }) => over ? `Ziel: ${statusLabels[over.id as TodoStatus]}.` : "Außerhalb der Statusspalten.",
        onDragEnd: ({ over }) => over ? `Abgelegt: ${statusLabels[over.id as TodoStatus]}.` : "Verschieben abgebrochen.",
        onDragCancel: () => "Verschieben abgebrochen.",
      } }}>
        <div className="overflow-x-auto pb-3" role="region" aria-label="Aufgabenboard" tabIndex={0}>
          <div className="grid grid-cols-[repeat(3,minmax(270px,1fr))] gap-4">
            {statusOrder.map((status) => {
              const columnTodos = filtered.filter((todo) => todo.status === status);
              const displayed = status === "done" && !showAllDone ? columnTodos.slice(0, 10) : columnTodos;
              return <BoardColumn key={status} status={status} count={columnTodos.length} disabled={loading || loadFailed}>
                {loading ? <div className="space-y-3" aria-label="Aufgaben werden geladen">{[0, 1, 2].map((index) => <div key={index} className="h-32 animate-pulse rounded-lg border border-[var(--line)] bg-[var(--surface)]"/>)}</div> : displayed.map((todo) => <TaskCard key={todo.id} todo={todo} relation={relationName(todo)} assignee={assigneeName(todo)} busy={pending.includes(todo.id)} onOpen={() => setEditor(todo)} onStatusChange={(next) => void setStatus(todo.id, next)} onDelete={() => { setError(""); void remove(todo).catch((cause) => setError(cause instanceof Error ? cause.message : "Aufgabe konnte nicht gelöscht werden.")); }}/>)}
                {!loading && !loadFailed && !columnTodos.length && <p className="py-10 text-center text-xs text-[var(--muted)]">{hasFilters ? "Keine passenden Aufgaben" : status === "done" ? "Noch nichts erledigt" : status === "in_progress" ? "Keine Aufgabe in Bearbeitung" : "Keine offenen Aufgaben"}</p>}
                {status === "done" && columnTodos.length > 10 && <button onClick={() => setShowAllDone(!showAllDone)} className="action w-full text-xs">{showAllDone ? "Weniger anzeigen" : `${columnTodos.length - 10} weitere anzeigen`}</button>}
              </BoardColumn>;
            })}
          </div>
        </div>
        <DragOverlay>{dragTodo && <div className="todo-page rounded-lg border border-[var(--primary)] bg-[var(--surface)] p-4 shadow-xl"><TaskSummary todo={dragTodo} relation={relationName(dragTodo)} assignee={assigneeName(dragTodo)}/></div>}</DragOverlay>
      </DndContext>
      {editor !== null && <TaskDialog key={editor === "new" ? "new" : editor.id} todo={editor === "new" ? undefined : editor} customers={customers} prospects={prospects} members={members} onClose={() => setEditor(null)} onSave={save} onDelete={remove}/>}
    </div>
  </WorkspaceShell>;
}

function BoardColumn({ status, count, disabled, children }: { status: TodoStatus; count: number; disabled: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled });
  const Icon = statusIcons[status];
  return <section ref={setNodeRef} aria-label={statusLabels[status]} className={`min-h-[360px] rounded-lg border-t-2 bg-[var(--surface-soft)] p-3 transition-colors ${isOver ? "border-[var(--primary)] ring-2 ring-[var(--primary)]" : status === "done" ? "border-[#17b26a]" : status === "in_progress" ? "border-[var(--primary)]" : "border-[var(--line)]"}`}>
    <div className="mb-4 flex items-center gap-2 px-1"><Icon size={15} className={status === "done" ? "text-[#17b26a]" : "text-[var(--muted)]"}/><h2 className="text-sm font-semibold">{statusLabels[status]}</h2><span className="ml-auto text-xs tabular-nums text-[var(--muted)]">{count}</span></div>
    <div className="space-y-3">{children}</div>
  </section>;
}

function TaskSummary({ todo, relation, assignee }: { todo: Todo; relation?: string; assignee: string }) {
  const overdue = Boolean(todo.dueDate && todo.dueDate < todayKey() && todo.status !== "done");
  const RelationIcon = todo.customerId ? Users : ContactRound;
  return <>
    <p className="break-words text-sm font-semibold leading-6 [overflow-wrap:anywhere]">{todo.title}</p>
    {todo.notes && <p className="mt-2 line-clamp-2 break-words text-xs text-[var(--muted)] [overflow-wrap:anywhere]">{todo.notes}</p>}
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
      {todo.dueDate && <span className={`flex items-center gap-1 ${overdue ? "font-semibold text-[var(--danger)]" : ""}`}><CalendarClock size={13}/>{todo.dueDate === todayKey() ? "Heute" : new Date(`${todo.dueDate}T12:00:00`).toLocaleDateString("de-CH")}{overdue && " · Überfällig"}</span>}
      {relation && <span className="flex min-w-0 max-w-full items-center gap-1 text-[var(--primary)]"><RelationIcon size={13} className="shrink-0"/><span className="truncate" title={relation}>{relation}</span></span>}
      <span className="flex min-w-0 max-w-full items-center gap-1"><UserRound size={13} className="shrink-0"/><span className="truncate" title={assignee}>{assignee}</span></span>
    </div>
  </>;
}

function TaskCard({ todo, relation, assignee, busy, onOpen, onStatusChange, onDelete }: { todo: Todo; relation?: string; assignee: string; busy: boolean; onOpen: () => void; onStatusChange: (status: TodoStatus) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: todo.id, disabled: busy });
  return <article ref={setNodeRef} aria-busy={busy} className={`rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm ${isDragging ? "opacity-30" : ""}`}>
    <div className="flex items-start gap-1">
      <button onClick={onOpen} disabled={busy} className="min-w-0 flex-1 rounded text-left hover:text-[var(--primary)]" aria-label={`Aufgabe öffnen: ${todo.title}`}><TaskSummary todo={todo} relation={relation} assignee={assignee}/></button>
      <button ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={busy} className="icon-button shrink-0 touch-none cursor-grab active:cursor-grabbing" title="Aufgabe verschieben" aria-label={`Aufgabe verschieben: ${todo.title}`}><GripVertical size={17}/></button>
    </div>
    <div className="mt-3 flex items-center gap-2 border-t border-[var(--line)] pt-2">
      <select value={todo.status} disabled={busy} onChange={(event) => onStatusChange(event.target.value as TodoStatus)} aria-label={`Status: ${todo.title}`} className="min-h-8 min-w-0 flex-1 rounded border border-[var(--line)] bg-[var(--surface)] px-2 text-xs text-[var(--muted)]">{statusOrder.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
      <button type="button" onClick={onDelete} disabled={busy} className="icon-button shrink-0 text-[var(--danger)]" title="Aufgabe löschen" aria-label={`Aufgabe löschen: ${todo.title}`}><Trash2 size={16}/></button>
      {busy && <LoaderCircle size={14} className="animate-spin text-[var(--primary)]" aria-label="Wird gespeichert"/>}
    </div>
  </article>;
}

function LinkOptions({ customers, prospects }: { customers: Customer[]; prospects: Prospect[] }) {
  return <><option value="">Intern / ohne Bezug</option><optgroup label="Kunden">{customers.map((customer) => <option key={customer.id} value={`customer:${customer.id}`}>{customer.companyName}</option>)}</optgroup><optgroup label="Prospects">{prospects.map((prospect) => <option key={prospect.id} value={`prospect:${prospect.id}`}>{prospect.companyName}</option>)}</optgroup></>;
}

function TaskDialog({ todo, customers, prospects, members, onClose, onSave, onDelete }: { todo?: Todo; customers: Customer[]; prospects: Prospect[]; members: CompanyMember[]; onClose: () => void; onSave: (input: TodoInput) => Promise<void>; onDelete: (todo: Todo) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(todo?.title ?? "");
  const [notes, setNotes] = useState(todo?.notes ?? "");
  const [dueDate, setDueDate] = useState(todo?.dueDate ?? "");
  const [status, setStatus] = useState<TodoStatus>(todo?.status ?? "not_started");
  const [assigneeId, setAssigneeId] = useState(todo?.assigneeId ?? "");
  const [link, setLink] = useState<LinkChoice>(todo?.customerId ? `customer:${todo.customerId}` : todo?.prospectId ? `prospect:${todo.prospectId}` : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { element?.close(); }; }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true); setError("");
    const [kind, id] = link.split(":");
    try { await onSave({ title: title.trim(), notes: notes.trim(), status, dueDate: dueDate || undefined, customerId: kind === "customer" ? id : undefined, prospectId: kind === "prospect" ? id : undefined, assigneeId: assigneeId || undefined }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Aufgabe konnte nicht gespeichert werden."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!todo || busy) return;
    setBusy(true); setError("");
    try { await onDelete(todo); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Aufgabe konnte nicht gelöscht werden."); }
    finally { setBusy(false); }
  }
  const selectedLinkMissing = Boolean(link && !(link.startsWith("customer:") ? customers.some((customer) => `customer:${customer.id}` === link) : prospects.some((prospect) => `prospect:${prospect.id}` === link)));

  return <dialog ref={dialog} aria-labelledby="task-dialog-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="todo-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--ink)] shadow-xl sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id="task-dialog-title" className="text-lg font-semibold">{todo ? "Aufgabe bearbeiten" : "Aufgabe erstellen"}</h2><button onClick={onClose} disabled={busy} className="icon-button" title="Schließen" aria-label="Schließen"><X size={18}/></button></div>
    {error && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Aufgabe</span><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} className="field"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Status</span><select value={status} onChange={(event) => setStatus(event.target.value as TodoStatus)} className="field">{statusOrder.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Fällig am (optional)</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="field"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Verantwortlich (optional)</span><select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="field"><option value="">Nicht zugewiesen</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.email}</option>)}{assigneeId && !members.some((member) => member.user_id === assigneeId) && <option value={assigneeId} disabled>Mitglied nicht mehr verfügbar</option>}</select></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Kunde / Prospect (optional)</span><select value={link} onChange={(event) => setLink(event.target.value as LinkChoice)} className="field"><LinkOptions customers={customers} prospects={prospects}/>{selectedLinkMissing && <option value={link}>Bestehender Bezug (nicht verfügbar)</option>}</select></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Notizen (optional)</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="field resize-y"/></label>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          {todo ? <button type="button" onClick={remove} className="icon-button text-[var(--danger)]" title="Aufgabe löschen" aria-label="Aufgabe löschen"><Trash2 size={17}/></button> : <span/>}
          <div className="flex gap-2"><button type="button" onClick={onClose} className="action">Abbrechen</button><button disabled={!title.trim()} className="primary gap-2 whitespace-nowrap">{busy ? <LoaderCircle size={16} className="animate-spin"/> : <Check size={16}/>}Speichern</button></div>
        </div>
      </fieldset>
    </form>
    {todo && <Comments todoId={todo.id}/>}
  </dialog>;
}

function Comments({ todoId }: { todoId: string }) {
  const [comments, setComments] = useState<TodoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    getTodoComments(todoId).then((data) => { if (active) setComments(data); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Kommentare konnten nicht geladen werden."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [todoId, retry]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true); setError("");
    try { const comment = await createTodoComment(todoId, body.trim()); setComments((current) => [...current, comment]); setBody(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Kommentar konnte nicht gespeichert werden."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 border-t border-[var(--line)] pt-5" aria-label="Kommentare">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare size={15}/>Kommentare <span className="text-xs text-[var(--muted)]">{comments.length}</span></h3>
    {error && <div role="alert" className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--danger)]">{error}<button onClick={() => { setError(""); setLoading(true); setRetry((current) => current + 1); }} className="action text-xs">Erneut laden</button></div>}
    <div className="my-3 max-h-48 space-y-3 overflow-y-auto">
      {loading ? <p className="text-xs text-[var(--muted)]">Kommentare werden geladen...</p> : !comments.length && !error ? <p className="text-xs text-[var(--muted)]">Noch keine Kommentare.</p> : null}
      {comments.map((comment) => <div key={comment.id} className="border-l-2 border-[var(--line)] pl-3"><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{comment.body}</p><p className="mt-1 text-xs text-[var(--muted)]">{new Date(comment.createdAt).toLocaleString("de-CH")}</p></div>)}
    </div>
    <form onSubmit={submit}><label htmlFor="task-comment" className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Kommentar</label><div className="flex items-start gap-2"><textarea id="task-comment" rows={2} value={body} disabled={busy} onChange={(event) => setBody(event.target.value)} className="field min-w-0 flex-1 resize-y"/><button disabled={busy || !body.trim()} className="primary min-h-11 px-3" title="Kommentar senden" aria-label="Kommentar senden">{busy ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={16}/>}</button></div></form>
  </section>;
}