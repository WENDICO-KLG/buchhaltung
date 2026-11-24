"use client";

import { useRef, useState } from "react";
import { Delete, Equal, RotateCcw } from "lucide-react";
import styles from "@/components/calculator.module.css";
import { calculateExpression } from "@/lib/calculator";

export function Calculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<number>();
  const [error, setError] = useState("");
  const [scientific, setScientific] = useState(false);
  const [memory, setMemory] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  function evaluate() {
    try { setResult(calculateExpression(expression)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Ungültiger Ausdruck."); }
  }
  function insert(value: string) {
    const start = input.current?.selectionStart ?? expression.length;
    const end = input.current?.selectionEnd ?? start;
    setExpression((current) => (current.slice(0, start) + value + current.slice(end)).slice(0, 300));
    setError(""); input.current?.focus();
    requestAnimationFrame(() => input.current?.setSelectionRange(Math.min(start + value.length, 300), Math.min(start + value.length, 300)));
  }
  const keys = ["(", ")", "%", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "sqrt(", "="];
  return <section className="raised mt-7 p-5 md:p-8" aria-label="Taschenrechner">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_20.5rem] xl:gap-10">
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Taschenrechner</h2><label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px] text-[var(--muted)]">Wissenschaftlich<input type="checkbox" className="switch" checked={scientific} onChange={(event) => setScientific(event.target.checked)}/></label></div>
        <div className="mt-4 flex flex-1 flex-col justify-end lg:mt-6">
          <label htmlFor="calculator-expression" className="text-right text-[13px] text-[var(--muted)]">Berechnung</label>
          <input ref={input} id="calculator-expression" className={`${styles.expression} money`} value={expression} maxLength={300} placeholder="0" autoComplete="off" spellCheck={false} onChange={(event) => {setExpression(event.target.value);setError("");}} onKeyDown={(event) => {if(event.key === "Enter"){event.preventDefault();evaluate();}if(event.key === "Escape"){setExpression("");setResult(undefined);setError("");}}}/>
          <output aria-live="polite" className={`display ${styles.display} mt-4 block break-words text-right [overflow-wrap:anywhere]`}>{result === undefined ? "0" : new Intl.NumberFormat("de-CH",{maximumSignificantDigits:14}).format(result)}</output>
          {error && <p role="alert" className="mt-2 text-right text-sm text-[var(--coral)]">{error}</p>}
        </div>
        {scientific && <div className="mt-6 grid grid-cols-4 gap-2 xl:grid-cols-8">{["sin(","cos(","tan(","log10(","log(","abs(","pi","e","^2","^","!","exp(","asin(","acos(","atan(","round("].map((value) => <button key={value} className="action min-w-0 !px-0 text-[13px]" onClick={() => insert(value)} title={value.includes("sin") || value.includes("cos") || value.includes("tan") ? "Winkel in Radiant" : value}>{value.replace("(","")}</button>)}</div>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"><div className="pill-track max-sm:w-full [&>button]:max-sm:flex-1 [&>button]:px-3 xl:[&>button]:px-4"><button className="filter" onClick={() => insert(String(result ?? 0))}>Ans</button><button className="filter" onClick={() => setMemory(0)}>MC</button><button className="filter" onClick={() => insert(String(memory))}>MR</button><button className="filter" onClick={() => setMemory((current) => current + (result ?? 0))}>M+</button><button className="filter" onClick={() => setMemory((current) => current - (result ?? 0))}>M−</button></div><span className="money ml-auto text-[13px] text-[var(--muted)]">M: {new Intl.NumberFormat("de-CH").format(memory)}</span></div>
      </div>
      <div className={styles.pad}><div className="flex gap-3 [&>button]:flex-1"><button className="action" onClick={() => {setExpression("");setResult(undefined);setError("");}} aria-label="Berechnung löschen" title="Alles löschen"><RotateCcw size={17} strokeWidth={1.6}/></button><button className="action" onClick={() => {setExpression((current) => current.slice(0,-1));setError("");}} aria-label="Letztes Zeichen löschen" title="Letztes Zeichen löschen"><Delete size={17} strokeWidth={1.6}/></button></div>
        <div className={styles.keys}>{keys.map((value) => <button key={value} className={`${styles.key} ${value === "=" ? styles.equal : /[0-9.]/.test(value) ? "" : styles.soft}`} onClick={() => value === "=" ? evaluate() : insert(value)} aria-label={value === "=" ? "Berechnen" : value === "sqrt(" ? "Quadratwurzel" : value}>{value === "=" ? <Equal size={22} strokeWidth={1.8}/> : value === "sqrt(" ? "√" : value === "*" ? "×" : value === "/" ? "÷" : value === "-" ? "−" : value}</button>)}</div></div>
    </div>
  </section>;
}
