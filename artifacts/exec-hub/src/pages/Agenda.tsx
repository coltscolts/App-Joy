import { useRef, useState } from 'react';
import { addDays, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Upload, Video } from 'lucide-react';
import { useStore } from '@/lib/store';
import { allEvents } from '@/lib/events';
import { fetchOutlookEvents, msAccount } from '@/lib/microsoft';
import { parseIcs } from '@/lib/ics';
import { cls, fmt, ymd } from '@/lib/util';
import { navigate } from '@/lib/router';
import { Button, Card, PageHeader, useToast } from '@/components/ui';
import { MeetingEditor, newMeeting } from '@/components/MeetingEditor';
import type { CalendarEvent, Meeting } from '@/lib/types';

export async function syncOutlook(clientId: string, tenant: string, setEvents: (ev: CalendarEvent[]) => void) {
  if (!(await msAccount(clientId, tenant))) throw new Error('Conecta Microsoft 365 en Ajustes');
  const from = addDays(new Date(), -14);
  const to = addDays(new Date(), 60);
  const events = await fetchOutlookEvents(clientId, tenant, from, to);
  setEvents(events);
  return events.length;
}

export function AgendaPage() {
  const { state, setState } = useStore();
  const toast = useToast();
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState(ymd());
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const events = allEvents(state);
  const tasksByDay = (d: string) => state.tasks.filter((t) => !t.done && t.due?.slice(0, 10) === d);

  const sync = async () => {
    setSyncing(true);
    try {
      const n = await syncOutlook(state.settings.msClientId, state.settings.msTenant, (ev) =>
        setState((s) => ({ ...s, importedEvents: [...s.importedEvents.filter((e) => e.source !== 'outlook'), ...ev] })));
      toast(`${n} eventos de Outlook sincronizados`, 'ok');
    } catch (e) { toast((e as Error).message, 'bad'); }
    setSyncing(false);
  };

  const importIcs = async (f: File) => {
    const ev = parseIcs(await f.text());
    setState((s) => ({ ...s, importedEvents: [...s.importedEvents.filter((e) => e.source !== 'ics'), ...ev] }));
    toast(`${ev.length} eventos importados`, 'ok');
  };

  const open = (e: CalendarEvent) => {
    if (e.meetingId) return navigate(`reuniones/${e.meetingId}`);
    // Evento de Outlook → crea la reunión en la app para grabar y hacer minuta.
    const m = newMeeting({ title: e.title, start: e.start, attendees: e.attendees ?? [], location: e.location, teamsUrl: e.teamsUrl, externalId: e.id.replace(/^ol-/, '') });
    const durationMin = Math.max(15, Math.round(((new Date(e.end).getTime()) - new Date(e.start).getTime()) / 60000) || 60);
    setState((s) => ({ ...s, meetings: [{ ...m, durationMin }, ...s.meetings] }));
    navigate(`reuniones/${m.id}`);
  };

  const DayList = ({ d }: { d: string }) => {
    const list = events.filter((e) => e.start.slice(0, 10) === d);
    const tasks = tasksByDay(d);
    return (
      <div className="space-y-1.5">
        {list.map((e) => (
          <button key={e.id} onClick={() => open(e)}
            className={cls('w-full rounded-lg border-l-4 px-2 py-1.5 text-left text-sm hover:brightness-95',
              e.source === 'outlook' ? 'border-[#0f6cbd] bg-[#0f6cbd]/10' : e.source === 'ics' ? 'border-muted bg-ink/5' : 'border-brand bg-brand/10')}>
            <div className="text-xs font-semibold tabular-nums text-muted">{e.start.slice(11, 16)}–{e.end.slice(11, 16)}</div>
            <div className="line-clamp-2 font-medium leading-tight">{e.title}</div>
            {e.teamsUrl && <Video className="mt-0.5 h-3.5 w-3.5 text-[#5b5fc7]" />}
          </button>
        ))}
        {tasks.map((t) => <div key={t.id} className="truncate rounded-lg bg-ink/5 px-2 py-1 text-xs">☐ {t.title}</div>)}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={state.settings.msClientId ? 'Outlook / Teams + reuniones de la app' : 'Conecta Outlook/Teams en Ajustes para ver tu calendario de la empresa'}
        actions={<>
          {state.settings.msClientId && <Button variant="outline" onClick={sync} loading={syncing}><RefreshCw className="h-4 w-4" />Sincronizar Outlook</Button>}
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Importar .ics</Button>
          <Button onClick={() => setEditing(newMeeting({ start: `${selected}T09:00` }))}><Plus className="h-4 w-4" />Reunión</Button>
        </>}
      />
      <input ref={fileRef} type="file" accept=".ics,text/calendar" hidden onChange={(e) => e.target.files?.[0] && importIcs(e.target.files[0])} />

      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft className="h-5 w-5" /></Button>
        <Button variant="outline" size="sm" onClick={() => { setWeek(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelected(ymd()); }}>Hoy</Button>
        <Button variant="outline" size="icon" onClick={() => setWeek(addDays(week, 7))}><ChevronRight className="h-5 w-5" /></Button>
        <span className="ml-2 font-semibold capitalize">{fmt(week, 'MMMM yyyy')}</span>
      </div>

      {/* Vista semanal (iPad) */}
      <div className="hidden grid-cols-7 gap-2 md:grid">
        {days.map((d) => {
          const key = ymd(d);
          return (
            <Card key={key} className={cls('min-h-[22rem] p-2', key === ymd() && 'border-brand')}>
              <div className="mb-2 text-center">
                <div className="text-xs uppercase text-muted">{fmt(d, 'EEE')}</div>
                <div className={cls('mx-auto flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold', key === ymd() && 'bg-brand text-brand-ink')}>{d.getDate()}</div>
              </div>
              <DayList d={key} />
            </Card>
          );
        })}
      </div>

      {/* Vista diaria (iPhone) */}
      <div className="md:hidden">
        <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4">
          {days.map((d) => {
            const key = ymd(d);
            const n = events.filter((e) => e.start.slice(0, 10) === key).length;
            return (
              <button key={key} onClick={() => setSelected(key)}
                className={cls('flex w-12 shrink-0 flex-col items-center rounded-2xl py-2', selected === key ? 'bg-brand text-brand-ink' : 'bg-surface')}>
                <span className="text-[11px] uppercase opacity-80">{fmt(d, 'EEEEE')}</span>
                <span className="text-lg font-bold">{d.getDate()}</span>
                <span className={cls('h-1.5 w-1.5 rounded-full', n ? (selected === key ? 'bg-brand-ink' : 'bg-brand') : 'bg-transparent')} />
              </button>
            );
          })}
        </div>
        <Card><DayList d={selected} /></Card>
      </div>

      {editing && <MeetingEditor meeting={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
