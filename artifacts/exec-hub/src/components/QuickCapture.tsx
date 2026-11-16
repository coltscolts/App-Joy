import { useRef, useState } from 'react';
import { CalendarDays, CheckSquare, Mic, NotebookPen, Sparkles, Square, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { postAi, transcribe } from '@/lib/api';
import { startRecording, type RecorderHandle } from '@/lib/recorder';
import { fmt, nowIso, uid, ymd, ymdhm } from '@/lib/util';
import type { Priority } from '@/lib/types';
import { Badge, Button, Modal, Textarea, useToast } from './ui';

interface Parsed {
  kind: 'task' | 'meeting' | 'note';
  title: string;
  due: string | null;
  remindAt: string | null;
  start: string | null;
  durationMin: number | null;
  area: string | null;
  priority: Priority;
  notes: string | null;
}

const KIND = {
  task: { label: 'Pendiente', icon: CheckSquare },
  meeting: { label: 'Reunión', icon: CalendarDays },
  note: { label: 'Nota', icon: NotebookPen },
};

// Captura rápida: escribe o dicta "Recuérdame el jueves a las 10 llamar a Juan
// sobre inventario Monterrey" y la IA lo convierte en pendiente / reunión / nota.
export function QuickCapture({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setState } = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [items, setItems] = useState<Parsed[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<RecorderHandle | null>(null);
  const chunks = useRef<Blob[]>([]);

  const close = () => { setText(''); setItems(null); onClose(); };

  const toggleMic = async () => {
    if (rec) {
      setBusy(true);
      await rec.stop();
      setRec(null);
      try {
        const blob = chunks.current[0];
        if (blob) {
          const said = await transcribe(blob);
          setText((t) => `${t} ${said}`.trim());
        }
      } catch (e) { toast((e as Error).message, 'bad'); }
      setBusy(false);
      return;
    }
    try {
      chunks.current = [];
      setRec(await startRecording((b) => { chunks.current.push(b); }));
    } catch { toast('Permite el micrófono para dictar', 'bad'); }
  };

  const organize = async () => {
    setBusy(true);
    try {
      const r = await postAi<{ items: Parsed[] }>('capture', { text, now: ymdhm(), areas: state.areas.map((a) => a.name) });
      setItems(r.items.length ? r.items : [fallback()]);
    } catch (e) {
      toast(`${(e as Error).message} — se guardará como pendiente.`, 'bad');
      setItems([fallback()]);
    }
    setBusy(false);
  };

  const fallback = (): Parsed => ({ kind: 'task', title: text.trim(), due: ymd(), remindAt: null, start: null, durationMin: null, area: null, priority: 'media', notes: null });

  const save = () => {
    const list = items ?? [fallback()];
    const areaId = (name: string | null) => state.areas.find((a) => a.name === name)?.id ?? null;
    setState((s) => {
      const next = { ...s };
      for (const it of list) {
        if (!it.title.trim()) continue;
        if (it.kind === 'meeting') {
          next.meetings = [{
            id: uid(), title: it.title, start: it.start ?? it.due ?? `${ymd()}T09:00`, durationMin: it.durationMin ?? 60,
            areaId: areaId(it.area), attendees: [], audioIds: [], agenda: it.notes ?? '', createdAt: nowIso(),
          }, ...next.meetings];
        } else if (it.kind === 'note') {
          next.notes = [{
            id: uid(), title: it.title, date: ymd(), areaId: areaId(it.area), kind: 'texto', text: it.notes ?? it.title,
            createdAt: nowIso(), updatedAt: nowIso(),
          }, ...next.notes];
        } else {
          next.tasks = [{
            id: uid(), title: it.title, due: it.due ?? it.remindAt?.slice(0, 10) ?? null, remindAt: it.remindAt,
            priority: it.priority, areaId: areaId(it.area), notes: it.notes ?? undefined, done: false, source: 'captura', createdAt: nowIso(),
          }, ...next.tasks];
        }
      }
      return next;
    });
    toast(`${list.length} elemento${list.length > 1 ? 's' : ''} guardado${list.length > 1 ? 's' : ''}`, 'ok');
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Captura rápida"
      footer={items ? (
        <><Button variant="ghost" onClick={() => setItems(null)}>Editar texto</Button><Button onClick={save}>Guardar todo</Button></>
      ) : (
        <>
          <Button variant="outline" onClick={() => { setItems([fallback()]); }} disabled={!text.trim()}>Solo pendiente</Button>
          <Button onClick={organize} loading={busy} disabled={!text.trim() || !!rec}><Sparkles className="h-4 w-4" />Organizar con IA</Button>
        </>
      )}
    >
      {!items ? (
        <div className="space-y-3">
          <Textarea
            autoFocus
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Escribe o dicta como hablas:\n"Recuérdame el jueves a las 10 llamar a Juan por el inventario de Monterrey y agenda junta con Finanzas el lunes 9am"'}
          />
          <Button variant={rec ? 'danger' : 'soft'} onClick={toggleMic} disabled={busy && !rec} className="w-full">
            {rec ? <><Square className="h-4 w-4" />Detener y transcribir</> : <><Mic className="h-4 w-4" />Dictar</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => {
            const K = KIND[it.kind];
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <K.icon className="mt-0.5 h-5 w-5 text-brand" />
                <div className="min-w-0 flex-1">
                  <input className="w-full bg-transparent font-medium outline-none" value={it.title}
                    onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{K.label}</Badge>
                    {(it.start || it.due) && <Badge>{fmt(it.start ?? it.due, (it.start ?? it.due ?? '').length > 10 ? 'EEE d MMM HH:mm' : 'EEE d MMM')}</Badge>}
                    {it.remindAt && <Badge>⏰ {fmt(it.remindAt, 'd MMM HH:mm')}</Badge>}
                    {it.area && <Badge>{it.area}</Badge>}
                    <Badge>{it.priority}</Badge>
                  </div>
                </div>
                <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-muted"><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
