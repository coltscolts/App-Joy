import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, CheckSquare, ClipboardCopy, FileText, Mail, Mic, Pause, PenLine, Play, Plus, Sparkles, Square, Trash2, Upload, Video } from 'lucide-react';
import { useStore } from '@/lib/store';
import { postAi, transcribe } from '@/lib/api';
import { startRecording, type RecorderHandle } from '@/lib/recorder';
import { idb } from '@/lib/idb';
import { meetingToIcs } from '@/lib/ics';
import { isNative, nativeCalendar, openExternal } from '@/lib/native';
import { cls, download, fmt, nowIso, toDate, uid, ymd } from '@/lib/util';
import { navigate } from '@/lib/router';
import type { Meeting, Minutes, Task } from '@/lib/types';
import { AreaBadge, Badge, Bullets, Button, Card, Chip, Empty, PageHeader, SectionTitle, Spinner, Textarea, useToast } from '@/components/ui';
import { MeetingEditor, newMeeting } from '@/components/MeetingEditor';
import { TaskItem } from '@/components/TaskItem';

export function MeetingsPage() {
  const { state } = useStore();
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const today = ymd();
  const list = state.meetings.filter((m) => !area || m.areaId === area).sort((a, b) => b.start.localeCompare(a.start));
  const upcoming = list.filter((m) => m.start.slice(0, 10) >= today).reverse();
  const past = list.filter((m) => m.start.slice(0, 10) < today);

  const Row = ({ m }: { m: Meeting }) => (
    <button onClick={() => navigate(`reuniones/${m.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink/[.03]">
      <div className="w-14 shrink-0 text-center">
        <div className="text-xs uppercase text-muted">{fmt(m.start, 'MMM')}</div>
        <div className="text-xl font-bold leading-none">{fmt(m.start, 'd')}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{m.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>{fmt(m.start, 'HH:mm')}</span>
          <AreaBadge id={m.areaId} />
          {m.minutes ? <Badge color="#16a34a">Minuta lista</Badge> : m.transcript ? <Badge color="#ca8a04">Transcrita</Badge> : m.audioIds.length ? <Badge>Grabada</Badge> : null}
        </div>
      </div>
    </button>
  );

  return (
    <div>
      <PageHeader title="Reuniones" subtitle="Graba, transcribe y obtén la minuta con acuerdos y responsables."
        actions={<Button onClick={() => setEditing(newMeeting())}><Plus className="h-4 w-4" />Nueva reunión</Button>} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!area} onClick={() => setArea(null)}>Todas</Chip>
        {state.areas.map((a) => <Chip key={a.id} color={a.color} active={area === a.id} onClick={() => setArea(a.id)}>{a.name}</Chip>)}
      </div>
      {!list.length ? (
        <Empty icon={<Mic className="h-8 w-8" />} title="Aún no hay reuniones"
          text="Crea una reunión, presiona Grabar y al terminar la IA te entrega la minuta con acuerdos y pendientes."
          action={<Button onClick={() => setEditing(newMeeting({ title: 'Reunión rápida', start: `${ymd()}T${new Date().toTimeString().slice(0, 5)}` }))}><Mic className="h-4 w-4" />Grabar ahora</Button>} />
      ) : (
        <>
          {upcoming.length > 0 && <><SectionTitle>Próximas</SectionTitle><Card className="divide-y divide-line p-0">{upcoming.map((m) => <Row key={m.id} m={m} />)}</Card></>}
          {past.length > 0 && <><SectionTitle>Anteriores</SectionTitle><Card className="divide-y divide-line p-0">{past.map((m) => <Row key={m.id} m={m} />)}</Card></>}
        </>
      )}
      {editing && <MeetingEditor meeting={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export function minutesToText(m: Meeting, areaName?: string): string {
  const x = m.minutes;
  if (!x) return '';
  const sec = (t: string, items: string[]) => (items.length ? `\n${t}\n${items.map((i) => `• ${i}`).join('\n')}\n` : '');
  return `MINUTA — ${m.title}
Fecha: ${fmt(m.start, "d 'de' MMMM yyyy, HH:mm")}${areaName ? `\nÁrea: ${areaName}` : ''}
Asistentes: ${m.attendees.join(', ') || '—'}

RESUMEN
${x.summary}
${sec('PUNTOS TRATADOS', x.keyPoints)}${sec('ACUERDOS', x.decisions)}${sec('ACCIONES', x.actions.map((a) => `${a.task}${a.owner ? ` — ${a.owner}` : ''}${a.due ? ` (${a.due})` : ''}`))}${sec('RIESGOS', x.risks)}${sec('PENDIENTES POR DEFINIR', x.openQuestions)}${x.nextMeeting ? `\nSIGUIENTE REUNIÓN: ${x.nextMeeting}\n` : ''}`;
}

export function MeetingDetail({ id }: { id: string }) {
  const { state, patch, remove, setState, log } = useStore();
  const toast = useToast();
  const m = state.meetings.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const [rec, setRec] = useState<RecorderHandle | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);
  const [tab, setTab] = useState<'minuta' | 'transcripcion' | 'notas'>('minuta');
  const startedAt = useRef(0);
  const segKeys = useRef<string[]>([]);
  const fresh = useRef(false); // hay audio nuevo sin transcribir
  const audioInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!rec) return;
    const t = window.setInterval(() => !paused && setElapsed(Date.now() - startedAt.current), 500);
    // Medidor de nivel para confirmar que el micrófono escucha.
    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    ctx.createMediaStreamSource(rec.stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    let raf = 0;
    const loop = () => {
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(peak / 128);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { clearInterval(t); cancelAnimationFrame(raf); void ctx.close(); };
  }, [rec, paused]);

  if (!m) return <Empty icon={<Mic className="h-8 w-8" />} title="Reunión no encontrada" action={<Button onClick={() => navigate('reuniones')}>Volver</Button>} />;
  const area = state.areas.find((a) => a.id === m.areaId);
  const linkedTasks = state.tasks.filter((t) => t.meetingId === m.id);
  const linkedNotes = state.notes.filter((n) => n.meetingId === m.id);

  const saveSegment = async (blob: Blob) => {
    const key = `audio-${m.id}-${uid()}`;
    await idb.setBlob(key, blob);
    segKeys.current.push(key);
    fresh.current = true;
    setState((s) => ({ ...s, meetings: s.meetings.map((x) => (x.id === m.id ? { ...x, audioIds: [...x.audioIds, key] } : x)) }));
  };

  const start = async () => {
    try {
      startedAt.current = Date.now();
      setElapsed(0);
      setRec(await startRecording(saveSegment));
      toast('Grabando. Deja la pantalla encendida.', 'info');
    } catch {
      toast('No se pudo usar el micrófono. Revisa los permisos.', 'bad');
    }
  };

  const stop = async (thenProcess: boolean) => {
    if (!rec) return;
    setStatus('Guardando audio…');
    await rec.stop();
    setRec(null);
    setPaused(false);
    setStatus('');
    if (thenProcess) await processAll();
  };

  // Transcribe todos los segmentos y genera la minuta.
  const processAll = async () => {
    const ids = [...new Set([...m.audioIds, ...segKeys.current])];
    setBusy(true);
    try {
      let transcript = fresh.current ? '' : m.transcript ?? '';
      if (ids.length && !transcript) {
        const parts: string[] = [];
        for (let i = 0; i < ids.length; i++) {
          setStatus(`Transcribiendo parte ${i + 1} de ${ids.length}…`);
          const blob = await idb.getBlob(ids[i]);
          if (blob) parts.push(await transcribe(blob, [m.title, ...m.attendees].join(', ')));
        }
        transcript = parts.join('\n\n');
        fresh.current = false;
        patch('meetings', id, { transcript });
      }
      await makeMinutes(transcript);
    } catch (e) {
      toast((e as Error).message, 'bad');
    }
    setStatus('');
    setBusy(false);
  };

  const makeMinutes = async (transcript: string) => {
    if (!transcript.trim() && !m.notes?.trim()) { toast('Graba la reunión o escribe notas primero', 'bad'); return; }
    setStatus('La IA está redactando la minuta…');
    const minutes = await postAi<Minutes>('minutes', {
      title: m.title, date: m.start, area: area?.name, attendees: m.attendees, agenda: m.agenda, notes: m.notes, transcript,
    });
    patch('meetings', id, { minutes });
    setTab('minuta');
    log(`Minuta generada: ${m.title}`);
    const auto = state.automations.find((a) => a.action === 'minutes_to_tasks');
    if (auto?.enabled && minutes.actions.length) {
      addActions(minutes, true);
    }
    toast('Minuta lista', 'ok');
  };

  const addActions = (minutes: Minutes, silent = false) => {
    const existing = new Set(linkedTasks.map((t) => t.title));
    const tasks: Task[] = minutes.actions.filter((a) => !existing.has(a.task)).map((a) => ({
      id: uid(), title: a.task, owner: a.owner ?? undefined, due: a.due ?? null, priority: a.priority,
      areaId: m.areaId, topic: m.topic, meetingId: m.id, done: false, source: 'minuta', createdAt: nowIso(),
    }));
    setState((s) => ({ ...s, tasks: [...tasks, ...s.tasks] }));
    if (!silent || tasks.length) toast(`${tasks.length} acciones agregadas a Pendientes`, 'ok');
  };

  const importAudio = async (f: File) => {
    if (f.size > 24 * 1024 * 1024) { toast('El archivo supera 24 MB. Divide el audio o grábalo desde la app.', 'bad'); return; }
    await saveSegment(f);
    toast('Audio agregado. Presiona "Transcribir y generar minuta".', 'ok');
  };

  const deleteMeeting = async () => {
    if (!confirm('¿Eliminar esta reunión, su audio y su minuta?')) return;
    await Promise.all(m.audioIds.map((k) => idb.deleteBlob(k)));
    remove('meetings', m.id);
    navigate('reuniones');
  };

  const text = minutesToText(m, area?.name);
  const mm = String(Math.floor(elapsed / 60000)).padStart(2, '0');
  const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');

  return (
    <div>
      <button onClick={() => navigate('reuniones')} className="mb-2 text-sm text-brand">← Reuniones</button>
      <PageHeader
        title={m.title}
        subtitle={<span className="flex flex-wrap items-center gap-2">{fmt(m.start, "EEEE d 'de' MMMM, HH:mm")} · {m.durationMin} min <AreaBadge id={m.areaId} />{m.topic && <Badge>#{m.topic}</Badge>}</span>}
        actions={<>
          {m.teamsUrl && <a href={m.teamsUrl} target="_blank" rel="noreferrer" onClick={(ev) => { ev.preventDefault(); openExternal(m.teamsUrl!); }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5b5fc7] px-4 font-medium text-white"><Video className="h-4 w-4" />Unirse a Teams</a>}
          <Button variant="outline" onClick={() => setEdit(true)}>Editar</Button>
          <Button variant="outline" size="icon" aria-label="Agregar al calendario" onClick={async () => {
            if (isNative()) {
              const start = toDate(m.start);
              if (!start || m.externalId) { toast(m.externalId ? 'Esta reunión ya está en tu calendario' : 'Fecha inválida'); return; }
              try {
                await nativeCalendar.addEvent({ title: m.title, start, end: new Date(start.getTime() + m.durationMin * 60000), notes: m.agenda, location: m.location, alarmMinutes: 10 });
                toast('Agregada a tu Calendario', 'ok');
              } catch (e) { toast((e as Error).message, 'bad'); }
              return;
            }
            const ics = meetingToIcs(m); if (ics) download(`${m.title}.ics`, ics, 'text/calendar');
          }}><CalendarPlus className="h-4 w-4" /></Button>
          <Button variant="danger" size="icon" aria-label="Eliminar" onClick={deleteMeeting}><Trash2 className="h-4 w-4" /></Button>
        </>}
      />

      {m.attendees.length > 0 && <p className="-mt-3 mb-4 text-sm text-muted">Asistentes: {m.attendees.join(', ')}</p>}

      {/* Grabadora */}
      <Card className={cls('mb-5', rec && 'border-bad/40 bg-bad/[.04]')}>
        {rec ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className={cls('h-3 w-3 rounded-full bg-bad', !paused && 'animate-pulse')} />
              <span className="text-3xl font-bold tabular-nums">{mm}:{ss}</span>
            </div>
            <div className="h-2 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full bg-bad transition-[width] duration-100" style={{ width: `${Math.min(100, level * 180)}%` }} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { if (paused) { rec.resume(); } else { rec.pause(); } setPaused(!paused); }}>
                {paused ? <><Play className="h-4 w-4" />Reanudar</> : <><Pause className="h-4 w-4" />Pausa</>}
              </Button>
              <Button variant="outline" onClick={() => stop(false)}><Square className="h-4 w-4" />Detener</Button>
              <Button onClick={() => stop(true)}><Sparkles className="h-4 w-4" />Terminar y hacer minuta</Button>
            </div>
            <p className="w-full text-xs text-muted">El audio se guarda en tu dispositivo por partes de 10 min. Puedes escribir notas abajo mientras grabas.</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={start} className="!bg-bad text-white"><Mic className="h-5 w-5" />{m.audioIds.length ? 'Seguir grabando' : 'Grabar reunión'}</Button>
            <Button variant="outline" onClick={() => audioInput.current?.click()}><Upload className="h-4 w-4" />Subir audio</Button>
            {(m.audioIds.length > 0 || m.notes) && (
              <Button variant="soft" onClick={processAll} loading={busy}><Sparkles className="h-4 w-4" />{m.minutes ? 'Rehacer minuta' : 'Transcribir y generar minuta'}</Button>
            )}
            {m.audioIds.length > 0 && <span className="text-sm text-muted">{m.audioIds.length} parte{m.audioIds.length > 1 ? 's' : ''} de audio</span>}
            <input ref={audioInput} type="file" accept="audio/*,video/mp4,.m4a" hidden onChange={(e) => e.target.files?.[0] && importAudio(e.target.files[0])} />
            <p className="w-full text-xs text-muted">Avisa a los asistentes que la reunión se graba. En Teams también puedes subir aquí la grabación descargada.</p>
          </div>
        )}
        {status && <div className="mt-3"><Spinner label={status} /></div>}
      </Card>

      <div className="mb-3 flex gap-2">
        <Chip active={tab === 'minuta'} onClick={() => setTab('minuta')}>Minuta</Chip>
        <Chip active={tab === 'notas'} onClick={() => setTab('notas')}>Mis notas</Chip>
        <Chip active={tab === 'transcripcion'} onClick={() => setTab('transcripcion')}>Transcripción</Chip>
      </div>

      {tab === 'minuta' && (m.minutes ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(text); toast('Minuta copiada', 'ok'); }}><ClipboardCopy className="h-4 w-4" />Copiar</Button>
              <Button size="sm" variant="outline" onClick={() => openExternal(`mailto:?subject=${encodeURIComponent(`Minuta: ${m.title}`)}&body=${encodeURIComponent(text)}`)}><Mail className="h-4 w-4" />Enviar por correo</Button>
              <Button size="sm" variant="outline" onClick={() => download(`Minuta ${m.title} ${m.start.slice(0, 10)}.txt`, text)}><FileText className="h-4 w-4" />Descargar</Button>
            </div>
            <div><h3 className="mb-1 font-semibold">Resumen ejecutivo</h3><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.minutes.summary}</p></div>
            {m.minutes.decisions.length > 0 && <div><h3 className="mb-1 font-semibold">Acuerdos</h3><Bullets items={m.minutes.decisions} /></div>}
            {m.minutes.keyPoints.length > 0 && <div><h3 className="mb-1 font-semibold">Puntos tratados</h3><Bullets items={m.minutes.keyPoints} /></div>}
            {m.minutes.risks.length > 0 && <div><h3 className="mb-1 font-semibold text-bad">Riesgos</h3><Bullets items={m.minutes.risks} /></div>}
            {m.minutes.openQuestions.length > 0 && <div><h3 className="mb-1 font-semibold">Por definir</h3><Bullets items={m.minutes.openQuestions} /></div>}
            {m.minutes.nextMeeting && <p className="text-sm"><b>Seguimiento:</b> {m.minutes.nextMeeting}</p>}
          </Card>
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Acciones</h3>
              <Button size="sm" variant="soft" onClick={() => addActions(m.minutes!)}><CheckSquare className="h-4 w-4" />A pendientes</Button>
            </div>
            {linkedTasks.length ? linkedTasks.map((t) => <TaskItem key={t.id} task={t} compact />) : (
              <ul className="space-y-2 text-sm">
                {m.minutes.actions.map((a, i) => (
                  <li key={i} className="rounded-lg bg-ink/[.03] p-2">{a.task}<div className="text-xs text-muted">{[a.owner, a.due, a.priority].filter(Boolean).join(' · ')}</div></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Empty icon={<Sparkles className="h-8 w-8" />} title="Sin minuta todavía"
          text="Graba la reunión (o escribe notas) y la IA redacta resumen, acuerdos, responsables, fechas y riesgos." />
      ))}

      {tab === 'notas' && (
        <div className="space-y-3">
          <Textarea rows={10} placeholder="Notas durante la reunión (también se usan para la minuta)…" value={m.notes ?? ''} onChange={(e) => patch('meetings', id, { notes: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => {
              const nid = uid();
              setState((s) => ({ ...s, notes: [{ id: nid, title: `Notas: ${m.title}`, date: m.start.slice(0, 10), areaId: m.areaId, topic: m.topic, kind: 'manuscrita', text: '', strokes: [], meetingId: m.id, createdAt: nowIso(), updatedAt: nowIso() }, ...s.notes] }));
              navigate(`notas/${nid}`);
            }}><PenLine className="h-4 w-4" />Nota a mano (Apple Pencil)</Button>
            {linkedNotes.map((n) => <Button key={n.id} variant="ghost" onClick={() => navigate(`notas/${n.id}`)}>✎ {n.title}</Button>)}
          </div>
        </div>
      )}

      {tab === 'transcripcion' && (
        m.transcript ? <Textarea rows={18} value={m.transcript} onChange={(e) => patch('meetings', id, { transcript: e.target.value })} />
          : <p className="text-sm text-muted">La transcripción aparecerá aquí después de procesar el audio.</p>
      )}

      {edit && <MeetingEditor meeting={m} onClose={() => setEdit(false)} openAfter={false} />}
    </div>
  );
}
