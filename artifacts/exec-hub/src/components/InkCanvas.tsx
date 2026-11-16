import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser, Highlighter, Pen, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import type { Stroke } from '@/lib/types';
import { cls } from '@/lib/util';

// Lienzo para Apple Pencil: presión, rechazo de palma (solo lápiz), borrador,
// resaltador y hoja rayada. Coordenadas lógicas en ancho 1000 para que la nota
// se vea igual en vertical, horizontal, iPad o iPhone.
const W = 1000;
const LINE_GAP = 40;
const COLORS = ['#111827', '#1d4ed8', '#dc2626', '#16a34a'];

export interface InkHandle { toPng: () => Promise<Blob | null> }

interface Props {
  strokes: Stroke[];
  height: number;
  pencilOnly: boolean;
  onChange: (strokes: Stroke[], height: number) => void;
}

type Tool = 'pen' | 'marker' | 'eraser';

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, scale: number) {
  const pts = s.points;
  if (!pts.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = s.color;
  if (s.color.length === 9) ctx.globalCompositeOperation = 'multiply'; // resaltador con alfa
  if (pts.length === 1) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(pts[0][0] * scale, pts[0][1] * scale, (s.width * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, p0] = pts[i - 1];
    const [x1, y1, p1] = pts[i];
    ctx.lineWidth = Math.max(0.6, s.width * scale * (0.35 + ((p0 + p1) / 2) * 0.9));
    ctx.beginPath();
    const mx0 = i > 1 ? (pts[i - 2][0] + x0) / 2 : x0;
    const my0 = i > 1 ? (pts[i - 2][1] + y0) / 2 : y0;
    ctx.moveTo(mx0 * scale, my0 * scale);
    ctx.quadraticCurveTo(x0 * scale, y0 * scale, ((x0 + x1) / 2) * scale, ((y0 + y1) / 2) * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function paper(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let y = LINE_GAP * 2; y < h / scale; y += LINE_GAP) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(w, y * scale);
    ctx.stroke();
  }
  ctx.strokeStyle = '#fecaca';
  ctx.beginPath();
  ctx.moveTo(70 * scale, 0);
  ctx.lineTo(70 * scale, h);
  ctx.stroke();
}

export const InkCanvas = forwardRef<InkHandle, Props>(function InkCanvas({ strokes, height, pencilOnly, onChange }, ref) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(800);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(3);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const live = useRef<Stroke | null>(null);
  const data = useRef({ strokes, height });
  data.current = { strokes, height };
  const scale = width / W;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const render = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const h = height * scale;
    if (c.width !== Math.round(width * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(h * dpr);
      c.style.height = `${h}px`;
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paper(ctx, width, h, scale);
    for (const s of data.current.strokes) drawStroke(ctx, s, scale);
    if (live.current) drawStroke(ctx, live.current, scale);
  }, [width, height, scale]);

  useEffect(render, [render, strokes]);

  // En modo "solo lápiz" los dedos desplazan la hoja y el lápiz dibuja (iOS: touchType = stylus).
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const block = (e: TouchEvent) => {
      const stylus = Array.from(e.touches).some((t) => (t as Touch & { touchType?: string }).touchType === 'stylus');
      if (stylus || !pencilOnly) e.preventDefault();
    };
    c.addEventListener('touchstart', block, { passive: false });
    c.addEventListener('touchmove', block, { passive: false });
    return () => { c.removeEventListener('touchstart', block); c.removeEventListener('touchmove', block); };
  }, [pencilOnly]);

  const pos = (e: React.PointerEvent): [number, number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    const p = e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5;
    return [Math.round(((e.clientX - r.left) / scale) * 10) / 10, Math.round(((e.clientY - r.top) / scale) * 10) / 10, Math.round(p * 100) / 100];
  };

  const eraseAt = (x: number, y: number) => {
    const R = 14;
    const next = data.current.strokes.filter((s) => !s.points.some(([px, py]) => Math.abs(px - x) < R && Math.abs(py - y) < R));
    if (next.length !== data.current.strokes.length) onChange(next, data.current.height);
  };

  const down = (e: React.PointerEvent) => {
    if (pencilOnly && e.pointerType === 'touch') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y, p] = pos(e);
    // El botón lateral / goma del lápiz (buttons 32) borra.
    if (tool === 'eraser' || e.buttons === 32) { eraseAt(x, y); return; }
    live.current = {
      points: [[x, y, p]],
      color: tool === 'marker' ? `${color === COLORS[0] ? '#facc15' : color}66` : color,
      width: tool === 'marker' ? 22 : size,
    };
    render();
  };

  const move = (e: React.PointerEvent) => {
    if (pencilOnly && e.pointerType === 'touch') return;
    if (e.buttons === 0) return;
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
    if (tool === 'eraser' || e.buttons === 32) {
      const [x, y] = pos(e);
      eraseAt(x, y);
      return;
    }
    if (!live.current) return;
    for (const ev of events) live.current.points.push(pos(ev as unknown as React.PointerEvent));
    render();
  };

  const up = () => {
    if (!live.current) return;
    const s = live.current;
    live.current = null;
    const maxY = Math.max(...s.points.map((p) => p[1]));
    // Al escribir cerca del final la hoja crece sola.
    const h = maxY > data.current.height - 200 ? data.current.height + 600 : data.current.height;
    setRedo([]);
    onChange([...data.current.strokes, s], h);
  };

  useImperativeHandle(ref, () => ({
    toPng: () => new Promise((resolve) => {
      const all = data.current.strokes;
      if (!all.length) return resolve(null);
      const maxY = Math.min(data.current.height, Math.max(...all.flatMap((s) => s.points.map((p) => p[1]))) + 60);
      const out = document.createElement('canvas');
      const k = 1.2; // ~1200 px de ancho, suficiente para leer letra a mano
      out.width = W * k;
      out.height = Math.max(200, maxY * k);
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      for (const s of all) drawStroke(ctx, s, k);
      out.toBlob((b) => resolve(b), 'image/png');
    }),
  }));

  const ToolBtn = ({ t, icon: I, label }: { t: Tool; icon: typeof Pen; label: string }) => (
    <button aria-label={label} onClick={() => setTool(t)} className={cls('flex h-10 w-10 items-center justify-center rounded-xl', tool === t ? 'bg-brand text-brand-ink' : 'hover:bg-ink/5')}>
      <I className="h-5 w-5" />
    </button>
  );

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-2 flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface/95 p-1 backdrop-blur">
        <ToolBtn t="pen" icon={Pen} label="Pluma" />
        <ToolBtn t="marker" icon={Highlighter} label="Resaltador" />
        <ToolBtn t="eraser" icon={Eraser} label="Borrador" />
        <div className="mx-1 h-6 w-px bg-line" />
        {COLORS.map((c) => (
          <button key={c} aria-label="Color" onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
            className={cls('h-7 w-7 rounded-full border-2', color === c ? 'border-brand' : 'border-transparent')} style={{ background: c }} />
        ))}
        <div className="mx-1 h-6 w-px bg-line" />
        {[2, 3, 5].map((w) => (
          <button key={w} aria-label={`Grosor ${w}`} onClick={() => setSize(w)} className={cls('flex h-9 w-9 items-center justify-center rounded-xl', size === w && 'bg-ink/10')}>
            <span className="rounded-full bg-ink" style={{ width: w * 2 + 2, height: w * 2 + 2 }} />
          </button>
        ))}
        <div className="flex-1" />
        <button aria-label="Deshacer" disabled={!strokes.length} onClick={() => { setRedo([...redo, strokes[strokes.length - 1]]); onChange(strokes.slice(0, -1), height); }} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-ink/5 disabled:opacity-30"><Undo2 className="h-5 w-5" /></button>
        <button aria-label="Rehacer" disabled={!redo.length} onClick={() => { onChange([...strokes, redo[redo.length - 1]], height); setRedo(redo.slice(0, -1)); }} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-ink/5 disabled:opacity-30"><Redo2 className="h-5 w-5" /></button>
        <button aria-label="Borrar todo" onClick={() => confirm('¿Borrar toda la hoja?') && onChange([], 1400)} className="flex h-10 w-10 items-center justify-center rounded-xl text-bad hover:bg-bad/10"><Trash2 className="h-5 w-5" /></button>
      </div>
      <div ref={wrap} className="overflow-hidden rounded-2xl border border-line shadow-sm">
        <canvas
          ref={canvas}
          className="block w-full"
          style={{ touchAction: pencilOnly ? 'pan-y' : 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <button onClick={() => onChange(strokes, height + 800)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-line py-2 text-sm text-muted">
        <Plus className="h-4 w-4" />Más hoja
      </button>
    </div>
  );
});
