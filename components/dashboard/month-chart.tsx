import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

export function MonthChart({ data, subtitle, loading }: { data: MonthPoint[]; subtitle: string; loading: boolean }) {
  const empty = data.every((point) => series.every(({ key }) => point[key] === 0));
  return <Plate className="flex flex-col">
    <PlateHeading title="Einnahmen & Abzüge" subtitle={subtitle}/>
    {loading ? <Skeleton className="mt-6 h-[340px] w-full"/> : empty ? <EmptyState className="my-auto" icon={ChartColumn} title="Noch keine Bewegungen" text="In diesem Zeitraum gibt es weder Einnahmen noch Abzüge."/> : <>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[var(--muted)]">{series.map((item) => <li key={item.key} className="flex items-center gap-2"><Swatch {...item}/>{item.key}</li>)}</ul>
      <div className="mt-5 h-[300px] min-w-0 md:h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} barGap={2} barCategoryGap="26%" margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)"/>
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} minTickGap={6} tick={{ fill: "var(--muted)", fontSize: 13 }}/>
            <YAxis tickFormatter={axisAmount} tickLine={false} axisLine={false} width={58} tick={{ fill: "var(--muted)", fontSize: 13 }}/>
            <ReferenceLine y={0} stroke="var(--line)"/>
            <Tooltip cursor={{ stroke: "var(--hairline)", strokeWidth: 1 }} content={({ active, payload }) => active && payload?.length ? <ChartTooltip point={payload[0].payload as MonthPoint}/> : null}/>
            {series.map((item) => "line" in item
              ? <Line key={item.key} dataKey={item.key} stroke={item.color} strokeWidth={2} strokeLinecap="round" type="monotone" animationDuration={420} dot={{ r: 4, fill: item.color, stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 6, fill: item.color, stroke: "var(--surface)", strokeWidth: 2 }}/>
              : <Bar key={item.key} dataKey={item.key} fill={item.color} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={420}/>)}
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
  return <span aria-hidden className={line ? "h-0.5 w-4 rounded-full" : "h-2.5 w-2.5 rounded-[3px]"} style={{ background: color }}/>;
}

function ChartTooltip({ point }: { point: MonthPoint }) {
  return <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-sm shadow-[var(--shadow-overlay)]">
    <p className="font-semibold text-[var(--ink)]">{point.month}</p>
    <ul className="mt-2 space-y-1.5">{series.map((item) => <li key={item.key} className="flex items-center justify-between gap-6"><span className="flex items-center gap-2 text-[var(--muted)]"><Swatch {...item}/>{item.key}</span><span className="money font-semibold text-[var(--ink)]">{formatCurrency(point[item.key])}</span></li>)}</ul>
  </div>;
}
