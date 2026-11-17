import { useState } from 'react';
import { AlarmClock, CalendarPlus, Check, Trash2, User } from 'lucide-react';
import type { Priority, Task } from '@/lib/types';
import { useStore } from '@/lib/store';
import { cls, download, fmt, nowIso, toDate, uid, ymd } from '@/lib/util';
import { isOverdue } from '@/lib/engine';
import { taskToIcs } from '@/lib/ics';
import { isNative, nativeCalendar } from '@/lib/native';
import { AreaBadge, AreaSelect, Badge, Button, Field, Input, Modal, Select, Textarea, useToast } from './ui';

const PRI_COLOR: Record<Priority, string> = { alta: '#dc2626', media: '#ca8a04', baja: '#6b7280' };

export function TaskItem({ task, compact }: { task: Task; compact?: boolean }) {
  const { patch } = useStore();
  const [edit, setEdit] = useState(false);
  const overdue = isOverdue(task);
  return (
    <>
      <div className={cls('group flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-ink/[.03]', task.done && 'opacity-55')}>
        <button
          aria-label={task.done ? 'Marcar pendiente' : 'Completar'}
          onClick={() => patch('tasks', task.id, { done: !task.done, doneAt: task.done ? null : nowIso() })}
          className={cls('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition',
            task.done ? 'border-ok bg-ok text-white' : 'border-line hover:border-brand')}
          style={!task.done ? { borderColor: PRI_COLOR[task.priority] } : undefined}
        >
          {task.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(true)}>
          <p className={cls('text-[15px] leading-snug', task.done && 'line-through')}>{task.title}</p>
          {!compact || task.due || task.owner ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {task.due && <span className={cls(overdue && 'font-semibold text-bad')}>{overdue ? 'Venció ' : ''}{fmt(task.due, task.due.length > 10 ? "EEE d MMM, HH:mm" : 'EEE d MMM')}</span>}
              {task.remindAt && !task.done && <span className="inline-flex items-center gap-0.5"><AlarmClock className="h-3 w-3" />{fmt(task.remindAt, 'd MMM HH:mm')}</span>}
              {task.owner && <span className="inline-flex items-center gap-0.5"><User className="h-3 w-3" />{task.owner}</span>}
              {!compact && <AreaBadge id={task.areaId} />}
              {!compact && task.topic && <Badge>#{task.topic}</Badge>}
              {task.source === 'minuta' && <Badge>De minuta</Badge>}
            </div>
          ) : null}
        </button>
      </div>
      {edit && <TaskEditor task={task} onClose={() => setEdit(false)} />}
    </>
  );
}

export function newTask(partial: Partial<Task> = {}): Task {
  return { id: uid(), title: '', priority: 'media', done: false, due: ymd(), createdAt: nowIso(), source: 'manual', ...partial };
}

export function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const { state, upsert, remove } = useStore();
  const toast = useToast();
  const [t, setT] = useState<Task>(task);
  const isNew = !state.tasks.some((x) => x.id === task.id);
  const set = (p: Partial<Task>) => setT((s) => ({ ...s, ...p }));
  const save = () => {
    if (!t.title.trim()) return;
    upsert('tasks', { ...t, title: t.title.trim(), reminded: t.remindAt !== task.remindAt ? false : t.reminded });
    onClose();
  };
  const topics = [...new Set(state.tasks.map((x) => x.topic).filter(Boolean))] as string[];
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Nuevo pendiente' : 'Pendiente'}
      footer={<>
        {!isNew && <Button variant="danger" onClick={() => { remove('tasks', t.id); onClose(); }}><Trash2 className="h-4 w-4" />Eliminar</Button>}
        <div className="flex-1" />
        <Button onClick={save} disabled={!t.title.trim()}>Guardar</Button>
      </>}
    >
      <div className="space-y-3">
        <Input autoFocus placeholder="¿Qué hay que hacer?" value={t.title} onChange={(e) => set({ title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha límite"><Input type="date" value={t.due?.slice(0, 10) ?? ''} onChange={(e) => set({ due: e.target.value || null })} /></Field>
          <Field label="Recordarme"><Input type="datetime-local" value={t.remindAt ?? ''} onChange={(e) => set({ remindAt: e.target.value || null })} /></Field>
          <Field label="Prioridad">
            <Select value={t.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
              <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
            </Select>
          </Field>
          <Field label="¿Urgente?">
            <Select value={t.urgent ? '1' : '0'} onChange={(e) => set({ urgent: e.target.value === '1' })}>
              <option value="0">No urgente</option><option value="1">Urgente</option>
            </Select>
          </Field>
          <Field label="Área / Dirección"><AreaSelect value={t.areaId} onChange={(areaId) => set({ areaId })} /></Field>
          <Field label="Tema">
            <Input list="topics" placeholder="p. ej. Presupuesto 2027" value={t.topic ?? ''} onChange={(e) => set({ topic: e.target.value })} />
            <datalist id="topics">{topics.map((x) => <option key={x} value={x} />)}</datalist>
          </Field>
        </div>
        <Field label="Delegado a"><Input placeholder="Nombre del responsable" value={t.owner ?? ''} onChange={(e) => set({ owner: e.target.value })} /></Field>
        <Field label="Notas"><Textarea rows={3} value={t.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
        {(t.remindAt || t.due) && (
          <Button variant="outline" size="sm" onClick={async () => {
            if (isNative()) {
              const start = toDate(t.remindAt ?? (t.due && t.due.length > 10 ? t.due : `${t.due}T09:00`));
              if (!start) return;
              try {
                await nativeCalendar.addEvent({ title: `⏰ ${t.title}`, start, end: new Date(start.getTime() + 15 * 60000), notes: t.notes, alarmMinutes: 0 });
                toast('Agregado a tu Calendario con alarma', 'ok');
              } catch (e) { toast((e as Error).message, 'bad'); }
              return;
            }
            const ics = taskToIcs(t);
            if (ics) { download(`${t.title.slice(0, 40)}.ics`, ics, 'text/calendar'); toast('Ábrelo para agregarlo a tu Calendario con alarma'); }
          }}>
            <CalendarPlus className="h-4 w-4" />Agregar recordatorio al Calendario
          </Button>
        )}
      </div>
    </Modal>
  );
}
