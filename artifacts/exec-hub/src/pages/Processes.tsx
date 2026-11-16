import { useState } from 'react';
import { Plus, Sparkles, Trash2, Workflow, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { postAi } from '@/lib/api';
import { fmt, nowIso, uid } from '@/lib/util';
import type { Automation, AutomationTrigger, ProcessDoc } from '@/lib/types';
import { AreaBadge, AreaSelect, Bullets, Button, Card, Empty, Field, Input, Modal, PageHeader, SectionTitle, Select, Textarea, useToast } from '@/components/ui';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TRIGGER: Record<AutomationTrigger, string> = {
  daily: 'Diario (lun-sáb)', weekly: 'Semanal', monthly: 'Mensual', after_meeting: 'Al generar una minuta', task_overdue: 'Pendientes vencidos',
};

export function describe(a: Automation) {
  const t = a.time ? ` a las ${a.time}` : '';
  if (a.trigger === 'weekly') return `Cada ${DAYS[a.day ?? 1].toLowerCase()}${t}`;
  if (a.trigger === 'monthly') return `Día ${a.day ?? 1} de cada mes${t}`;
  if (a.trigger === 'daily') return `Todos los días${t}`;
  if (a.trigger === 'task_overdue') return `Revisión diaria${t}`;
  return TRIGGER[a.trigger];
}

interface AiProcess {
  name: string; objective: string;
  steps: ProcessDoc['steps']; kpis: ProcessDoc['kpis']; quickWins: string[];
  automations: { trigger: AutomationTrigger; day: number | null; time: string | null; action: string }[];
}

export function ProcessesPage() {
  const { state, patch, remove, upsert, setState } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<Automation | null>(null);
  const [desc, setDesc] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<AiProcess | null>(null);

  const design = async () => {
    setBusy(true);
    try { setDraft(await postAi<AiProcess>('process', { description: desc, areas: state.areas.map((a) => a.name) })); }
    catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(false);
  };

  const adopt = () => {
    if (!draft) return;
    const doc: ProcessDoc = { id: uid(), name: draft.name, objective: draft.objective, steps: draft.steps, kpis: draft.kpis, quickWins: draft.quickWins, areaId, createdAt: nowIso() };
    const autos: Automation[] = draft.automations
      .filter((a) => a.trigger !== 'after_meeting' && a.trigger !== 'task_overdue')
      .map((a) => ({ id: uid(), name: `${draft.name}: ${a.action}`.slice(0, 120), enabled: true, trigger: a.trigger, day: a.day, time: a.time ?? '09:00', action: 'create_task', text: a.action, areaId }));
    setState((s) => ({ ...s, processes: [doc, ...s.processes], automations: [...s.automations, ...autos] }));
    toast(`Proceso documentado y ${autos.length} automatizaciones activadas`, 'ok');
    setDraft(null);
    setDesc('');
  };

  return (
    <div>
      <PageHeader title="Procesos y automatización" subtitle="Describe un proceso y la IA lo documenta, define indicadores y programa recordatorios automáticos."
        actions={<Button variant="outline" onClick={() => setEditing({ id: uid(), name: '', enabled: true, trigger: 'weekly', day: 1, time: '09:00', action: 'create_task', text: '' })}><Plus className="h-4 w-4" />Automatización</Button>} />

      <Card className="mb-6">
        <div className="mb-2 flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand" /><h2 className="font-semibold">Automatiza un proceso con IA</h2></div>
        <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder="p. ej. Cada mes Finanzas me manda el estado de resultados, lo reviso con los directores de área, se acuerdan acciones y doy seguimiento quincenal…" />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1"><Field label="Área"><AreaSelect value={areaId} onChange={setAreaId} /></Field></div>
          <Button onClick={design} loading={busy} disabled={desc.trim().length < 10}><Sparkles className="h-4 w-4" />Diseñar proceso</Button>
        </div>
      </Card>

      <SectionTitle>Automatizaciones activas</SectionTitle>
      <Card className="divide-y divide-line p-0">
        {state.automations.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3">
            <Zap className={`h-5 w-5 shrink-0 ${a.enabled ? 'text-brand' : 'text-muted'}`} />
            <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(a)}>
              <p className="truncate font-medium">{a.name}</p>
              <p className="text-xs text-muted">{describe(a)}{a.lastRun ? ` · última vez ${fmt(a.lastRun, 'd MMM HH:mm')}` : ''}</p>
            </button>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={a.enabled} onChange={(e) => patch('automations', a.id, { enabled: e.target.checked })} />
              <span className="h-7 w-12 rounded-full bg-ink/15 transition peer-checked:bg-ok" />
              <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </label>
          </div>
        ))}
      </Card>
      <p className="mt-2 text-xs text-muted">Se ejecutan mientras la app está abierta o al abrirla. Para avisos con la app cerrada, exporta el recordatorio al Calendario desde cada pendiente o crea la reunión en Outlook.</p>

      <SectionTitle>Procesos documentados</SectionTitle>
      {!state.processes.length ? (
        <Empty icon={<Workflow className="h-8 w-8" />} title="Sin procesos" text="Describe arriba un proceso recurrente (comités, reportes, cierres) y conviértelo en un flujo con responsables, SLA e indicadores." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {state.processes.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted">{p.objective}</p></div>
                <button onClick={() => confirm('¿Eliminar proceso?') && remove('processes', p.id)} className="text-muted"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-1"><AreaBadge id={p.areaId} /></div>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{p.steps.map((s, i) => <li key={i}>{s.step}<span className="text-muted">{s.owner ? ` — ${s.owner}` : ''}{s.sla ? ` · ${s.sla}` : ''}</span></li>)}</ol>
              {p.kpis.length > 0 && <><p className="mt-3 text-xs font-semibold uppercase text-muted">Indicadores</p><ul className="text-sm">{p.kpis.map((k) => <li key={k.name}><b>{k.name}</b>: {k.formula}{k.target ? ` (meta ${k.target})` : ''}</li>)}</ul></>}
            </Card>
          ))}
        </div>
      )}

      {draft && (
        <Modal open wide onClose={() => setDraft(null)} title={draft.name} footer={<Button onClick={adopt}>Guardar y activar automatizaciones</Button>}>
          <p className="mb-3 text-muted">{draft.objective}</p>
          <h4 className="mb-1 font-semibold">Pasos</h4>
          <ol className="mb-4 list-decimal space-y-1 pl-5">{draft.steps.map((s, i) => <li key={i}>{s.step}<span className="text-sm text-muted">{s.owner ? ` — ${s.owner}` : ''}{s.sla ? ` · SLA ${s.sla}` : ''}</span></li>)}</ol>
          <h4 className="mb-1 font-semibold">Automatizaciones propuestas</h4>
          <ul className="mb-4 space-y-1 text-sm">{draft.automations.map((a, i) => <li key={i} className="rounded-lg bg-ink/[.04] px-3 py-2">⚡ {a.action}<span className="text-muted"> — {describe({ id: '', name: '', enabled: true, trigger: a.trigger, day: a.day, time: a.time, action: 'create_task' })}</span></li>)}</ul>
          <h4 className="mb-1 font-semibold">Indicadores</h4>
          <ul className="mb-4 text-sm">{draft.kpis.map((k) => <li key={k.name}><b>{k.name}</b>: {k.formula}{k.target ? ` (meta ${k.target})` : ''}</li>)}</ul>
          <h4 className="mb-1 font-semibold">Quick wins</h4>
          <Bullets items={draft.quickWins} />
        </Modal>
      )}
      {editing && <AutomationEditor a={editing} onClose={() => setEditing(null)} onSave={(a) => upsert('automations', a)} onDelete={editing.builtin ? undefined : () => remove('automations', editing.id)} />}
    </div>
  );
}

