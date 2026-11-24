"use client";

import { useRef, useState } from "react";
import { Delete, Equal, RotateCcw } from "lucide-react";
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
  return <section className="panel mt-7 rounded-2xl p-5 md:p-7" aria-label="Taschenrechner">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Taschenrechner</h2><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--muted)]"><input type="checkbox" className="h-5 w-5 accent-[var(--gold)]" checked={scientific} onChange={(event) => setScientific(event.target.checked)}/>Wissenschaftlich</label></div>
    <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-7">
      <div className="flex min-w-0 flex-col">
        <div className="flex min-h-44 flex-1 flex-col rounded-xl border border-[var(--line)] bg-[var(--field)] px-5 py-4 transition-colors focus-within:border-[var(--gold)] focus-within:ring-3 focus-within:ring-[var(--gold-soft)] md:px-7 md:py-6">
          <label htmlFor="calculator-expression" className="text-[13px] text-[var(--muted)]">Berechnung</label>
          <input ref={input} id="calculator-expression" className="w-full border-0 bg-transparent px-0 py-1 text-right text-xl text-[var(--muted)] outline-none placeholder:text-[var(--muted)] focus-visible:outline-none" value={expression} maxLength={300} placeholder="0" autoComplete="off" spellCheck={false} onChange={(event) => {setExpression(event.target.value);setError("");}} onKeyDown={(event) => {if(event.key === "Enter"){event.preventDefault();evaluate();}if(event.key === "Escape"){setExpression("");setResult(undefined);setError("");}}}/>
          <output aria-live="polite" className="display mt-auto block min-h-10 break-words pt-4 text-right text-[clamp(2.5rem,6vw,4.25rem)] [overflow-wrap:anywhere]">{result === undefined ? "0" : new Intl.NumberFormat("de-CH",{maximumSignificantDigits:14}).format(result)}</output>
          {error && <p role="alert" className="mt-2 text-right text-sm text-[var(--coral)]">{error}</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><button className="action min-w-12 px-3" onClick={() => insert(String(result ?? 0))}>Ans</button><button className="action min-w-12 px-3" onClick={() => setMemory(0)}>MC</button><button className="action min-w-12 px-3" onClick={() => insert(String(memory))}>MR</button><button className="action min-w-12 px-3" onClick={() => setMemory((current) => current + (result ?? 0))}>M+</button><button className="action min-w-12 px-3" onClick={() => setMemory((current) => current - (result ?? 0))}>M−</button><span className="money self-center text-[13px] text-[var(--muted)]">M: {new Intl.NumberFormat("de-CH").format(memory)}</span></div>
        {scientific && <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">{["sin(","cos(","tan(","log10(","log(","abs(","pi","e","^2","^","!","exp(","asin(","acos(","atan(","round("].map((value) => <button key={value} className="action min-w-0 px-1 text-[13px]" onClick={() => insert(value)} title={value.includes("sin") || value.includes("cos") || value.includes("tan") ? "Winkel in Radiant" : value}>{value.replace("(","")}</button>)}</div>}
      </div>
      <div><div className="mb-2 flex gap-2"><button className="action flex-1" onClick={() => {setExpression("");setResult(undefined);setError("");}} aria-label="Berechnung löschen" title="Alles löschen"><RotateCcw size={17}/></button><button className="action flex-1" onClick={() => {setExpression((current) => current.slice(0,-1));setError("");}} aria-label="Letztes Zeichen löschen" title="Letztes Zeichen löschen"><Delete size={17}/></button></div><div className="grid grid-cols-4 gap-2">{keys.map((value) => <button key={value} className={`h-14 min-w-0 text-lg ${value === "=" ? "primary" : /[0-9.]/.test(value) ? "action" : "action text-[var(--muted)]"}`} onClick={() => value === "=" ? evaluate() : insert(value)} aria-label={value === "=" ? "Berechnen" : value === "sqrt(" ? "Quadratwurzel" : value}>{value === "=" ? <Equal size={20}/> : value === "sqrt(" ? "√" : value === "*" ? "×" : value === "/" ? "÷" : value === "-" ? "−" : value}</button>)}</div></div>
    </div>
  </section>;
}
