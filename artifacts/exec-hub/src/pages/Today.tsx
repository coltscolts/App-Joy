import { useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { ArrowRight, CalendarDays, Moon, Plus, Sparkles, Sun, Video } from 'lucide-react';
import { useStore } from '@/lib/store';
import { postAi } from '@/lib/api';
import { eventsOn } from '@/lib/events';
import { isOverdue } from '@/lib/engine';
import { fmt, greeting, ymd, ymdhm } from '@/lib/util';
import { navigate } from '@/lib/router';
import { Bullets, Button, Card, Empty, SectionTitle, useToast } from '@/components/ui';
import { TaskEditor, TaskItem, newTask } from '@/components/TaskItem';
import type { Task } from '@/lib/types';

interface Brief { headline: string; priorities: string[]; watchOut: string[]; tomorrow: string[]; delegate: string[]; message: string }

export function TodayPage() {
  const { state, setState } = useStore();
  const toast = useToast();
  const today = ymd();
  const now = new Date();
  const evening = state.automations.find((a) => a.id === 'auto-evening');
  const [eh, em] = (evening?.time ?? '18:30').split(':').map(Number);
  const isEvening = now.getHours() * 60 + now.getMinutes() >= eh * 60 + em;
  const mode = isEvening ? 'evening' : 'morning';

  const cacheKey = `brief-${today}-${mode}`;
  const [brief, setBrief] = useState<Brief | null>(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey) ?? 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Task | null>(null);

  const events = eventsOn(state, today);
  const pending = state.tasks.filter((t) => !t.done);
  const overdue = pending.filter((t) => isOverdue(t));
  const todayTasks = pending.filter((t) => !isOverdue(t) && (!t.due || t.due.slice(0, 10) <= today))
    .sort((a, b) => ['alta', 'media', 'baja'].indexOf(a.priority) - ['alta', 'media', 'baja'].indexOf(b.priority));
  const doneToday = state.tasks.filter((t) => t.done && t.doneAt && ymd(new Date(t.doneAt)) === today);
  const upcoming = pending.filter((t) => t.due && t.due.slice(0, 10) > today).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '')).slice(0, 5);
  const areaName = (id?: string | null) => state.areas.find((a) => a.id === id)?.name;

  const runBrief = async () => {
    setLoading(true);
    try {
      const r = await postAi<Brief>('brief', {
        mode, now: ymdhm(), name: state.settings.name || undefined,
        tasks: state.tasks.filter((t) => !t.done || doneToday.includes(t)).slice(0, 200).map((t) => ({
          title: t.title, due: t.due, priority: t.priority, area: areaName(t.areaId), done: t.done, doneToday: doneToday.includes(t),
        })),
        events: eventsOn(state, today).concat(isEvening ? eventsOn(state, ymd(addDays(now, 1))) : [])
          .map((e) => ({ title: e.title, start: e.start, end: e.end })),
      });
      setBrief(r);
      localStorage.setItem(cacheKey, JSON.stringify(r));
    } catch (e) { toast((e as Error).message, 'bad'); }
    setLoading(false);
  };

  const moveToTomorrow = () => {
    const tomorrow = ymd(addDays(now, 1));
    const ids = new Set([...todayTasks, ...overdue].map((t) => t.id));
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (ids.has(t.id) ? { ...t, due: tomorrow } : t)) }));
    toast(`${ids.size} pendientes movidos a mañana`, 'ok');
  };

  const stats = useMemo(() => [
    { label: 'Reuniones hoy', value: events.length },
    { label: 'Pendientes hoy', value: todayTasks.length },
    { label: 'Vencidos', value: overdue.length, bad: overdue.length > 0 },
    { label: 'Hechos hoy', value: doneToday.length, ok: true },
  ], [events.length, todayTasks.length, overdue.length, doneToday.length]);

  return (
    <div>
      <p className="text-sm font-medium text-muted first-letter:uppercase">{fmt(now, "EEEE d 'de' MMMM")}</p>
      <h1 className="mb-5 text-3xl font-bold tracking-tight">{greeting(now)}{state.settings.name ? `, ${state.settings.name}` : ''}</h1>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="py-3">
            <div className={`text-3xl font-bold tabular-nums ${s.bad ? 'text-bad' : s.ok && s.value ? 'text-ok' : ''}`}>{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-6 border-brand/20 bg-gradient-to-br from-brand/[.07] to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEvening ? <Moon className="h-5 w-5 text-brand" /> : <Sun className="h-5 w-5 text-brand" />}
            <h2 className="font-semibold">{isEvening ? 'Cierre del día' : 'Briefing de la mañana'}</h2>
          </div>
          <Button size="sm" variant={brief ? 'ghost' : 'primary'} onClick={runBrief} loading={loading}>
            <Sparkles className="h-4 w-4" />{brief ? 'Actualizar' : 'Generar con IA'}
          </Button>
        </div>
        {brief ? (
          <div className="mt-3 space-y-3">
            <p className="text-lg font-semibold leading-snug">{brief.headline}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {brief.priorities.length > 0 && <div><p className="mb-1 text-xs font-semibold uppercase text-muted">Prioridades</p><Bullets items={brief.priorities} /></div>}
              {brief.watchOut.length > 0 && <div><p className="mb-1 text-xs font-semibold uppercase text-bad">Ojo con</p><Bullets items={brief.watchOut} /></div>}
              {brief.tomorrow.length > 0 && <div><p className="mb-1 text-xs font-semibold uppercase text-muted">Para mañana</p><Bullets items={brief.tomorrow} /></div>}
              {brief.delegate.length > 0 && <div><p className="mb-1 text-xs font-semibold uppercase text-muted">Delegar</p><Bullets items={brief.delegate} /></div>}
            </div>
            {brief.message && <p className="text-sm italic text-muted">{brief.message}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {isEvening
              ? 'Repasa lo que lograste, lo que quedó pendiente y prepara mañana en 1 minuto.'
              : 'Tus 3 prioridades, alertas de agenda y qué delegar, listos para empezar el día.'}
          </p>
        )}
        {isEvening && (todayTasks.length + overdue.length) > 0 && (
          <Button size="sm" variant="outline" className="mt-3" onClick={moveToTomorrow}>
            <ArrowRight className="h-4 w-4" />Pasar {todayTasks.length + overdue.length} pendientes a mañana
          </Button>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => navigate('agenda')}>Ver agenda</Button>}>Agenda de hoy</SectionTitle>
          {events.length ? (
            <Card className="divide-y divide-line p-0">
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-14 shrink-0 text-sm font-semibold tabular-nums">{e.start.slice(11, 16)}</div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => e.meetingId && navigate(`reuniones/${e.meetingId}`)}>
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-xs text-muted">{e.source === 'outlook' ? 'Outlook' : e.source === 'ics' ? 'Calendario' : 'Reunión'}{e.location ? ` · ${e.location}` : ''}</p>
                  </button>
                  {e.teamsUrl && <a href={e.teamsUrl} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-1 rounded-lg bg-[#5b5fc7] px-2.5 text-xs font-semibold text-white"><Video className="h-4 w-4" />Teams</a>}
                </div>
              ))}
            </Card>
          ) : (
            <Empty icon={<CalendarDays className="h-8 w-8" />} title="Sin reuniones hoy" text="Conecta Outlook en Ajustes o agenda una reunión." />
          )}
        </section>

        <section>
          <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => setAdding(newTask())}><Plus className="h-4 w-4" />Agregar</Button>}>
            Pendientes de hoy
          </SectionTitle>
          <Card className="p-2">
            {overdue.length > 0 && (
              <>
                <p className="px-2 pt-1 text-xs font-semibold uppercase text-bad">Vencidos</p>
                {overdue.map((t) => <TaskItem key={t.id} task={t} />)}
                <div className="my-1 border-t border-line" />
              </>
            )}
            {todayTasks.length ? todayTasks.map((t) => <TaskItem key={t.id} task={t} />) : <p className="p-3 text-sm text-muted">Nada pendiente para hoy. 👌</p>}
            {isEvening && doneToday.length > 0 && (
              <>
                <div className="my-1 border-t border-line" />
                <p className="px-2 pt-1 text-xs font-semibold uppercase text-ok">Logrado hoy</p>
                {doneToday.map((t) => <TaskItem key={t.id} task={t} compact />)}
              </>
            )}
          </Card>
          {upcoming.length > 0 && (
            <>
              <SectionTitle>Próximos</SectionTitle>
              <Card className="p-2">{upcoming.map((t) => <TaskItem key={t.id} task={t} />)}</Card>
            </>
          )}
        </section>
      </div>
      {adding && <TaskEditor task={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}