function AutomationEditor({ a, onClose, onSave, onDelete }: { a: Automation; onClose: () => void; onSave: (a: Automation) => void; onDelete?: () => void }) {
  const [x, setX] = useState(a);
  const set = (p: Partial<Automation>) => setX((s) => ({ ...s, ...p }));
  const editableTrigger = !a.builtin;
  return (
    <Modal open onClose={onClose} title={a.name ? 'Automatización' : 'Nueva automatización'}
      footer={<>{onDelete && <Button variant="danger" onClick={() => { onDelete(); onClose(); }}><Trash2 className="h-4 w-4" />Eliminar</Button>}<div className="flex-1" />
        <Button onClick={() => { onSave({ ...x, name: x.name || x.text || 'Automatización' }); onClose(); }}>Guardar</Button></>}>
      <div className="space-y-3">
        <Field label="Nombre"><Input value={x.name} onChange={(e) => set({ name: e.target.value })} placeholder="Revisión de cartera" /></Field>
        {editableTrigger && <Field label="Pendiente a crear / aviso"><Textarea rows={2} value={x.text ?? ''} onChange={(e) => set({ text: e.target.value })} placeholder="Pedir reporte de cobranza a Finanzas" /></Field>}
        <div className="grid grid-cols-2 gap-3">
          {editableTrigger && (
            <Field label="Frecuencia"><Select value={x.trigger} onChange={(e) => set({ trigger: e.target.value as AutomationTrigger })}>
              <option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option>
            </Select></Field>
          )}
          {x.trigger === 'weekly' && <Field label="Día"><Select value={x.day ?? 1} onChange={(e) => set({ day: Number(e.target.value) })}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</Select></Field>}
          {x.trigger === 'monthly' && <Field label="Día del mes"><Input type="number" min={1} max={28} value={x.day ?? 1} onChange={(e) => set({ day: Number(e.target.value) })} /></Field>}
          {x.trigger !== 'after_meeting' && <Field label="Hora"><Input type="time" value={x.time ?? '09:00'} onChange={(e) => set({ time: e.target.value })} /></Field>}
          {editableTrigger && <Field label="Área"><AreaSelect value={x.areaId} onChange={(areaId) => set({ areaId })} /></Field>}
        </div>
      </div>
    </Modal>
  );
}
