import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RangeMode } from "./shared";
import styles from "./dashboard.module.css";

type Props = {
  mode: RangeMode; onMode: (mode: RangeMode) => void;
  month: string; onMonth: (month: string) => void;
  year: number;
  from: string; onFrom: (date: string) => void;
  to: string; onTo: (date: string) => void;
  onShift: (offset: number) => void;
  onToday?: () => void;
};

export function PeriodControls({ mode, onMode, month, onMonth, year, from, onFrom, to, onTo, onShift, onToday }: Props) {
  return <>
    <div className="pill-track w-full sm:w-auto" role="tablist" aria-label="Zeitraum">
      {(["month", "year", "custom"] as const).map((item) => <button key={item} role="tab" aria-selected={mode === item} onClick={() => onMode(item)} className={`flex-1 ${mode === item ? "filter-active" : "filter"}`}>{item === "month" ? "Monat" : item === "year" ? "Jahr" : "Zeitraum"}</button>)}
    </div>
    {mode !== "custom" ? <div className="pill-track flex-1 justify-between sm:flex-none">
      <button onClick={() => onShift(-1)} aria-label="Vorheriger Zeitraum" className="icon-button"><ChevronLeft size={17} strokeWidth={1.6}/></button>
      {mode === "month"
        ? <input type="month" value={month} onChange={(event) => event.target.value && onMonth(event.target.value)} aria-label="Monat" className={`money ${styles.month}`}/>
        : <span className="money min-w-16 text-center text-sm font-medium text-[var(--ink)]">{year}</span>}
      <button onClick={() => onShift(1)} aria-label="Nächster Zeitraum" className="icon-button"><ChevronRight size={17} strokeWidth={1.6}/></button>
    </div> : <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:w-auto">
      <input type="date" value={from} onChange={(event) => onFrom(event.target.value)} aria-label="Von" className="field min-w-0 !rounded-full !px-3 sm:w-auto"/>
      <span className="text-sm text-[var(--muted)]">bis</span>
      <input type="date" value={to} onChange={(event) => onTo(event.target.value)} aria-label="Bis" className="field min-w-0 !rounded-full !px-3 sm:w-auto"/>
    </div>}
    {onToday && <button onClick={onToday} className="action">Heute</button>}
  </>;
}
