import { useMemo, useState } from 'react';
import { CheckSquare, Plus, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { isOverdue } from '@/lib/engine';
import { fmt, ymd } from '@/lib/util';
import type { Task } from '@/lib/types';
import { Button, Card, Chip, Empty, Input, PageHeader, SectionTitle } from '@/components/ui';
import { TaskEditor, TaskItem, newTask } from '@/components/TaskItem';

type Group = 'dia' | 'area' | 'tema' | 'matriz' | 'delegado';
const GROUPS: { id: Group; label: string }[] = [
  { id: 'dia', label: 'Por día' }, { id: 'area', label: 'Por área' }, { id: 'tema', label: 'Por tema' },
  { id: 'delegado', label: 'Delegados' }, { id: 'matriz', label: 'Matriz urgente/importante' },
];

export function TasksPage() {
  const { state } = useStore();
  const [group, setGroup] = useState<Group>('dia');
  const [show, setShow] = useState<'pendientes' | 'hechos'>('pendientes');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<Task | null>(null);

  const tasks = useMemo(() => state.tasks
    .filter((t) => (show === 'pendientes' ? !t.done : t.done))
    .filter((t) => !q || `${t.title} ${t.notes ?? ''} ${t.owner ?? ''} ${t.topic ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999')), [state.tasks, show, q]);

  const groups = useMemo((): { key: string; title: string; color?: string; items: Task[] }[] => {
    const by = (keyFn: (t: Task) => string, titleFn: (k: string) => string, order?: string[]) => {
      const m = new Map<string, Task[]>();
      tasks.forEach((t) => { const k = keyFn(t); m.set(k, [...(m.get(k) ?? []), t]); });
      const keys = [...m.keys()].sort((a, b) => (order ? order.indexOf(a) - order.indexOf(b) : a.localeCompare(b)));
      return keys.map((k) => ({ key: k, title: titleFn(k), items: m.get(k)! }));
    };
    const today = ymd();
    switch (group) {
      case 'dia':
        return by((t) => (isOverdue(t) ? '0' : !t.due ? '9' : t.due.slice(0, 10) === today ? '1' : t.due.slice(0, 10)),
          (k) => (k === '0' ? 'Vencidos' : k === '1' ? 'Hoy' : k === '9' ? 'Sin fecha' : fmt(k, "EEEE d 'de' MMMM")));
      case 'area':
        return by((t) => t.areaId ?? '', (k) => state.areas.find((a) => a.id === k)?.name ?? 'Sin área', ['', ...state.areas.map((a) => a.id)].reverse())
          .map((g) => ({ ...g, color: state.areas.find((a) => a.id === g.key)?.color }));
      case 'tema':
        return by((t) => t.topic || '~', (k) => (k === '~' ? 'Sin tema' : `#${k}`));
      case 'delegado':
        return by((t) => t.owner || '~', (k) => (k === '~' ? 'Míos (sin delegar)' : k));
      case 'matriz':
        return [];
    }
  }, [group, tasks, state.areas]);

  const quadrant = (urgent: boolean, important: boolean) => tasks.filter((t) => !!t.urgent === urgent && (t.priority === 'alta') === important);
  const Q = [
    { title: 'Hazlo ya', sub: 'Urgente e importante', u: true, i: true, color: '#dc2626' },
    { title: 'Agéndalo', sub: 'Importante, no urgente', u: false, i: true, color: '#2563eb' },
    { title: 'Delégalo', sub: 'Urgente, no importante', u: true, i: false, color: '#ca8a04' },
    { title: 'Elimínalo / después', sub: 'Ni urgente ni importante', u: false, i: false, color: '#6b7280' },
  ];

  return (
    <div>
      <PageHeader title="Pendientes" subtitle={`${state.tasks.filter((t) => !t.done).length} abiertos · ${state.tasks.filter((t) => isOverdue(t)).length} vencidos`}
        actions={<Button onClick={() => setAdding(newTask())}><Plus className="h-4 w-4" />Nuevo</Button>} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted" />
          <Input className="pl-10" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Chip active={show === 'pendientes'} onClick={() => setShow('pendientes')}>Abiertos</Chip>
        <Chip active={show === 'hechos'} onClick={() => setShow('hechos')}>Hechos</Chip>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {GROUPS.map((g) => <Chip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>{g.label}</Chip>)}
      </div>

      {!tasks.length ? (
        <Empty icon={<CheckSquare className="h-8 w-8" />} title={show === 'pendientes' ? 'Sin pendientes' : 'Nada completado aún'}
          text="Agrégalos aquí, con la captura rápida (+) o automáticamente desde las minutas." />
      ) : group === 'matriz' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Q.map((x) => (
            <Card key={x.title} className="min-h-[12rem] p-2" style={{ borderTop: `4px solid ${x.color}` }}>
              <div className="px-2 pb-1 pt-1"><p className="font-semibold" style={{ color: x.color }}>{x.title}</p><p className="text-xs text-muted">{x.sub}</p></div>
              {quadrant(x.u, x.i).map((t) => <TaskItem key={t.id} task={t} />)}
            </Card>
          ))}
          <p className="text-xs text-muted md:col-span-2">Importante = prioridad alta. Marca "Urgente" al editar un pendiente.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key}>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">{g.color && <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />}{g.title} · {g.items.length}</span>
            </SectionTitle>
            <Card className="p-2">{g.items.map((t) => <TaskItem key={t.id} task={t} />)}</Card>
          </section>
        ))
      )}
      {adding && <TaskEditor task={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}
