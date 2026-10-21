"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, Copy, GraduationCap, LifeBuoy, ListChecks, MessageCircleQuestionMark, Search, Target, Voicemail, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Callout, ProspectsTabs, Tip } from "@/components/prospects-section";
import { afterCallChecklist, callDonts, callDos, callGoal, callSteps, confirmationMail, groundRule, objectionCategories, objectionCategoryLabels, objections, rescueLines, searchObjections, voicemail } from "@/lib/sales-training";
import type { Objection } from "@/lib/sales-training";

const sections = [
  { id: "ablauf", label: "Gesprächsablauf" },
  { id: "einwaende", label: "Einwände" },
  { id: "combox", label: "Combox" },
  { id: "mail", label: "Bestätigungs-Mail" },
  { id: "notfall", label: "Wenn du nicht weiterweisst" },
  { id: "merksaetze", label: "Merksätze" },
];

export default function ProspectScriptPage() {
  return <WorkspaceShell active="Prospects" title="Wendico / Prospects / Spickzettel">
    <div className="sales-page page-enter pb-16">
      <ProspectsTabs current="/prospects/script"/>
      <CallScript/>
    </div>
  </WorkspaceShell>;
}

function CallScript() {
  const [query, setQuery] = useState("");
  const searchField = useRef<HTMLInputElement>(null);
  const results = searchObjections(objections, query);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || (event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable='true']"))) return;
    event.preventDefault();
    searchField.current?.focus();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  return <>
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--primary)]">Vertrieb · Gesprächsleitfaden</p>
        <h1 className="mt-3 text-3xl font-semibold">Spickzettel</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">Alles für den Anruf auf einer Seite. Am besten in einem zweiten Tab offen lassen, während du telefonierst.</p>
      </div>
      <Link href="/prospects/training" className="action whitespace-nowrap"><GraduationCap size={16}/>Einwände üben</Link>
    </div>

    <div className="mt-7 grid gap-3 md:grid-cols-2">
      <Callout icon={Target} title={callGoal.title} text={callGoal.text}/>
      <Callout icon={MessageCircleQuestionMark} title={groundRule.title} text={groundRule.text}/>
    </div>

    <label className="mt-7 block">
      <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Schnellsuche im Gespräch</span>
      <span className="relative block">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-[var(--muted)]"/>
        <input ref={searchField} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder="Was sagt die Kundin? z. B. teuer, Website, keine Zeit" className="field sales-search"/>
        {query ? <button type="button" className="icon-button absolute right-2 top-1.5" title="Suche löschen" aria-label="Suche löschen" onClick={() => { setQuery(""); searchField.current?.focus(); }}><X size={16}/></button> : <kbd className="pointer-events-none absolute right-3 top-2.5 hidden rounded-md border border-b-2 border-[var(--line)] px-1.5 py-0.5 font-sans text-xs text-[var(--muted)] md:block" title="Taste / springt in die Suche">/</kbd>}
      </span>
    </label>

    {query.trim() ? <section aria-label="Suchergebnisse" className="mt-6">
      <p role="status" className="text-sm text-[var(--muted)]">{results.length ? `${results.length} Treffer für «${query.trim()}»` : `Kein Einwand passt zu «${query.trim()}». Dann gilt die Grundregel: kurz anerkennen, dann eine Frage stellen.`}</p>
      {results.length > 0 && <div className="mt-2">{results.map((item) => <ObjectionRow key={item.id} item={item} showCategory/>)}</div>}
    </section> : <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="Inhalt" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="hidden text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)] lg:block">Auf dieser Seite</p>
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:mt-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
          {sections.map(({ id, label }) => <li key={id} className="shrink-0"><a href={`#${id}`} className="block rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] lg:rounded-none lg:border-0 lg:border-l-2 lg:bg-transparent lg:px-3 lg:py-1.5 lg:text-sm lg:font-medium lg:hover:border-[var(--primary)]">{label}</a></li>)}
        </ul>
      </nav>

      <div className="min-w-0 space-y-16">
        <ScriptSection id="ablauf" title="Gesprächsablauf" text="Fünf Schritte vom «Grüezi» bis zum Termin.">
          <ol className="mt-6">
            {callSteps.map((step, index) => <li key={step.title} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 pb-9 last:pb-0">
              {index < callSteps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[1.125rem] top-10 w-px bg-[var(--line)]"/>}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--primary)]">{index + 1}</span>
              <div className="min-w-0 pt-1">
                <h3 className="text-lg font-semibold leading-tight">{step.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{step.goal}</p>
                <div className="mt-3 space-y-2">{step.lines.map((line) => <blockquote key={line.text} className="rounded-xl border-l-4 border-[var(--primary)] bg-[var(--surface-soft)] px-4 py-3 leading-relaxed">{line.label && <span className="mb-0.5 block text-xs font-semibold uppercase tracking-[.12em] text-[var(--muted)]">{line.label}</span>}«{line.text}»</blockquote>)}</div>
                <Tip className="mt-3">{step.tip}</Tip>
              </div>
            </li>)}
          </ol>
          <div className="panel mt-9 rounded-2xl p-5 sm:p-6">
            <h3 className="flex items-center gap-2 font-semibold"><ListChecks size={18} className="text-[var(--primary)]"/>Nach dem Anruf im Prospect festhalten</h3>
            <ul className="mt-3 space-y-2 text-sm">{afterCallChecklist.map((item) => <li key={item} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-[var(--primary)]"/>{item}</li>)}</ul>
            <Link href="/prospects" className="action mt-5">Zur Pipeline</Link>
          </div>
        </ScriptSection>

        <ScriptSection id="einwaende" title="Einwände" text={`${objections.length} typische Einwände mit Musterantwort. Mit der Schnellsuche oben findest du jeden in Sekunden.`}>
          <div className="mt-6 space-y-10">{objectionCategories.map((category) => {
            const items = objections.filter((item) => item.category === category);
            return <div key={category}>
              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                <h3 className="text-lg font-semibold">{objectionCategoryLabels[category]}<span className="ml-2 text-sm font-normal tabular-nums text-[var(--muted)]">{items.length}</span></h3>
                <Link href={`/prospects/training?category=${category}`} aria-label={`${objectionCategoryLabels[category]} üben`} className="shrink-0 text-sm font-semibold text-[var(--primary)] hover:underline">Üben</Link>
              </div>
              {items.map((item) => <ObjectionRow key={item.id} item={item}/>)}
            </div>;
          })}</div>
        </ScriptSection>

        <ScriptSection id="combox" title="Combox-Nachricht" text="Niemand nimmt ab? Kurz draufsprechen und später nochmals anrufen.">
          <div className="panel mt-5 rounded-2xl p-5 sm:p-6">
            <blockquote className="flex gap-3 leading-relaxed sm:text-lg"><Voicemail size={20} className="mt-1 shrink-0 text-[var(--primary)]"/><span>«{voicemail.text}»</span></blockquote>
            <Tip className="mt-4">{voicemail.tip}</Tip>
          </div>
        </ScriptSection>

        <ScriptSection id="mail" title="Bestätigungs-Mail" text="Gleich nach dem Anruf schicken, wenn ein Termin steht. Platzhalter in [Klammern] ersetzen.">
          <div className="panel mt-5 overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3"><p className="min-w-0 text-sm"><span className="text-[var(--muted)]">Betreff: </span><strong className="font-semibold">{confirmationMail.subject}</strong></p><CopyButton text={confirmationMail.subject} label="Betreff kopieren"/></div>
            <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed">{confirmationMail.body}</p>
            <div className="flex justify-end border-t border-[var(--line)] px-5 py-3"><CopyButton text={confirmationMail.body} label="Text kopieren"/></div>
          </div>
        </ScriptSection>

        <ScriptSection id="notfall" title="Wenn du nicht weiterweisst" text="Drei Sätze, mit denen du jede Lage auffängst.">
          <div className="mt-5 grid gap-3 md:grid-cols-3">{rescueLines.map((item) => <div key={item.situation} className="panel flex flex-col rounded-2xl p-5">
            <p className="flex items-start gap-2 text-sm font-semibold text-[var(--muted)]"><LifeBuoy size={16} className="mt-0.5 shrink-0 text-[var(--primary)]"/>{item.situation}</p>
            <p className="mt-3 font-semibold leading-snug">«{item.line}»</p>
            <Tip className="mt-auto pt-4">{item.tip}</Tip>
          </div>)}</div>
        </ScriptSection>

        <ScriptSection id="merksaetze" title="Merksätze">
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="panel rounded-2xl p-5"><h3 className="font-semibold">Mach das</h3><ul className="mt-3 space-y-2.5 text-sm">{callDos.map((item) => <li key={item} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-[#17b26a]"/>{item}</li>)}</ul></div>
            <div className="panel rounded-2xl p-5"><h3 className="font-semibold">Lass das</h3><ul className="mt-3 space-y-2.5 text-sm">{callDonts.map((item) => <li key={item} className="flex gap-2.5"><X size={17} className="mt-0.5 shrink-0 text-[var(--danger)]"/>{item}</li>)}</ul></div>
          </div>
        </ScriptSection>
      </div>
    </div>}
  </>;
}

function ScriptSection({ id, title, text, children }: { id: string; title: string; text?: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
    <h2 id={`${id}-title`} className="text-2xl font-semibold">{title}</h2>
    {text && <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>}
    {children}
  </section>;
}

function ObjectionRow({ item, showCategory = false }: { item: Objection; showCategory?: boolean }) {
  return <article className="grid gap-x-8 gap-y-2 border-b border-[var(--line)] py-5 last:border-b-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <div className="min-w-0">
      {showCategory && <p className="mb-1 text-xs font-semibold uppercase tracking-[.12em] text-[var(--primary)]">{objectionCategoryLabels[item.category]}</p>}
      <p className="font-semibold leading-snug">«{item.objection}»</p>
    </div>
    <div className="min-w-0 space-y-2"><p className="leading-relaxed">«{item.answer}»</p><Tip>{item.tip}</Tip></div>
  </article>;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setState("copied"); } catch { setState("failed"); }
  }
  return <button type="button" className="action" onClick={() => void copy()}>{state === "copied" ? <Check size={15}/> : <Copy size={15}/>}<span aria-live="polite">{state === "copied" ? "Kopiert" : state === "failed" ? "Bitte von Hand kopieren" : label}</span></button>;
}
