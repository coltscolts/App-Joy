import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2, X } from 'lucide-react';
import { cls } from '@/lib/util';
import { useStore } from '@/lib/store';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'soft';
export function Button({ variant = 'primary', size = 'md', loading, className, children, ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'icon'; loading?: boolean }) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={cls(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-[15px]',
        size === 'icon' && 'h-10 w-10',
        variant === 'primary' && 'bg-brand text-brand-ink hover:brightness-110 shadow-sm',
        variant === 'soft' && 'bg-brand/10 text-brand hover:bg-brand/15',
        variant === 'ghost' && 'hover:bg-ink/5 text-ink',
        variant === 'outline' && 'border border-line bg-surface hover:bg-ink/5 text-ink',
        variant === 'danger' && 'bg-bad/10 text-bad hover:bg-bad/15',
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cls('rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]', className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const field = 'w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-muted/70';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cls(field, 'h-11', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cls(field, 'py-2.5 leading-relaxed', p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cls(field, 'h-11 pr-8', p.className)} />;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cls('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', !color && 'bg-ink/5 text-muted', className)}
      style={color ? { backgroundColor: `${color}1a`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function Chip({ active, children, onClick, color }: { active?: boolean; children: ReactNode; onClick?: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cls('h-8 shrink-0 rounded-full border px-3 text-sm transition', active ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink hover:bg-ink/5')}
    >
      {color && <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] md:items-center md:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cls('flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-bg shadow-2xl md:rounded-3xl', wide ? 'md:max-w-4xl' : 'md:max-w-lg')}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><X className="h-5 w-5" /></Button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 text-muted">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AreaSelect({ value, onChange, allowEmpty = true }: { value?: string | null; onChange: (id: string | null) => void; allowEmpty?: boolean }) {
  const { state } = useStore();
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">Sin área</option>}
      {state.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </Select>
  );
}

export function AreaBadge({ id }: { id?: string | null }) {
  const { state } = useStore();
  const a = state.areas.find((x) => x.id === id);
  return a ? <Badge color={a.color}>{a.name}</Badge> : null;
}

// ---------- Toasts ----------
interface Toast { id: number; text: string; tone: 'ok' | 'bad' | 'info' }
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className={cls('pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-lg',
            t.tone === 'ok' && 'bg-ok text-white', t.tone === 'bad' && 'bg-bad text-white', t.tone === 'info' && 'bg-ink text-bg')}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>;
}

export function Bullets({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return empty ? <p className="text-sm text-muted">{empty}</p> : null;
  return <ul className="list-disc space-y-1 pl-5 text-[15px]">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}
