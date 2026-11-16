import { Bar, BarChart, CartesianGrid, Cell as RCell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Target, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { Cell, Column, Widget } from '@/lib/types';
import { computeKpi, computeSeries, formatValue } from '@/lib/data';
import { Card } from './ui';

// Paleta categórica validada (orden fijo; nunca se recicla).
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

const axis = { fontSize: 12, fill: 'rgb(var(--muted))' };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "2026-07" → "jul 26" */
const tickLabel = (v: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(v));
  return m ? `${MONTHS[+m[2] - 1]} ${m[1].slice(2)}` : String(v);
};

function Tip({ active, payload, label, format }: { active?: boolean; payload?: { value: number; payload: { name: string } }[]; label?: string; format: Widget['format'] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <div className="text-muted">{tickLabel(label ?? payload[0].payload.name)}</div>
      <div className="font-semibold tabular-nums">{formatValue(payload[0].value, format)}</div>
    </div>
  );
}

export function WidgetView({ w, columns, rows, onRemove }: { w: Widget; columns: Column[]; rows: Cell[][]; onRemove?: () => void }) {
  const Remove = onRemove ? (
    <button aria-label="Quitar" onClick={onRemove} className="absolute right-2 top-2 rounded-lg p-1 text-muted opacity-0 hover:bg-ink/5 group-hover:opacity-100"><X className="h-4 w-4" /></button>
  ) : null;

  if (w.type === 'kpi') {
    const v = computeKpi(columns, rows, w);
    const pct = w.target ? v / w.target : null;
    return (
      <Card className="group relative">
        {Remove}
        <p className="pr-6 text-sm text-muted">{w.title}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{formatValue(v, w.format)}</p>
        {pct !== null && (
          <div className="mt-1 text-sm">
            <span className={`inline-flex items-center gap-1 font-semibold ${pct >= 1 ? 'text-ok' : 'text-bad'}`}>
              {pct >= 1 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{(pct * 100).toFixed(0)}% de la meta
            </span>
            <span className="flex items-center gap-1 text-xs text-muted"><Target className="h-3 w-3" />Meta {formatValue(w.target!, w.format)}</span>
          </div>
        )}
      </Card>
    );
  }

  const data = computeSeries(columns, rows, w, w.type === 'pie' ? 6 : 12);
  return (
    <Card className="group relative md:col-span-2">
      {Remove}
      <p className="mb-3 pr-6 font-semibold">{w.title}</p>
      {!data.length ? <p className="text-sm text-muted">Sin datos para esta gráfica.</p> : w.type === 'table' ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <tbody>{data.map((d) => <tr key={d.name} className="border-b border-line last:border-0"><td className="py-1.5">{d.name}</td><td className="py-1.5 text-right tabular-nums">{formatValue(d.value, w.format)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {w.type === 'line' ? (
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} tickFormatter={tickLabel} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatValue(v, w.format === 'currency' ? 'number' : w.format)} />
                <Tooltip content={<Tip format={w.format} />} cursor={{ stroke: 'rgb(var(--muted))', strokeDasharray: 3 }} />
                <Line type="monotone" dataKey="value" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: 'rgb(var(--surface))' }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : w.type === 'pie' ? (
              <PieChart>
                <Tooltip content={<Tip format={w.format} />} />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1} stroke="rgb(var(--surface))" strokeWidth={2}>
                  {data.map((d, i) => <RCell key={d.name} fill={SERIES[i % SERIES.length]} />)}
                </Pie>
              </PieChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 60 : 30} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatValue(v, w.format === 'currency' ? 'number' : w.format)} />
                <Tooltip content={<Tip format={w.format} />} cursor={{ fill: 'rgb(var(--ink) / .05)' }} />
                <Bar dataKey="value" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {w.type === 'pie' && data.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {data.map((d, i) => <span key={d.name} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />{d.name}</span>)}
        </div>
      )}
      {w.why && <p className="mt-2 text-xs text-muted">{w.why}</p>}
    </Card>
  );
}
