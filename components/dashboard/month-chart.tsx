import { Bar, Cell, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartColumn } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { axisAmount, Plate, PlateHeading, wholeAmount } from "./shared";

const series = [
  { key: "Einnahmen", color: "var(--chart-1)" },
  { key: "Ausgaben", color: "var(--chart-2)" },
  { key: "Provisionen", color: "var(--chart-3)" },
  { key: "Netto Gewinn", color: "var(--ink)", line: true },
] as const;
export type MonthPoint = { month: string } & Record<typeof series[number]["key"], number>;

export function MonthChart({ data, subtitle, highlightLast, loading }: { data: MonthPoint[]; subtitle: string; highlightLast: boolean; loading: boolean }) {
  const empty = data.every((point) => series.every(({ key }) => point[key] === 0));
  return <Plate className="flex flex-col">
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4"><PlateHeading title="Einnahmen & Abzüge" subtitle={subtitle}/>
      {!loading && !empty && <ul className="flex flex-wrap gap-x-5 gap-y-1.5 pt-0.5 text-[13px] text-[var(--muted)]">{series.map((item) => <li key={item.key} className="flex items-center gap-2"><Swatch color={item.color} line={"line" in item}/>{item.key}</li>)}</ul>}</div>
    {loading ? <Skeleton className="mt-6 h-[280px] w-full"/> : empty ? <EmptyState className="my-auto" icon={ChartColumn} title="Noch keine Bewegungen" text="In diesem Zeitraum gibt es weder Einnahmen noch Abzüge."/> : <>
      <div className="mt-6 h-[260px] min-w-0 flex-auto">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} barGap={3} barCategoryGap="26%" margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)"/>
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} minTickGap={6} tick={{ fontSize: 12 }}/>
            <YAxis tickFormatter={axisAmount} tickLine={false} axisLine={false} width={54} tickCount={4} tick={{ fontSize: 12 }}/>
            <ReferenceLine y={0} stroke="var(--line)"/>
            <Tooltip cursor={{ stroke: "var(--hairline)", strokeWidth: 1 }} content={({ active, payload }) => active && payload?.length ? <ChartTooltip point={payload[0].payload as MonthPoint}/> : null}/>
            {series.map((item) => "line" in item
              ? <Line key={item.key} dataKey={item.key} stroke={item.color} strokeWidth={1.5} strokeLinecap="round" type="monotone" animationDuration={420} dot={{ r: 3.5, fill: item.color, stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 5, fill: item.color, stroke: "var(--surface)", strokeWidth: 2 }}/>
              : <Bar key={item.key} dataKey={item.key} fill={item.color} radius={[5, 5, 0, 0]} maxBarSize={10} animationDuration={420}>{data.map((point, index) => <Cell key={index} fillOpacity={item.key === "Einnahmen" && highlightLast && index < data.length - 1 ? .62 : 1}/>)}</Bar>)}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 border-t border-[var(--line)] pt-1">
        <summary className="flex min-h-11 w-fit cursor-pointer items-center text-sm text-[var(--muted)] hover:text-[var(--ink)]">Werte als Tabelle (CHF)</summary>
        <div className="overflow-x-auto"><table className="w-full min-w-[19rem] text-right text-[13px]">
          <thead><tr className="text-[12px] text-[var(--muted)]"><th scope="col" className="py-2 pr-2 text-left font-medium">Monat</th>{series.map(({ key }) => <th scope="col" key={key} className="py-2 pl-2 font-medium">{key}</th>)}</tr></thead>
          <tbody>{data.map((point, index) => <tr key={index} className="border-t border-[var(--line)]"><th scope="row" className="py-2 pr-2 text-left font-medium text-[var(--ink)]">{point.month}</th>{series.map(({ key }) => <td key={key} className="py-2 pl-2 text-[var(--ink)]">{wholeAmount(point[key])}</td>)}</tr>)}</tbody>
        </table></div>
      </details>
    </>}
  </Plate>;
}

function Swatch({ color, line }: { color: string; line?: boolean }) {
  return <span aria-hidden className={line ? "h-[1.5px] w-4 rounded-full" : "h-2 w-2 rounded-full"} style={{ background: color }}/>;
}

function ChartTooltip({ point }: { point: MonthPoint }) {
  return <div className="overlay !rounded-[1.375rem] px-4 py-3 text-sm">
    <p className="font-semibold text-[var(--ink)]">{point.month}</p>
    <ul className="mt-2 space-y-1.5">{series.map((item) => <li key={item.key} className="flex items-center justify-between gap-6"><span className="flex items-center gap-2 text-[var(--muted)]"><Swatch color={item.color} line={"line" in item}/>{item.key}</span><span className="money font-semibold text-[var(--ink)]">{formatCurrency(point[item.key])}</span></li>)}</ul>
  </div>;
}
