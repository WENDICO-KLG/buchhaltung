"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, Copy, GraduationCap, LifeBuoy, ListChecks, MessageCircleQuestionMark, Search, Target, Voicemail, X } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Callout, ProspectsTabs, Tip } from "@/components/prospects-section";
import { afterCallChecklist, callDonts, callDos, callGoal, callSteps, confirmationMail, groundRule, objectionCategories, objectionCategoryLabels, objections, rescueLines, searchObjections, voicemail } from "@/lib/sales-training";
import type { Objection } from "@/lib/sales-training";
import styles from "./script.module.css";

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
  const searching = Boolean(query.trim());
  const [active, setActive] = useState(sections[0].id);
  useEffect(() => {
    if (searching) return;
    const update = () => {
      const passed = sections.filter(({ id }) => { const element = document.getElementById(id); return element && element.getBoundingClientRect().top < innerHeight * .35; });
      const atEnd = scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
      setActive((atEnd ? sections : passed).at(-1)?.id ?? sections[0].id);
    };
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, [searching]);
  const toc = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const track = toc.current, link = track?.querySelector<HTMLElement>("[aria-current]");
    if (track && link) track.scrollLeft += link.getBoundingClientRect().left - track.getBoundingClientRect().left - (track.clientWidth - link.offsetWidth) / 2;
  }, [active]);

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
    <PageHeader title="Spickzettel" subtitle="Alles für den Anruf auf einer Seite. Am besten in einem zweiten Tab offen lassen, während du telefonierst." actions={<Link href="/prospects/training" className="action whitespace-nowrap max-sm:w-full"><GraduationCap size={16} strokeWidth={1.6}/>Einwände üben</Link>}/>

    <div className="raised mt-7 p-5 sm:p-7">
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-[var(--muted)]">Schnellsuche im Gespräch</span>
      <span className="relative block">
        <Search size={16} strokeWidth={1.6} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
        <input ref={searchField} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder="Was sagt die Kundin? z. B. teuer, Website, keine Zeit" className="field sales-search"/>
        {query ? <button type="button" className="icon-button !absolute right-1 top-1/2 -translate-y-1/2" title="Suche löschen" aria-label="Suche löschen" onClick={() => { setQuery(""); searchField.current?.focus(); }}><X size={16}/></button> : <kbd className={`${styles.key} max-md:hidden`} title="Taste / springt in die Suche">/</kbd>}
      </span>
    </label>
    <div className={`mt-7 grid gap-x-10 gap-y-6 md:grid-cols-2 ${searching ? "max-md:hidden" : ""}`}>
      <Callout icon={Target} title={callGoal.title} text={callGoal.text}/>
      <Callout icon={MessageCircleQuestionMark} title={groundRule.title} text={groundRule.text}/>
    </div>
    </div>

    {searching ? <section aria-label="Suchergebnisse" className="panel mt-6 p-5 sm:p-7">
      <p role="status" className="text-sm text-[var(--muted)]">{results.length ? `${results.length} Treffer für «${query.trim()}»` : `Kein Einwand passt zu «${query.trim()}». Dann gilt die Grundregel: kurz anerkennen, dann eine Frage stellen.`}</p>
      {results.length > 0 && <div className="mt-4">{results.map((item) => <ObjectionRow key={item.id} item={item} showCategory/>)}</div>}
    </section> : <div className="mt-8">
      <nav aria-label="Inhalt" className={styles.toc}>
        <ul ref={toc} className="pill-track">
          {sections.map(({ id, label }) => <li key={id} className="shrink-0"><a href={`#${id}`} aria-current={active === id ? "location" : undefined} className={`${active === id ? "filter-active" : "filter"} focus-visible:outline-offset-[-2px]`}>{label}</a></li>)}
        </ul>
      </nav>

      <div className="mt-8 min-w-0 space-y-12">
        <ScriptSection id="ablauf" title="Gesprächsablauf" text="Fünf Schritte vom «Grüezi» bis zum Termin.">
          <ol className="panel mt-5 p-5 sm:p-7">
            {callSteps.map((step, index) => <li key={step.title} className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 pb-9 sm:gap-x-6 last:pb-0">
              {index < callSteps.length - 1 && <span aria-hidden="true" className="absolute bottom-2 left-[1.375rem] top-13 w-px bg-[var(--line)]"/>}
              <span className={`${styles.number} money`}>{index + 1}</span>
              <div className="min-w-0 pt-1">
                <h3 className="text-base font-semibold leading-tight">{step.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{step.goal}</p>
                <div className="mt-4 space-y-4">{step.lines.map((line) => <blockquote key={line.text} className="max-w-[68ch] text-base leading-relaxed">{line.label && <span className="mb-0.5 block text-[13px] text-[var(--muted)]">{line.label}</span>}«{line.text}»</blockquote>)}</div>
                <Tip className="mt-4">{step.tip}</Tip>
              </div>
            </li>)}
          </ol>
          <div className="panel mt-5 p-5 sm:p-7">
            <h3 className="flex items-center gap-2 font-semibold"><ListChecks size={17} strokeWidth={1.6} className="text-[var(--muted)]"/>Nach dem Anruf im Prospect festhalten</h3>
            <ul className="mt-3 space-y-2 text-sm">{afterCallChecklist.map((item) => <li key={item} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-[var(--muted)]"/>{item}</li>)}</ul>
            <Link href="/prospects" className="action mt-5">Zur Pipeline</Link>
          </div>
        </ScriptSection>

        <ScriptSection id="einwaende" title="Einwände" text={`${objections.length} typische Einwände mit Musterantwort. Mit der Schnellsuche oben findest du jeden in Sekunden.`}>
          <div className="panel mt-5 space-y-9 p-5 sm:p-7">{objectionCategories.map((category) => {
            const items = objections.filter((item) => item.category === category);
            return <div key={category}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{objectionCategoryLabels[category]}<span className="ml-2 text-sm font-normal tabular-nums text-[var(--muted)]">{items.length}</span></h3>
                <Link href={`/prospects/training?category=${category}`} aria-label={`${objectionCategoryLabels[category]} üben`} className="action">Üben</Link>
              </div>
              {items.map((item) => <ObjectionRow key={item.id} item={item}/>)}
            </div>;
          })}</div>
        </ScriptSection>

        <ScriptSection id="combox" title="Combox-Nachricht" text="Niemand nimmt ab? Kurz draufsprechen und später nochmals anrufen.">
          <div className="panel mt-5 p-5 sm:p-7">
            <blockquote className="flex gap-3 text-base leading-relaxed"><Voicemail size={18} strokeWidth={1.6} className="mt-1 shrink-0 text-[var(--muted)]"/><span>«{voicemail.text}»</span></blockquote>
            <Tip className="mt-4">{voicemail.tip}</Tip>
          </div>
        </ScriptSection>

        <ScriptSection id="mail" title="Bestätigungs-Mail" text="Gleich nach dem Anruf schicken, wenn ein Termin steht. Platzhalter in [Klammern] ersetzen.">
          <div className="panel mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-7"><p className="min-w-0 text-sm"><span className="text-[var(--muted)]">Betreff: </span><strong className="font-semibold">{confirmationMail.subject}</strong></p><CopyButton text={confirmationMail.subject} label="Betreff kopieren"/></div>
            <p className="whitespace-pre-line px-5 py-5 sm:px-7 text-sm leading-relaxed">{confirmationMail.body}</p>
            <div className="flex justify-end border-t border-[var(--line)] px-5 py-4 sm:px-7"><CopyButton text={confirmationMail.body} label="Text kopieren"/></div>
          </div>
        </ScriptSection>

        <ScriptSection id="notfall" title="Wenn du nicht weiterweisst" text="Drei Sätze, mit denen du jede Lage auffängst.">
          <div className="panel mt-5 grid divide-y divide-[var(--line)] md:grid-cols-3 md:divide-x md:divide-y-0">{rescueLines.map((item) => <div key={item.situation} className="flex flex-col p-5 sm:p-7">
            <p className="flex items-start gap-2 text-sm text-[var(--muted)]"><LifeBuoy size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[var(--muted)]"/>{item.situation}</p>
            <p className="mt-3 text-base font-medium leading-snug">«{item.line}»</p>
            <Tip className="mt-auto pt-4">{item.tip}</Tip>
          </div>)}</div>
        </ScriptSection>

        <ScriptSection id="merksaetze" title="Merksätze">
          <div className="panel mt-5 grid divide-y divide-[var(--line)] md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-5 sm:p-7"><h3 className="font-semibold">Mach das</h3><ul className="mt-3 space-y-2.5 text-sm">{callDos.map((item) => <li key={item} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-[var(--emerald)]"/>{item}</li>)}</ul></div>
            <div className="p-5 sm:p-7"><h3 className="font-semibold">Lass das</h3><ul className="mt-3 space-y-2.5 text-sm">{callDonts.map((item) => <li key={item} className="flex gap-2.5"><X size={17} className="mt-0.5 shrink-0 text-[var(--coral)]"/>{item}</li>)}</ul></div>
          </div>
        </ScriptSection>
      </div>
    </div>}
  </>;
}

function ScriptSection({ id, title, text, children }: { id: string; title: string; text?: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className={styles.section}>
    <h2 id={`${id}-title`} className="text-xl font-semibold">{title}</h2>
    {text && <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>}
    {children}
  </section>;
}

function ObjectionRow({ item, showCategory = false }: { item: Objection; showCategory?: boolean }) {
  return <article className="grid gap-x-8 gap-y-2 border-t border-[var(--line)] py-5 last:pb-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <div className="min-w-0">
      {showCategory && <p className="mb-1 text-[13px] text-[var(--muted)]">{objectionCategoryLabels[item.category]}</p>}
      <p className="font-medium leading-snug">«{item.objection}»</p>
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
