import { useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, MessageSquare, Plus, RefreshCw, Sparkles, Table2, Trash2, Wand2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { postAi } from '@/lib/api';
import { SAMPLE_CSV, autoWidgets, computeSeries, fromMatrix, parseCsv, profile, readTableFile, type Table } from '@/lib/data';
import { download, fmt, nowIso, uid } from '@/lib/util';
import { navigate } from '@/lib/router';
import type { Dashboard, Widget } from '@/lib/types';
import { AreaBadge, AreaSelect, Bullets, Button, Card, Chip, Empty, Field, Input, Modal, PageHeader, SectionTitle, Select, Textarea, useToast } from '@/components/ui';
import { WidgetView } from '@/components/WidgetView';

const IDEAS = [
  'Ventas vs meta por sucursal y tendencia mensual',
  'Inventario: rotación, días de inventario y faltantes',
  'Nivel de servicio: entregas a tiempo y completas',
  'Gastos vs presupuesto por área',
  'Cobranza: cartera vencida por cliente',
];

type AiDash = { title: string; widgets: Omit<Widget, 'id'>[]; insights: string[] };

export function DashboardsPage() {
  const { state } = useStore();
  const [importing, setImporting] = useState(false);
  return (
    <div>
      <PageHeader title="Indicadores" subtitle="Sube un Excel y la IA arma tu dashboard en segundos. Tus datos se quedan en tu dispositivo."
        actions={<Button onClick={() => setImporting(true)}><Plus className="h-4 w-4" />Nuevo dashboard</Button>} />
      {!state.dashboards.length ? (
        <Empty icon={<BarChart3 className="h-8 w-8" />} title="Crea tu primer dashboard"
          text="Sube un Excel (.xlsx) o CSV exportado de SAP, BI o tu equipo. La IA propone los KPIs y gráficas; tú los ajustas."
          action={<Button onClick={() => setImporting(true)}><FileSpreadsheet className="h-4 w-4" />Subir Excel</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.dashboards.map((d) => (
            <Card key={d.id} className="cursor-pointer hover:border-brand/40" onClick={() => navigate(`indicadores/${d.id}`)}>
              <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand" /><p className="truncate font-semibold">{d.name}</p></div>
              <p className="mt-1 text-sm text-muted">{d.rows.length.toLocaleString('es-MX')} filas · {d.widgets.length} indicadores · {fmt(d.updatedAt, 'd MMM')}</p>
              <div className="mt-2"><AreaBadge id={d.areaId} /></div>
            </Card>
          ))}
        </div>
      )}
      {importing && <ImportWizard onClose={() => setImporting(false)} />}
    </div>
  );
}

function ImportWizard({ onClose, replace }: { onClose: () => void; replace?: Dashboard }) {
  const { upsert } = useStore();
  const toast = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [idx, setIdx] = useState(0);
  const [goal, setGoal] = useState('');
  const [areaId, setAreaId] = useState<string | null>(replace?.areaId ?? null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const t = tables[idx];

  const load = async (f: File) => {
    setBusy(true);
    try {
      const ts = await readTableFile(f);
      if (!ts.length) throw new Error('No encontré datos en el archivo');
      setTables(ts);
      setIdx(0);
    } catch (e) { toast(`No se pudo leer: ${(e as Error).message}`, 'bad'); }
    setBusy(false);
  };

  const create = async (useAi: boolean) => {
    if (!t) return;
    if (replace) {
      upsert('dashboards', { ...replace, columns: t.columns, rows: t.rows, datasetName: t.name, updatedAt: nowIso() });
      toast('Datos actualizados', 'ok');
      onClose();
      return;
    }
    setBusy(true);
    let spec: AiDash = { title: t.name, widgets: autoWidgets(t.columns), insights: [] };
    if (useAi) {
      try {
        spec = await postAi<AiDash>('dashboard', { goal, datasetName: t.name, rowCount: t.rows.length, columns: profile(t.columns, t.rows) });
        if (!spec.widgets.length) spec.widgets = autoWidgets(t.columns);
      } catch (e) { toast(`${(e as Error).message} Usé un diseño automático.`, 'bad'); }
    }
    const d: Dashboard = {
      id: uid(), name: spec.title || t.name, areaId, datasetName: t.name, columns: t.columns, rows: t.rows,
      widgets: spec.widgets.map((w) => ({ ...w, id: uid() })), insights: spec.insights, createdAt: nowIso(), updatedAt: nowIso(),
    };
    upsert('dashboards', d);
    setBusy(false);
    onClose();
    navigate(`indicadores/${d.id}`);
  };

  return (
    <Modal open onClose={onClose} title={replace ? 'Actualizar datos' : 'Nuevo dashboard'} wide
      footer={t ? (replace ? <Button onClick={() => create(false)}>Reemplazar datos</Button> : <>
        <Button variant="outline" onClick={() => create(false)} disabled={busy}>Automático</Button>
        <Button onClick={() => create(true)} loading={busy}><Sparkles className="h-4 w-4" />Crear con IA</Button>
      </>) : undefined}>
      {!t ? (
        <div className="space-y-3">
          <button onClick={() => file.current?.click()} className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-10 hover:border-brand">
            <FileSpreadsheet className="mb-2 h-10 w-10 text-brand" />
            <span className="font-semibold">Elegir archivo Excel o CSV</span>
            <span className="text-sm text-muted">.xlsx · .csv — desde Archivos, OneDrive o correo</span>
          </button>
          <input ref={file} type="file" hidden accept=".xlsx,.xlsm,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
          {!replace && <Button variant="ghost" className="w-full" onClick={() => setTables([fromMatrix('Ventas de ejemplo', parseCsv(SAMPLE_CSV))])}>Probar con datos de ejemplo</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {tables.length > 1 && (
            <Field label="Hoja"><Select value={idx} onChange={(e) => setIdx(Number(e.target.value))}>{tables.map((x, i) => <option key={i} value={i}>{x.name} ({x.rows.length} filas)</option>)}</Select></Field>
          )}
          <div className="overflow-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-ink/[.03]"><tr>{t.columns.map((c) => <th key={c.name} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{c.name}<span className="ml-1 text-xs font-normal text-muted">{c.type === 'number' ? '123' : c.type === 'date' ? 'fecha' : 'abc'}</span></th>)}</tr></thead>
              <tbody>{t.rows.slice(0, 6).map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="whitespace-nowrap px-3 py-1.5">{c ?? ''}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs text-muted">{t.rows.length.toLocaleString('es-MX')} filas. A la IA solo se envían nombres de columnas, tipos y estadísticas resumidas, no la tabla completa.</p>
          {!replace && <>
            <Field label="¿Qué quieres ver? (opcional)"><Textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="p. ej. cumplimiento de meta por sucursal y qué línea está cayendo" /></Field>
            <div className="flex flex-wrap gap-2">{IDEAS.map((x) => <Chip key={x} onClick={() => setGoal(x)}>{x}</Chip>)}</div>
            <Field label="Área / Dirección"><AreaSelect value={areaId} onChange={setAreaId} /></Field>
          </>}
        </div>
      )}
    </Modal>
  );
}

export function DashboardDetail({ id }: { id: string }) {
  const { state, patch, remove } = useStore();
  const toast = useToast();
  const d = state.dashboards.find((x) => x.id === id);
  const [adding, setAdding] = useState(false);
  const [reload, setReload] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ answer: string; followUps: string[] } | null>(null);
  const [asking, setAsking] = useState(false);
  const [redesigning, setRedesigning] = useState(false);

  const rows = useMemo(() => {
    if (!d?.filter) return d?.rows ?? [];
    const i = d.columns.findIndex((c) => c.name === d.filter!.column);
    return d.rows.filter((r) => String(r[i] ?? '') === d.filter!.value);
  }, [d]);

  if (!d) return <Empty icon={<BarChart3 className="h-8 w-8" />} title="Dashboard no encontrado" action={<Button onClick={() => navigate('indicadores')}>Volver</Button>} />;
  const textCols = d.columns.filter((c) => c.type === 'text');
  const filterCol = d.filter?.column ?? textCols[0]?.name;
  const filterValues = filterCol ? [...new Set(d.rows.map((r) => r[d.columns.findIndex((c) => c.name === filterCol)]).filter((v) => v != null).map(String))].slice(0, 40) : [];
  const kpis = d.widgets.filter((w) => w.type === 'kpi');
  const charts = d.widgets.filter((w) => w.type !== 'kpi');

  const ask = async (q = question) => {
    if (!q.trim()) return;
    setAsking(true);
    try {
      // Se calculan agregados en el dispositivo: por cada texto/fecha × cada número.
      const aggregates: Record<string, unknown> = {};
      const nums = d.columns.filter((c) => c.type === 'number');
      for (const g of d.columns.filter((c) => c.type !== 'number').slice(0, 5)) {
        for (const n of nums.slice(0, 5)) {
          aggregates[`suma de ${n.name} por ${g.name}`] = computeSeries(d.columns, rows, { id: '', type: g.type === 'date' ? 'line' : 'bar', title: '', metric: n.name, agg: 'sum', groupBy: g.name, format: 'number', target: null }, 15);
        }
      }
      const sample = rows.length <= 300 ? rows : rows.filter((_, i) => i % Math.ceil(rows.length / 300) === 0);
      const r = await postAi<{ answer: string; followUps: string[] }>('ask-data', {
        question: q, datasetName: d.datasetName, rowCount: rows.length, columns: profile(d.columns, rows), aggregates,
        rows: sample.map((r) => Object.fromEntries(d.columns.map((c, i) => [c.name, r[i]]))),
      });
      setAnswer(r);
    } catch (e) { toast((e as Error).message, 'bad'); }
    setAsking(false);
  };

  const redesign = async () => {
    setRedesigning(true);
    try {
      const spec = await postAi<AiDash>('dashboard', { goal: question, datasetName: d.datasetName, rowCount: d.rows.length, columns: profile(d.columns, d.rows) });
      patch('dashboards', d.id, { widgets: spec.widgets.map((w) => ({ ...w, id: uid() })), insights: spec.insights, updatedAt: nowIso() });
      toast('Dashboard rediseñado', 'ok');
    } catch (e) { toast((e as Error).message, 'bad'); }
    setRedesigning(false);
  };

  const exportCsv = () => {
    const esc = (v: unknown) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    download(`${d.name}.csv`, [d.columns.map((c) => esc(c.name)).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n'), 'text/csv');
  };

  return (
    <div>
      <button onClick={() => navigate('indicadores')} className="mb-2 text-sm text-brand">← Indicadores</button>
      <PageHeader
        title={d.name}
        subtitle={<>{d.datasetName} · {d.rows.length.toLocaleString('es-MX')} filas · actualizado {fmt(d.updatedAt, "d MMM HH:mm")}</>}
        actions={<>
          <Button variant="outline" onClick={() => setReload(true)}><RefreshCw className="h-4 w-4" />Actualizar Excel</Button>
          <Button variant="outline" onClick={redesign} loading={redesigning}><Wand2 className="h-4 w-4" />Rediseñar con IA</Button>
          <Button variant="outline" size="icon" aria-label="Exportar CSV" onClick={exportCsv}><Download className="h-4 w-4" /></Button>
          <Button variant="danger" size="icon" aria-label="Eliminar" onClick={() => { if (confirm('¿Eliminar dashboard?')) { remove('dashboards', d.id); navigate('indicadores'); } }}><Trash2 className="h-4 w-4" /></Button>
        </>}
      />

      {textCols.length > 0 && (
        <div className="-mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4">
          <Select className="!h-8 !w-auto shrink-0 rounded-full text-sm" value={filterCol} onChange={(e) => patch('dashboards', d.id, { filter: { column: e.target.value, value: '' } })}>
            {textCols.map((c) => <option key={c.name}>{c.name}</option>)}
          </Select>
          <Chip active={!d.filter?.value} onClick={() => patch('dashboards', d.id, { filter: null })}>Todos</Chip>
          {filterValues.map((v) => <Chip key={v} active={d.filter?.value === v} onClick={() => patch('dashboards', d.id, { filter: { column: filterCol!, value: v } })}>{v}</Chip>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((w) => <WidgetView key={w.id} w={w} columns={d.columns} rows={rows} onRemove={() => patch('dashboards', d.id, { widgets: d.widgets.filter((x) => x.id !== w.id) })} />)}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        {charts.map((w) => <WidgetView key={w.id} w={w} columns={d.columns} rows={rows} onRemove={() => patch('dashboards', d.id, { widgets: d.widgets.filter((x) => x.id !== w.id) })} />)}
      </div>
      <Button variant="ghost" className="mt-3" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Agregar indicador</Button>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-brand" /><h3 className="font-semibold">Pregúntale a tus datos</h3></div>
          <div className="flex gap-2">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="¿Qué sucursal está más lejos de su meta?" />
            <Button onClick={() => ask()} loading={asking}><Sparkles className="h-4 w-4" /></Button>
          </div>
          {answer && (
            <div className="mt-3 space-y-2">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{answer.answer}</p>
              <div className="flex flex-wrap gap-2">{answer.followUps.map((f) => <Chip key={f} onClick={() => { setQuestion(f); void ask(f); }}>{f}</Chip>)}</div>
            </div>
          )}
        </Card>
        {d.insights.length > 0 && (
          <Card><h3 className="mb-2 font-semibold">Hallazgos de la IA</h3><Bullets items={d.insights} /></Card>
        )}
      </div>

      <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => setShowTable(!showTable)}><Table2 className="h-4 w-4" />{showTable ? 'Ocultar' : 'Ver tabla'}</Button>}>Datos</SectionTitle>
      {showTable && (
        <div className="max-h-[28rem] overflow-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface"><tr>{d.columns.map((c) => <th key={c.name} className="whitespace-nowrap border-b border-line px-3 py-2 text-left">{c.name}</th>)}</tr></thead>
            <tbody>{rows.slice(0, 500).map((r, i) => <tr key={i} className="border-b border-line/60">{r.map((c, j) => <td key={j} className={`whitespace-nowrap px-3 py-1.5 ${typeof c === 'number' ? 'text-right tabular-nums' : ''}`}>{typeof c === 'number' ? c.toLocaleString('es-MX') : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}

      {adding && <WidgetBuilder d={d} onClose={() => setAdding(false)} onAdd={(w) => patch('dashboards', d.id, { widgets: [...d.widgets, w], updatedAt: nowIso() })} />}
      {reload && <ImportWizard replace={d} onClose={() => setReload(false)} />}
    </div>
  );
}

function WidgetBuilder({ d, onClose, onAdd }: { d: Dashboard; onClose: () => void; onAdd: (w: Widget) => void }) {
  const nums = d.columns.filter((c) => c.type === 'number');
  const groups = d.columns.filter((c) => c.type !== 'number');
  const [w, setW] = useState<Widget>({ id: uid(), type: 'kpi', title: '', metric: nums[0]?.name ?? null, agg: 'sum', groupBy: groups[0]?.name ?? null, format: 'number', target: null });
  const set = (p: Partial<Widget>) => setW((s) => ({ ...s, ...p }));
  const title = w.title || `${w.agg === 'count' ? 'Conteo' : `${{ sum: 'Total', avg: 'Promedio', min: 'Mínimo', max: 'Máximo', count: '' }[w.agg]} ${w.metric ?? ''}`}${w.type !== 'kpi' && w.groupBy ? ` por ${w.groupBy}` : ''}`;
  return (
    <Modal open onClose={onClose} title="Nuevo indicador" footer={<Button onClick={() => { onAdd({ ...w, title, groupBy: w.type === 'kpi' ? null : w.groupBy }); onClose(); }}>Agregar</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo"><Select value={w.type} onChange={(e) => set({ type: e.target.value as Widget['type'] })}>
          <option value="kpi">Número (KPI)</option><option value="bar">Barras</option><option value="line">Tendencia</option><option value="pie">Dona</option><option value="table">Tabla</option>
        </Select></Field>
        <Field label="Cálculo"><Select value={w.agg} onChange={(e) => set({ agg: e.target.value as Widget['agg'] })}>
          <option value="sum">Suma</option><option value="avg">Promedio</option><option value="count">Conteo</option><option value="min">Mínimo</option><option value="max">Máximo</option>
        </Select></Field>
        <Field label="Métrica"><Select value={w.metric ?? ''} onChange={(e) => set({ metric: e.target.value || null })}>{nums.map((c) => <option key={c.name}>{c.name}</option>)}</Select></Field>
        {w.type !== 'kpi' && <Field label="Agrupar por"><Select value={w.groupBy ?? ''} onChange={(e) => set({ groupBy: e.target.value })}>{groups.map((c) => <option key={c.name}>{c.name}</option>)}</Select></Field>}
        <Field label="Formato"><Select value={w.format} onChange={(e) => set({ format: e.target.value as Widget['format'] })}>
          <option value="number">Número</option><option value="currency">Pesos (MXN)</option><option value="percent">Porcentaje</option>
        </Select></Field>
        {w.type === 'kpi' && <Field label="Meta (opcional)"><Input type="number" inputMode="decimal" value={w.target ?? ''} onChange={(e) => set({ target: e.target.value ? Number(e.target.value) : null })} /></Field>}
        <div className="col-span-2"><Field label="Título"><Input placeholder={title} value={w.title} onChange={(e) => set({ title: e.target.value })} /></Field></div>
      </div>
    </Modal>
  );
}
