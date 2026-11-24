"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Maximize2, MessageCircleQuestionMark, Minimize2, RotateCcw, Shuffle, Trophy, UserRound } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Callout, ProspectsTabs, Tip } from "@/components/prospects-section";
import { groundRule, isObjectionCategory, objectionCategories, objectionCategoryLabels, objections, parseTrainingProgress, toggleCategory, trainingDeck, trainingPool, trainingProgressKey } from "@/lib/sales-training";
import type { ObjectionCategory, ObjectionRating, TrainingProgress } from "@/lib/sales-training";

export default function ProspectTrainingPage() {
  return <WorkspaceShell active="Prospects" title="Wendico / Prospects / Training">
    <div className="sales-page page-enter pb-16">
      <ProspectsTabs current="/prospects/training"/>
      <ObjectionTrainer/>
    </div>
  </WorkspaceShell>;
}

function loadProgress(): TrainingProgress {
  try { return parseTrainingProgress(window.localStorage.getItem(trainingProgressKey)); } catch { return {}; }
}

function storeProgress(progress: TrainingProgress) {
  try { window.localStorage.setItem(trainingProgressKey, JSON.stringify(progress)); } catch { /* Ohne Speicher gilt der Fortschritt bis zum Neuladen. */ }
}

function ObjectionTrainer() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ObjectionCategory[]>(() => { const category = searchParams.get("category"); return isObjectionCategory(category) ? [category] : []; });
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const [deck, setDeck] = useState(() => trainingDeck(trainingPool(objections, categories, progress, false)));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [canPresent] = useState(() => typeof document !== "undefined" && document.fullscreenEnabled);
  const stage = useRef<HTMLElement>(null);

  const current = objections.find((item) => item.id === deck[position]);
  const mastered = objections.filter((item) => progress[item.id] === "mastered").length;
  const open = trainingPool(objections, categories, progress, true).length;
  const roundMastered = deck.filter((id) => progress[id] === "mastered").length;

  function startRound(nextCategories = categories, nextOnlyOpen = onlyOpen, nextProgress = progress) {
    setCategories(nextCategories); setOnlyOpen(nextOnlyOpen);
    setDeck(trainingDeck(trainingPool(objections, nextCategories, nextProgress, nextOnlyOpen), current?.id));
    setPosition(0); setRevealed(false);
  }
  function next() { if (current) { setPosition(position + 1); setRevealed(false); } }
  function rate(rating: ObjectionRating) {
    if (!current) return;
    const nextProgress = { ...progress, [current.id]: rating };
    setProgress(nextProgress); storeProgress(nextProgress); next();
  }
  function resetProgress() {
    if (!window.confirm("Fortschritt zurücksetzen? Alle Einwände gelten danach wieder als offen.")) return;
    setProgress({}); storeProgress({}); startRound(categories, onlyOpen, {});
  }
  function togglePresentation() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void stage.current?.requestFullscreen().catch(() => undefined);
  }

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || (event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable='true']"))) return;
    const key = event.key.toLowerCase();
    if (key === "arrowright" || key === "n") { event.preventDefault(); next(); }
    else if (key === "a" && current) setRevealed(!revealed);
    else if (key === "1" && revealed) rate("practice");
    else if (key === "2" && revealed) rate("mastered");
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    const syncPresenting = () => setPresenting(Boolean(stage.current && document.fullscreenElement === stage.current));
    document.addEventListener("keydown", listener);
    document.addEventListener("fullscreenchange", syncPresenting);
    return () => { document.removeEventListener("keydown", listener); document.removeEventListener("fullscreenchange", syncPresenting); };
  }, []);

  const presentButton = canPresent && <button className="action" onClick={togglePresentation}>{presenting ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}{presenting ? "Vollbild beenden" : "Präsentieren"}</button>;

  return <>
    <PageHeader title="Einwand-Training" subtitle="Einwand lesen, laut antworten, dann mit der Musterantwort vergleichen." actions={<div className="w-full sm:w-80">
        <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-[var(--muted)]">Fortschritt</span><span className="tabular-nums"><strong>{mastered}</strong> von {objections.length} sitzen</span></div>
        <div role="progressbar" aria-label="Einwände, die sitzen" aria-valuemin={0} aria-valuemax={objections.length} aria-valuenow={mastered} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className="bar-value h-full rounded-full bg-[var(--gold)]" style={{ width: `${(mastered / objections.length) * 100}%` }}/></div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-[var(--muted)]"><span>Wird auf diesem Gerät gespeichert.</span>{Object.keys(progress).length > 0 && <button className="min-h-11 font-semibold text-[var(--gold)] hover:underline" onClick={resetProgress}>Zurücksetzen</button>}</div>
      </div>}/>

    <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Kategorien">
        <button aria-pressed={!categories.length} className={!categories.length ? "filter-active" : "filter"} onClick={() => startRound([])}>Alle<span className="ml-1.5 tabular-nums opacity-70">{objections.length}</span></button>
        {objectionCategories.map((category) => <button key={category} aria-pressed={categories.includes(category)} className={categories.includes(category) ? "filter-active" : "filter"} onClick={() => startRound(toggleCategory(categories, category))}>{objectionCategoryLabels[category]}<span className="ml-1.5 tabular-nums opacity-70">{objections.filter((item) => item.category === category).length}</span></button>)}
      </div>
      <label className="ml-auto flex min-h-11 items-center gap-2.5 text-sm max-sm:ml-0 text-[var(--muted)]"><input type="checkbox" role="switch" className="commission-switch" checked={onlyOpen} onChange={() => startRound(categories, !onlyOpen)}/>Nur offene üben<span className="tabular-nums">({open})</span></label>
    </div>

    <section ref={stage} aria-label="Übungskarte" className="sales-stage mt-6">
      {current ? <>
        <div className="panel sales-bubble rounded-[1.75rem] p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-medium">{objectionCategoryLabels[current.category]}</span>
            <span className="tabular-nums text-[var(--muted)]">Einwand {position + 1} von {deck.length}{progress[current.id] === "mastered" ? " · sitzt" : progress[current.id] === "practice" ? " · noch üben" : ""}</span>
          </div>
          <p aria-live="polite" className="sales-quote display mt-5 flex min-h-[2.4em] items-center text-[2rem] !leading-[1.18] [text-wrap:balance] sm:text-[2.75rem] in-[:fullscreen]:!text-[clamp(2.25rem,5vw,4.5rem)]">«{current.objection}»</p>
        </div>
        <p className="mt-5 flex items-center gap-3 pl-6 text-sm text-[var(--muted)] sm:pl-8"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--surface-soft)]"><UserRound aria-hidden size={18} strokeWidth={1.6}/></span>Salon-Besitzerin am Telefon</p>
        <div aria-live="polite" className="mt-5">
          {revealed ? <div className="raised rounded-2xl p-5 sm:p-8">
            <p className="text-sm text-[var(--muted)]">So könntest du antworten</p>
            <p className="sales-answer mt-2 max-w-[62ch] text-lg leading-relaxed sm:text-xl in-[:fullscreen]:!text-[clamp(1.3rem,2.4vw,2rem)]">«{current.answer}»</p>
            <Tip className="mt-3">{current.tip}</Tip>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
              <span className="mr-1 text-sm">Wie lief deine Antwort?</span>
              <button className="action" onClick={() => rate("practice")}><RotateCcw size={15}/>Nochmals üben</button>
              <button className="primary gap-2" onClick={() => rate("mastered")}><Check size={15}/>Sitzt</button>
            </div>
          </div> : <p className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-6 text-sm text-[var(--muted)]">Erst laut antworten, dann die Musterantwort aufdecken.</p>}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button className={revealed ? "action" : "primary gap-2"} onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff size={16}/> : <Eye size={16}/>}{revealed ? "Antwort verbergen" : "Antwort zeigen"}</button>
          <button className="action" onClick={next}>Nächster Einwand<ArrowRight size={16}/></button>
          {presentButton}
          <p className="ml-auto hidden items-center gap-1.5 text-[13px] text-[var(--muted)] md:flex"><Key>A</Key>Antwort<Key>→</Key>weiter<Key>1</Key>üben<Key>2</Key>sitzt</p>
        </div>
      </> : <div className="panel rounded-[1.75rem] px-6 py-14 text-center sm:px-10">
        <Trophy aria-hidden size={30} strokeWidth={1.4} className="mx-auto text-[var(--gold)]"/>
        <h2 className="display mt-4 text-4xl">{deck.length ? "Runde geschafft!" : "Hier sitzt schon alles."}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{deck.length ? `${deck.length} ${deck.length === 1 ? "Einwand" : "Einwände"} durchgespielt, ${roundMastered} davon ${roundMastered === 1 ? "sitzt" : "sitzen"}.` : "In dieser Auswahl hast du jeden Einwand mit «Sitzt» bewertet."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {deck.length > 0 && <button className="primary gap-2" onClick={() => startRound()}><Shuffle size={16}/>Neue Runde</button>}
          {!onlyOpen && open > 0 && <button className="action" onClick={() => startRound(categories, true)}>Nur offene üben ({open})</button>}
          {onlyOpen && <button className={deck.length ? "action" : "primary gap-2"} onClick={() => startRound(categories, false)}>Alle Einwände üben</button>}
          {presenting && presentButton}
        </div>
      </div>}
    </section>

    <div className="mt-12"><Callout icon={MessageCircleQuestionMark} title={groundRule.title} text={groundRule.text}/></div>
  </>;
}

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="ml-1.5 rounded-md border border-b-2 border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 font-sans text-xs font-semibold text-[var(--ink)] first:ml-0">{children}</kbd>;
}
