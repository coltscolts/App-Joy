import { useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { idb } from '@/lib/idb';
import { fmt } from '@/lib/util';
import type { Photo } from '@/lib/types';
import { AreaBadge, AreaSelect, Badge, Button, Chip, Empty, Field, Input, Modal, PageHeader, SectionTitle } from '@/components/ui';
import { BlobImage, savePhoto } from '@/components/BlobImage';

export function PhotosPage() {
  const { state, upsert, remove, patch } = useStore();
  const [area, setArea] = useState<string | null>(null);
  const [open, setOpen] = useState<Photo | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const add = async (files: FileList) => {
    for (const f of Array.from(files)) upsert('photos', await savePhoto(f, { areaId: area }));
  };

  const groups = useMemo(() => {
    const m = new Map<string, Photo[]>();
    state.photos.filter((p) => !area || p.areaId === area).forEach((p) => m.set(p.date, [...(m.get(p.date) ?? []), p]));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [state.photos, area]);

  return (
    <div>
      <PageHeader title="Fotos" subtitle="Documenta visitas a tienda, planta, pizarrones y evidencias. Organizadas por día y área."
        actions={<>
          <Button variant="outline" onClick={() => gallery.current?.click()}><ImagePlus className="h-4 w-4" />Galería</Button>
          <Button onClick={() => camera.current?.click()}><Camera className="h-4 w-4" />Tomar foto</Button>
        </>} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files && add(e.target.files)} />
      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!area} onClick={() => setArea(null)}>Todas</Chip>
        {state.areas.map((a) => <Chip key={a.id} color={a.color} active={area === a.id} onClick={() => setArea(a.id)}>{a.name}</Chip>)}
      </div>
      {!groups.length ? (
        <Empty icon={<Camera className="h-8 w-8" />} title="Sin fotos" text="Toma fotos en tus recorridos y agrégales nota, área y tema." />
      ) : groups.map(([day, list]) => (
        <section key={day}>
          <SectionTitle>{fmt(day, "EEEE d 'de' MMMM yyyy")}</SectionTitle>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5 lg:grid-cols-6">
            {list.map((p) => (
              <button key={p.id} onClick={() => setOpen(p)} className="relative overflow-hidden rounded-xl">
                <BlobImage id={p.id} className="aspect-square w-full object-cover" />
                {p.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 px-2 pb-1 pt-4 text-left text-xs text-white">{p.caption}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
      {open && (
        <Modal open wide onClose={() => setOpen(null)} title={open.caption || 'Foto'}
          footer={<Button variant="danger" onClick={async () => { await idb.deleteBlob(open.id); remove('photos', open.id); setOpen(null); }}><Trash2 className="h-4 w-4" />Eliminar</Button>}>
          <BlobImage id={open.id} className="mb-3 max-h-[60vh] w-full rounded-xl object-contain" />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Descripción"><Input defaultValue={open.caption} onBlur={(e) => patch('photos', open.id, { caption: e.target.value })} placeholder="Exhibición en sucursal Monterrey" /></Field></div>
            <Field label="Área"><AreaSelect value={open.areaId} onChange={(areaId) => { patch('photos', open.id, { areaId }); setOpen({ ...open, areaId }); }} /></Field>
            <Field label="Tema"><Input defaultValue={open.topic} onBlur={(e) => patch('photos', open.id, { topic: e.target.value })} /></Field>
          </div>
          <div className="mt-2 flex gap-2"><AreaBadge id={open.areaId} />{open.topic && <Badge>#{open.topic}</Badge>}</div>
        </Modal>
      )}
    </div>
  );
}
