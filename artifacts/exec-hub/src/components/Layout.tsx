import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, Camera, CalendarDays, CheckSquare, Home, Mail, Menu, Mic, PenLine, Plus, Settings, Workflow } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/config';
import { navigate } from '@/lib/router';
import { useStore } from '@/lib/store';
import { cls } from '@/lib/util';
import { QuickCapture } from './QuickCapture';
import { isOverdue } from '@/lib/engine';

export const NAV = [
  { id: 'hoy', label: 'Hoy', icon: Home },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'reuniones', label: 'Reuniones', icon: Mic },
  { id: 'pendientes', label: 'Pendientes', icon: CheckSquare },
  { id: 'correos', label: 'Correos', icon: Mail },
  { id: 'notas', label: 'Notas', icon: PenLine },
  { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
  { id: 'procesos', label: 'Procesos', icon: Workflow },
  { id: 'fotos', label: 'Fotos', icon: Camera },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
];
const MOBILE = ['hoy', 'agenda', 'reuniones', 'pendientes'];

export function Layout({ route, children }: { route: string; children: ReactNode }) {
  const { state } = useStore();
  const [capture, setCapture] = useState(false);
  const [more, setMore] = useState(false);
  const overdue = state.tasks.filter((t) => isOverdue(t)).length;

  // Atajos de teclado (Mac / iPad con teclado): ⌘K captura rápida, ⌘1…⌘9 secciones.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); setCapture(true); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= NAV.length) { e.preventDefault(); navigate(NAV[n - 1].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-bg text-ink">
      {/* Barra lateral (iPad / escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src={`${import.meta.env.BASE_URL}logo-mark.png`} alt="" className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-line" />
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-wide text-[rgb(var(--brand-dark))]">{APP_NAME.toUpperCase()}</div>
            <div className="text-[11px] text-muted">{APP_TAGLINE}</div>
          </div>
        </div>
        <button onClick={() => setCapture(true)} className="mb-4 flex h-11 items-center gap-2 rounded-xl bg-brand px-3 font-medium text-brand-ink shadow-sm">
          <Plus className="h-5 w-5" />Captura rápida
          <kbd className="ml-auto hidden rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold lg:inline">⌘K</kbd>
        </button>
        <nav className="space-y-0.5">
          {NAV.map((n) => (
            <a key={n.id} href={`#/${n.id}`}
              className={cls('flex h-10 items-center gap-3 rounded-xl px-3 text-[15px]', route === n.id ? 'bg-brand/10 font-semibold text-brand' : 'text-ink/80 hover:bg-ink/5')}>
              <n.icon className="h-[18px] w-[18px]" />{n.label}
              {n.id === 'pendientes' && overdue > 0 && <span className="ml-auto rounded-full bg-bad px-1.5 text-xs font-bold text-white">{overdue}</span>}
            </a>
          ))}
        </nav>
      </aside>

      <div className="md:pl-60">
        <main className="mx-auto max-w-6xl px-4 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-8 md:pb-12 2xl:max-w-7xl">
          {children}
        </main>
      </div>

      {/* Botón flotante de captura (móvil) */}
      <button aria-label="Captura rápida" onClick={() => setCapture(true)}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-xl md:hidden">
        <Plus className="h-7 w-7" />
      </button>

      {/* Barra inferior (iPhone) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.filter((n) => MOBILE.includes(n.id)).map((n) => (
          <a key={n.id} href={`#/${n.id}`} className={cls('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]', route === n.id ? 'text-brand' : 'text-muted')}>
            <n.icon className="h-6 w-6" />{n.label}
          </a>
        ))}
        <button onClick={() => setMore(!more)} className={cls('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]', !MOBILE.includes(route) ? 'text-brand' : 'text-muted')}>
          <Menu className="h-6 w-6" />Más
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-3 w-56 rounded-2xl border border-line bg-surface p-2 shadow-2xl">
            {NAV.filter((n) => !MOBILE.includes(n.id)).map((n) => (
              <button key={n.id} onClick={() => { navigate(n.id); setMore(false); }} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-ink/5">
                <n.icon className="h-5 w-5 text-muted" />{n.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <QuickCapture open={capture} onClose={() => setCapture(false)} />
    </div>
  );
}
