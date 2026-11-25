"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Maximize2, MessageCircleQuestionMark, Minimize2, RotateCcw, Shuffle, Trophy, UserRound } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Callout, ProspectsTabs, Tip } from "@/components/prospects-section";
import { groundRule, isObjectionCategory, objectionCategories, objectionCategoryLabels, objections, parseTrainingProgress, toggleCategory, trainingDeck, trainingPool, trainingProgressKey } from "@/lib/sales-training";
import type { ObjectionCategory, ObjectionRating, TrainingProgress } from "@/lib/sales-training";
import styles from "./training.module.css";

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
        <div role="progressbar" aria-label="Einwände, die sitzen" aria-valuemin={0} aria-valuemax={objections.length} aria-valuenow={mastered} className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--ring-track)]"><div className="bar-value h-full rounded-full bg-[var(--green)]" style={{ "--value": `${(mastered / objections.length) * 100}%` } as React.CSSProperties}/></div>
        <div className="mt-2 flex min-h-11 items-center justify-between gap-3 text-[13.5px] text-[var(--muted)]"><span>Wird auf diesem Gerät gespeichert.</span>{Object.keys(progress).length > 0 && <button className="min-h-11 font-medium text-[var(--ink)] hover:underline" onClick={resetProgress}>Zurücksetzen</button>}</div>
      </div>}/>

    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="pill-track" role="group" aria-label="Kategorien">
        <button aria-pressed={!categories.length} className={!categories.length ? "filter-active px-3.5" : "filter px-3.5"} onClick={() => startRound([])}>Alle<span className="ml-1.5 tabular-nums">{objections.length}</span></button>
        {objectionCategories.map((category) => <button key={category} aria-pressed={categories.includes(category)} className={categories.includes(category) ? "filter-active px-3.5" : "filter px-3.5"} onClick={() => startRound(toggleCategory(categories, category))}>{objectionCategoryLabels[category]}<span className="ml-1.5 tabular-nums">{objections.filter((item) => item.category === category).length}</span></button>)}
      </div>
      <label className="flex min-h-11 items-center gap-2.5 text-sm xl:ml-auto text-[var(--muted)]"><input type="checkbox" role="switch" className="switch" checked={onlyOpen} onChange={() => startRound(categories, !onlyOpen)}/>Nur offene üben<span className="tabular-nums">({open})</span></label>
    </div>

    <section ref={stage} aria-label="Übungskarte" className={`sales-stage ${styles.stage} mt-5`}>
      {current ? <>
        <div className="raised p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--muted)]">{objectionCategoryLabels[current.category]}</span>
            <span className="tabular-nums text-[var(--muted)]">Einwand {position + 1} von {deck.length}{progress[current.id] === "mastered" ? " · sitzt" : progress[current.id] === "practice" ? " · noch üben" : ""}</span>
          </div>
          <p aria-live="polite" className="sales-quote display mt-6 flex min-h-[2.4em] items-center text-[1.75rem] !leading-[1.2] [text-wrap:balance] sm:text-[2.5rem] in-[:fullscreen]:!text-[clamp(2.25rem,5vw,4.5rem)]">«{current.objection}»</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-[var(--muted)]"><p className="flex items-center gap-3"><span className="user-avatar"><UserRound aria-hidden size={18} strokeWidth={1.6}/></span>Salon-Besitzerin am Telefon</p>{!revealed && <p>Erst laut antworten, dann die Musterantwort aufdecken.</p>}</div>
        </div>
        <div aria-live="polite" className={revealed ? "mt-5" : ""}>
          {revealed && <div className={`${styles.answer} panel p-6 sm:p-9`}>
            <p className="text-sm text-[var(--muted)]">So könntest du antworten</p>
            <p className="sales-answer mt-2 max-w-[62ch] text-base leading-relaxed sm:text-lg in-[:fullscreen]:!text-[clamp(1.3rem,2.4vw,2rem)]">«{current.answer}»</p>
            <Tip className="mt-4">{current.tip}</Tip>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-5">
              <span className="mr-1 text-sm">Wie lief deine Antwort?</span>
              <button className="action" onClick={() => rate("practice")}><RotateCcw size={15}/>Nochmals üben</button>
              <button className="primary gap-2" onClick={() => rate("mastered")}><Check size={15}/>Sitzt</button>
            </div>
          </div>}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button className={revealed ? "action" : "primary gap-2"} onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff size={16}/> : <Eye size={16}/>}{revealed ? "Antwort verbergen" : "Antwort zeigen"}</button>
          <button className="action" onClick={next}>Nächster Einwand<ArrowRight size={16}/></button>
          {presentButton}
          <p className="ml-auto hidden items-center gap-1.5 text-[13.5px] text-[var(--muted)] lg:flex"><Key>A</Key>Antwort<Key>→</Key>weiter<Key>1</Key>üben<Key>2</Key>sitzt</p>
        </div>
      </> : <div className="raised px-6 py-14 text-center sm:px-10">
        <span className="user-avatar mx-auto"><Trophy aria-hidden size={20} strokeWidth={1.6} className="text-[var(--primary)]"/></span>
        <h2 className="display mt-5 text-[2rem]">{deck.length ? "Runde geschafft!" : "Hier sitzt schon alles."}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{deck.length ? `${deck.length} ${deck.length === 1 ? "Einwand" : "Einwände"} durchgespielt, ${roundMastered} davon ${roundMastered === 1 ? "sitzt" : "sitzen"}.` : "In dieser Auswahl hast du jeden Einwand mit «Sitzt» bewertet."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {deck.length > 0 && <button className="primary gap-2" onClick={() => startRound()}><Shuffle size={16}/>Neue Runde</button>}
          {!onlyOpen && open > 0 && <button className="action" onClick={() => startRound(categories, true)}>Nur offene üben ({open})</button>}
          {onlyOpen && <button className={deck.length ? "action" : "primary gap-2"} onClick={() => startRound(categories, false)}>Alle Einwände üben</button>}
          {presenting && presentButton}
        </div>
      </div>}
    </section>

    <div className="panel mt-8 p-5 sm:p-6"><Callout icon={MessageCircleQuestionMark} title={groundRule.title} text={groundRule.text}/></div>
  </>;
}

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className={styles.key}>{children}</kbd>;
}
