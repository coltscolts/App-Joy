import { useMemo, useRef, useState } from 'react';
import { Camera, CheckSquare, FileText, NotebookPen, PenLine, Search, Sparkles, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { postAi } from '@/lib/api';
import { blobToBase64, fmt, nowIso, uid, ymd } from '@/lib/util';
import { navigate } from '@/lib/router';
import type { Note } from '@/lib/types';
import { AreaBadge, AreaSelect, Badge, Button, Card, Chip, Empty, Field, Input, PageHeader, SectionTitle, Textarea, useToast } from '@/components/ui';
import { InkCanvas, type InkHandle } from '@/components/InkCanvas';
import { BlobImage, savePhoto } from '@/components/BlobImage';

export function NotesPage() {
  const { state, upsert } = useStore();
  const [q, setQ] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [view, setView] = useState<'dia' | 'tema'>('dia');

  const create = (kind: Note['kind']) => {
    const n: Note = { id: uid(), title: kind === 'manuscrita' ? `Nota ${fmt(new Date(), 'd MMM HH:mm')}` : '', date: ymd(), kind, text: '', strokes: [], pageHeight: 1400, areaId: area, createdAt: nowIso(), updatedAt: nowIso() };
    upsert('notes', n);
    navigate(`notas/${n.id}`);
  };

  const notes = state.notes
    .filter((n) => !area || n.areaId === area)
    .filter((n) => !q || `${n.title} ${n.text} ${n.topic ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const groups = useMemo(() => {
    const m = new Map<string, Note[]>();
    notes.forEach((n) => { const k = view === 'dia' ? n.date : n.topic || 'Sin tema'; m.set(k, [...(m.get(k) ?? []), n]); });
    return [...m.entries()].sort((a, b) => (view === 'dia' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])));
  }, [notes, view]);

  return (
    <div>
      <PageHeader title="Notas" subtitle="Escribe con Apple Pencil o teclado. Organizadas por día, tema y área."
        actions={<>
          <Button variant="outline" onClick={() => create('texto')}><FileText className="h-4 w-4" />Texto</Button>
          <Button onClick={() => create('manuscrita')}><PenLine className="h-4 w-4" />A mano</Button>
        </>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted" />
          <Input className="pl-10" placeholder="Buscar en notas" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Chip active={view === 'dia'} onClick={() => setView('dia')}>Por día</Chip>
        <Chip active={view === 'tema'} onClick={() => setView('tema')}>Por tema</Chip>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!area} onClick={() => setArea(null)}>Todas las áreas</Chip>
        {state.areas.map((a) => <Chip key={a.id} color={a.color} active={area === a.id} onClick={() => setArea(a.id)}>{a.name}</Chip>)}
      </div>
      {!notes.length ? (
        <Empty icon={<NotebookPen className="h-8 w-8" />} title="Sin notas" text="Toma notas a mano con tu Apple Pencil; la IA las convierte a texto y extrae pendientes."
          action={<Button onClick={() => create('manuscrita')}><PenLine className="h-4 w-4" />Nueva nota a mano</Button>} />
      ) : groups.map(([k, list]) => (
        <section key={k}>
          <SectionTitle>{view === 'dia' ? fmt(k, "EEEE d 'de' MMMM yyyy") : k}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((n) => (
              <Card key={n.id} className="cursor-pointer hover:border-brand/40" onClick={() => navigate(`notas/${n.id}`)}>
                <div className="mb-1 flex items-center gap-2">
                  {n.kind === 'manuscrita' ? <PenLine className="h-4 w-4 text-brand" /> : <FileText className="h-4 w-4 text-muted" />}
                  <p className="truncate font-semibold">{n.title || 'Sin título'}</p>
                </div>
                <p className="line-clamp-3 min-h-[3.75rem] text-sm text-muted">{n.text || (n.kind === 'manuscrita' ? `${n.strokes?.length ?? 0} trazos` : '')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5"><AreaBadge id={n.areaId} />{n.topic && <Badge>#{n.topic}</Badge>}{n.meetingId && <Badge>Reunión</Badge>}</div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function NoteDetail({ id }: { id: string }) {
  const { state, patch, remove, setState, upsert } = useStore();
  const toast = useToast();
  const n = state.notes.find((x) => x.id === id);
  const ink = useRef<InkHandle>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  if (!n) return <Empty icon={<NotebookPen className="h-8 w-8" />} title="Nota no encontrada" action={<Button onClick={() => navigate('notas')}>Volver</Button>} />;
  const set = (p: Partial<Note>) => patch('notes', id, { ...p, updatedAt: nowIso() });
  const meeting = state.meetings.find((m) => m.id === n.meetingId);

  const toText = async () => {
    setBusy(true);
    try {
      const png = await ink.current?.toPng();
      if (!png) throw new Error('La hoja está vacía');
      const r = await postAi<{ text: string; title: string; actions: string[] }>('ink', { image: await blobToBase64(png), mimeType: 'image/png' });
      set({ text: r.text, title: n.title.startsWith('Nota ') && r.title ? r.title : n.title });
      setActions(r.actions);
      toast('Nota convertida a texto', 'ok');
    } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(false);
  };

  const addPhotos = async (files: FileList) => {
    const ids: string[] = [];
    for (const f of Array.from(files)) {
      const p = await savePhoto(f, { areaId: n.areaId, topic: n.topic, caption: n.title });
      upsert('photos', p);
      ids.push(p.id);
    }
    set({ photoIds: [...(n.photoIds ?? []), ...ids] });
  };

  return (
    <div>
      <button onClick={() => navigate(meeting ? `reuniones/${meeting.id}` : 'notas')} className="mb-2 text-sm text-brand">← {meeting ? meeting.title : 'Notas'}</button>
      <input className="mb-3 w-full bg-transparent text-2xl font-bold tracking-tight outline-none md:text-3xl" placeholder="Título" value={n.title} onChange={(e) => set({ title: e.target.value })} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Fecha"><Input type="date" value={n.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <Field label="Área"><AreaSelect value={n.areaId} onChange={(areaId) => set({ areaId })} /></Field>
        <Field label="Tema"><Input value={n.topic ?? ''} onChange={(e) => set({ topic: e.target.value })} placeholder="#tema" /></Field>
        <div className="flex items-end gap-2">
          <Button variant="outline" size="icon" aria-label="Agregar foto" onClick={() => photoInput.current?.click()}><Camera className="h-5 w-5" /></Button>
          <Button variant="danger" size="icon" aria-label="Eliminar nota" onClick={() => { if (confirm('¿Eliminar nota?')) { remove('notes', id); navigate('notas'); } }}><Trash2 className="h-5 w-5" /></Button>
        </div>
      </div>
      <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addPhotos(e.target.files)} />

      <div className="mb-3 flex gap-2">
        <Chip active={n.kind === 'manuscrita'} onClick={() => set({ kind: 'manuscrita' })}>✎ A mano</Chip>
        <Chip active={n.kind === 'texto'} onClick={() => set({ kind: 'texto' })}>Texto</Chip>
        {n.kind === 'manuscrita' && (
          <Button size="sm" variant="soft" className="ml-auto" onClick={toText} loading={busy}><Sparkles className="h-4 w-4" />Convertir a texto</Button>
        )}
      </div>

      {n.kind === 'manuscrita' ? (
        <>
          <InkCanvas ref={ink} strokes={n.strokes ?? []} height={n.pageHeight ?? 1400} pencilOnly={state.settings.pencilOnly}
            onChange={(strokes, pageHeight) => set({ strokes, pageHeight })} />
          {state.settings.pencilOnly && <p className="mt-1 text-xs text-muted">Modo solo lápiz: el dedo desplaza la hoja y el Apple Pencil escribe. Cámbialo en Ajustes.</p>}
          {n.text && <><SectionTitle>Texto reconocido</SectionTitle><Textarea rows={8} value={n.text} onChange={(e) => set({ text: e.target.value })} /></>}
        </>
      ) : (
        <Textarea rows={18} autoFocus={!n.text} value={n.text} onChange={(e) => set({ text: e.target.value })} placeholder="Escribe aquí…" />
      )}

      {actions.length > 0 && (
        <Card className="mt-4">
          <div className="mb-2 flex items-center justify-between"><p className="font-semibold">Pendientes detectados</p>
            <Button size="sm" onClick={() => {
              setState((s) => ({ ...s, tasks: [...actions.map((a) => ({ id: uid(), title: a, priority: 'media' as const, done: false, due: ymd(), areaId: n.areaId, topic: n.topic, source: 'nota' as const, createdAt: nowIso() })), ...s.tasks] }));
              setActions([]); toast('Agregados a Pendientes', 'ok');
            }}><CheckSquare className="h-4 w-4" />Agregar todos</Button>
          </div>
          <ul className="list-disc pl-5 text-sm">{actions.map((a) => <li key={a}>{a}</li>)}</ul>
        </Card>
      )}

      {(n.photoIds?.length ?? 0) > 0 && (
        <>
          <SectionTitle>Fotos</SectionTitle>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {n.photoIds!.map((p) => <BlobImage key={p} id={p} className="aspect-square w-full rounded-xl object-cover" />)}
          </div>
        </>
      )}
    </div>
  );
}
