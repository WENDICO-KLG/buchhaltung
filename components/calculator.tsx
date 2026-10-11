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
  return <section className="mt-6 border-b border-[var(--line)] pb-6" aria-label="Taschenrechner">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Taschenrechner</h2><label className="flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={scientific} onChange={(event) => setScientific(event.target.checked)}/>Wissenschaftlich</label></div>
    <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0"><label htmlFor="calculator-expression" className="mb-2 block text-xs text-[var(--muted)]">Berechnung</label><input ref={input} id="calculator-expression" className="field text-lg" value={expression} maxLength={300} placeholder="0" autoComplete="off" spellCheck={false} onChange={(event) => {setExpression(event.target.value);setError("");}} onKeyDown={(event) => {if(event.key === "Enter"){event.preventDefault();evaluate();}if(event.key === "Escape"){setExpression("");setResult(undefined);setError("");}}}/>
        <output aria-live="polite" className="mt-3 block min-h-10 break-words text-2xl font-semibold [overflow-wrap:anywhere]">{result === undefined ? "0" : new Intl.NumberFormat("de-CH",{maximumSignificantDigits:14}).format(result)}</output>
        {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2"><button className="action" onClick={() => insert(String(result ?? 0))}>Ans</button><button className="action" onClick={() => setMemory(0)}>MC</button><button className="action" onClick={() => insert(String(memory))}>MR</button><button className="action" onClick={() => setMemory((current) => current + (result ?? 0))}>M+</button><button className="action" onClick={() => setMemory((current) => current - (result ?? 0))}>M−</button><span className="self-center text-xs text-[var(--muted)]">M: {new Intl.NumberFormat("de-CH").format(memory)}</span></div>
        {scientific && <div className="mt-3 grid grid-cols-4 gap-2">{["sin(","cos(","tan(","log10(","log(","abs(","pi","e","^2","^","!","exp(","asin(","acos(","atan(","round("].map((value) => <button key={value} className="action min-w-0 px-1" onClick={() => insert(value)} title={value.includes("sin") || value.includes("cos") || value.includes("tan") ? "Winkel in Radiant" : value}>{value.replace("(","")}</button>)}</div>}
      </div>
      <div><div className="mb-2 flex gap-2"><button className="action flex-1" onClick={() => {setExpression("");setResult(undefined);setError("");}} aria-label="Berechnung löschen" title="Alles löschen"><RotateCcw size={17}/></button><button className="action flex-1" onClick={() => {setExpression((current) => current.slice(0,-1));setError("");}} aria-label="Letztes Zeichen löschen" title="Letztes Zeichen löschen"><Delete size={17}/></button></div><div className="grid grid-cols-4 gap-2">{keys.map((value) => <button key={value} className={`h-11 min-w-0 ${value === "=" ? "primary" : "action"}`} onClick={() => value === "=" ? evaluate() : insert(value)} aria-label={value === "=" ? "Berechnen" : value === "sqrt(" ? "Quadratwurzel" : value}>{value === "=" ? <Equal size={18}/> : value === "sqrt(" ? "√" : value === "*" ? "×" : value === "/" ? "÷" : value}</button>)}</div></div>
    </div>
  </section>;
}