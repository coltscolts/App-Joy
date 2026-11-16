import { useEffect, useRef, useState } from 'react';
import { Bell, Download, LogOut, Plus, Trash2, Upload } from 'lucide-react';
import { APP_NAME } from '@/config';
import { useStore, initialState } from '@/lib/store';
import { msAccount, msLogin, msLogout } from '@/lib/microsoft';
import { aiStatus } from '@/lib/api';
import { AREA_COLORS, download, uid, ymd } from '@/lib/util';
import type { AppState } from '@/lib/types';
import { Button, Card, Field, Input, PageHeader, SectionTitle, useToast } from '@/components/ui';
import { syncOutlook } from './Agenda';

export function SettingsPage() {
  const { state, setState, upsert, remove } = useStore();
  const toast = useToast();
  const s = state.settings;
  const setS = (p: Partial<AppState['settings']>) => setState((x) => ({ ...x, settings: { ...x.settings, ...p } }));
  const [account, setAccount] = useState<string | null>(null);
  const [ai, setAi] = useState<boolean | null>(null);
  const [newArea, setNewArea] = useState('');
  const restore = useRef<HTMLInputElement>(null);

  useEffect(() => { void aiStatus().then(setAi); }, []);
  useEffect(() => {
    msAccount(s.msClientId, s.msTenant).then((a) => setAccount(a?.username ?? null)).catch(() => setAccount(null));
  }, [s.msClientId, s.msTenant]);

  const connect = async () => {
    try {
      const a = await msLogin(s.msClientId, s.msTenant);
      setAccount(a.username);
      const n = await syncOutlook(s.msClientId, s.msTenant, (ev) => setState((x) => ({ ...x, importedEvents: [...x.importedEvents.filter((e) => e.source !== 'outlook'), ...ev] })));
      toast(`Conectado. ${n} eventos sincronizados.`, 'ok');
    } catch (e) { toast((e as Error).message, 'bad'); }
  };

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') { toast('Instala la app en la pantalla de inicio para recibir avisos (Compartir → Agregar a inicio).', 'bad'); return; }
    const p = await Notification.requestPermission();
    setS({ notifications: p === 'granted' });
    toast(p === 'granted' ? 'Avisos activados' : 'Permiso denegado', p === 'granted' ? 'ok' : 'bad');
  };

  const backup = () => download(`${APP_NAME}-respaldo-${ymd()}.json`, JSON.stringify(state), 'application/json');
  const doRestore = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as AppState;
      if (!Array.isArray(data.tasks)) throw new Error('Archivo inválido');
      if (!confirm('Esto reemplaza los datos actuales. ¿Continuar?')) return;
      setState(() => ({ ...initialState(), ...data }));
      toast('Respaldo restaurado', 'ok');
    } catch (e) { toast((e as Error).message, 'bad'); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ajustes" />

      <SectionTitle>Perfil</SectionTitle>
      <Card className="space-y-3">
        <Field label="¿Cómo te llamo?"><Input value={s.name} onChange={(e) => setS({ name: e.target.value })} placeholder="Tu nombre" /></Field>
        <p className="text-sm">Inteligencia artificial: {ai === null ? '…' : ai ? <span className="font-medium text-ok">conectada</span> : <span className="font-medium text-bad">no disponible (revisa la sesión o la configuración del servidor)</span>}</p>
      </Card>

      <SectionTitle>Microsoft 365 · Outlook y Teams</SectionTitle>
      <Card className="space-y-3">
        {account ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">Conectado como <b>{account}</b></p>
            <Button variant="outline" size="sm" onClick={async () => { await msLogout(s.msClientId, s.msTenant); setAccount(null); }}><LogOut className="h-4 w-4" />Desconectar</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">Conecta tu calendario y correo de la empresa: verás tus juntas, podrás crear reuniones con liga de Teams, priorizar tu bandeja y guardar borradores de correo.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID de aplicación (Client ID)" hint="Lo da TI al registrar la app en Entra ID"><Input value={s.msClientId} onChange={(e) => setS({ msClientId: e.target.value.trim() })} placeholder="00000000-0000-…" /></Field>
              <Field label="Tenant" hint="Dominio o ID del tenant"><Input value={s.msTenant} onChange={(e) => setS({ msTenant: e.target.value.trim() })} placeholder="organizations" /></Field>
            </div>
            <Button onClick={connect} disabled={!s.msClientId}>Conectar con Microsoft</Button>
          </>
        )}
        <p className="text-xs text-muted">¿Calendario de iPhone o Google? Exporta un .ics e impórtalo en Agenda. Cada pendiente y reunión se puede agregar al Calendario de Apple con alarma.</p>
      </Card>

      <SectionTitle>Avisos y Apple Pencil</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-medium">Notificaciones</p><p className="text-sm text-muted">Recordatorios, briefing de la mañana y cierre del día.</p></div>
          <Button variant={s.notifications ? 'soft' : 'primary'} size="sm" onClick={enableNotifications}><Bell className="h-4 w-4" />{s.notifications ? 'Activadas' : 'Activar'}</Button>
        </div>
        <label className="flex items-center justify-between gap-3">
          <div><p className="font-medium">Solo Apple Pencil en notas</p><p className="text-sm text-muted">Ignora la palma y el dedo al escribir; el dedo desplaza la hoja.</p></div>
          <input type="checkbox" className="h-6 w-6 accent-[rgb(var(--brand))]" checked={s.pencilOnly} onChange={(e) => setS({ pencilOnly: e.target.checked })} />
        </label>
        <p className="text-xs text-muted">Horarios del briefing y del cierre del día: en Procesos → Automatizaciones.</p>
      </Card>

      <SectionTitle>Áreas y direcciones</SectionTitle>
      <Card className="space-y-2">
        {state.areas.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <input type="color" value={a.color} onChange={(e) => upsert('areas', { ...a, color: e.target.value })} className="h-9 w-9 rounded-lg border border-line bg-transparent" />
            <Input value={a.name} onChange={(e) => upsert('areas', { ...a, name: e.target.value })} />
            <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => confirm(`¿Eliminar ${a.name}?`) && remove('areas', a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Nueva área (p. ej. Dirección de Logística)" />
          <Button variant="soft" disabled={!newArea.trim()} onClick={() => {
            setState((x) => ({ ...x, areas: [...x.areas, { id: uid(), name: newArea.trim(), color: AREA_COLORS[x.areas.length % AREA_COLORS.length] }] }));
            setNewArea('');
          }}><Plus className="h-4 w-4" />Agregar</Button>
        </div>
      </Card>

      <SectionTitle>Tus datos</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-muted">Todo se guarda en este dispositivo (notas, audios, fotos, Excel). La IA solo recibe lo necesario en cada solicitud y el servidor no lo almacena. Haz respaldos periódicos.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={backup}><Download className="h-4 w-4" />Descargar respaldo</Button>
          <Button variant="outline" onClick={() => restore.current?.click()}><Upload className="h-4 w-4" />Restaurar</Button>
          <input ref={restore} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doRestore(e.target.files[0])} />
        </div>
        <p className="text-xs text-muted">El respaldo incluye textos, pendientes, minutas, transcripciones y dashboards; los audios y fotos permanecen en el dispositivo.</p>
      </Card>
    </div>
  );
}
