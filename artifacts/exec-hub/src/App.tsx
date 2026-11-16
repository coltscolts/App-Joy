import { useEffect, useState, type ReactNode } from 'react';
import { ClerkProvider, Show, SignIn, useAuth } from '@clerk/react';
import { APP_NAME, APP_TAGLINE } from './config';
import { StoreProvider, useStore } from './lib/store';
import { useRoute } from './lib/router';
import { runEngine, showSystemNotification } from './lib/engine';
import { setTokenGetter } from './lib/api';
import { Layout } from './components/Layout';
import { Button, Input, Modal, ToastProvider, useToast } from './components/ui';
import { TodayPage } from './pages/Today';
import { AgendaPage } from './pages/Agenda';
import { MeetingDetail, MeetingsPage } from './pages/Meetings';
import { TasksPage } from './pages/Tasks';
import { NoteDetail, NotesPage } from './pages/Notes';
import { DashboardDetail, DashboardsPage } from './pages/Dashboards';
import { ProcessesPage } from './pages/Processes';
import { PhotosPage } from './pages/Photos';
import { SettingsPage } from './pages/Settings';
import { EmailPage } from './pages/Email';

function Engine() {
  const { state, ready, setState } = useStore();
  const toast = useToast();
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      let effects: ReturnType<typeof runEngine>['notify'] = [];
      setState((s) => {
        const r = runEngine(s);
        effects = r.notify;
        return r.state;
      });
      // Los efectos se leen después de que React aplica la actualización.
      queueMicrotask(() => effects.forEach((n) => { toast(`${n.title}: ${n.body}`); void showSystemNotification(n.title, n.body, n.tag); }));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    const vis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  void state;
  return null;
}

function Welcome() {
  const { state, setState } = useStore();
  const [name, setName] = useState('');
  if (state.settings.onboarded) return null;
  const done = () => setState((s) => ({ ...s, settings: { ...s.settings, name: name.trim() || s.settings.name, onboarded: true } }));
  return (
    <Modal open onClose={done} title={`Bienvenido a ${APP_NAME}`} footer={<Button onClick={done}>Empezar</Button>}>
      <p className="mb-4 text-muted">{APP_TAGLINE}. Agenda, reuniones con minuta automática, pendientes, notas con Apple Pencil, correos e indicadores en un solo lugar.</p>
      <Input autoFocus placeholder="¿Cómo te llamo?" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && done()} />
      <ul className="mt-4 space-y-1.5 text-sm">
        <li>➕ <b>Captura rápida</b>: dicta “recuérdame…” y la IA lo agenda.</li>
        <li>🎙️ <b>Reuniones</b>: graba y recibe la minuta con acuerdos y responsables.</li>
        <li>📊 <b>Indicadores</b>: sube un Excel y obtén un dashboard.</li>
        <li>🔗 <b>Ajustes</b>: conecta Outlook/Teams y activa avisos.</li>
      </ul>
      <p className="mt-4 text-xs text-muted">Tip: en iPad abre esta página en Safari → Compartir → “Agregar a pantalla de inicio” para usarla como app.</p>
    </Modal>
  );
}

function Routes() {
  const [path] = useRoute();
  const [root, id] = path;
  let page: ReactNode;
  switch (root) {
    case 'agenda': page = <AgendaPage />; break;
    case 'reuniones': page = id ? <MeetingDetail id={id} /> : <MeetingsPage />; break;
    case 'pendientes': page = <TasksPage />; break;
    case 'correos': page = <EmailPage />; break;
    case 'notas': page = id ? <NoteDetail id={id} /> : <NotesPage />; break;
    case 'indicadores': page = id ? <DashboardDetail id={id} /> : <DashboardsPage />; break;
    case 'procesos': page = <ProcessesPage />; break;
    case 'fotos': page = <PhotosPage />; break;
    case 'ajustes': page = <SettingsPage />; break;
    default: page = <TodayPage />;
  }
  return <Layout route={root}>{page}</Layout>;
}

function Shell() {
  const { ready } = useStore();
  if (!ready) return <div className="flex min-h-[100dvh] items-center justify-center bg-bg text-muted">Cargando…</div>;
  return <><Engine /><Welcome /><Routes /></>;
}

function ClerkTokenBridge() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => { setTokenGetter(isSignedIn ? () => getToken() : null); }, [getToken, isSignedIn]);
  return null;
}

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function App() {
  const app = <StoreProvider><ToastProvider><Shell /></ToastProvider></StoreProvider>;
  if (!clerkKey) return app; // modo local / desarrollo sin inicio de sesión
  return (
    <ClerkProvider publishableKey={clerkKey} proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL || undefined}>
      <ClerkTokenBridge />
      <Show when="signed-in">{app}</Show>
      <Show when="signed-out">
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-bg p-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-brand-ink">{APP_NAME[0]}</div>
            <h1 className="text-2xl font-bold">{APP_NAME}</h1>
            <p className="text-muted">{APP_TAGLINE}</p>
          </div>
          <SignIn routing="hash" />
        </div>
      </Show>
    </ClerkProvider>
  );
}
