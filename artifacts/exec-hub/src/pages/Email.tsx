import { useEffect, useState } from 'react';
import { ClipboardCopy, ClipboardPaste, Inbox, Lightbulb, Mail, RefreshCw, Reply, Save, Send, Sparkles, Wand2 } from 'lucide-react';
import { mailtoUrl, openExternal, outlookComposeUrl } from '@/lib/native';
import { useStore } from '@/lib/store';
import { postAi } from '@/lib/api';
import { fetchInbox, fetchMailBody, msAccount, saveDraft, type MailItem } from '@/lib/microsoft';
import { cls, fmt } from '@/lib/util';
import { minutesToText } from './Meetings';
import { Badge, Bullets, Button, Card, Chip, Field, Input, PageHeader, Select, Spinner, Textarea, useToast } from '@/components/ui';

type Mode = 'new' | 'reply' | 'improve';
type Tone = 'ejecutivo' | 'cordial' | 'firme' | 'breve' | 'agradecimiento';
interface Advice { summary: string; theyAsk: string[]; watchOut: string[]; recommendation: string; approaches: string[] }
interface Triage { summary: string; items: { id: string; category: 'responder_hoy' | 'delegar' | 'informativo' | 'puede_esperar'; reason: string; suggestedAction: string }[] }

const CAT = {
  responder_hoy: { label: 'Responder hoy', color: '#dc2626' },
  delegar: { label: 'Delegar', color: '#ca8a04' },
  informativo: { label: 'Informativo', color: '#2563eb' },
  puede_esperar: { label: 'Puede esperar', color: '#6b7280' },
};

export function EmailPage() {
  const { state } = useStore();
  const toast = useToast();
  const { msClientId, msTenant } = state.settings;
  const [connected, setConnected] = useState(false);
  const [inbox, setInbox] = useState<MailItem[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [triage, setTriage] = useState<Triage | null>(null);
  const [triaging, setTriaging] = useState(false);

  const [mode, setMode] = useState<Mode>('reply');
  const [original, setOriginal] = useState<(MailItem & { body: string }) | null>(null);
  const [to, setTo] = useState('');
  const [tone, setTone] = useState<Tone>('ejecutivo');
  const [instructions, setInstructions] = useState('');
  const [contextId, setContextId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [alts, setAlts] = useState<string[]>([]);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { msAccount(msClientId, msTenant).then((a) => setConnected(!!a)).catch(() => setConnected(false)); }, [msClientId, msTenant]);

  const loadInbox = async () => {
    setLoadingInbox(true);
    try { setInbox(await fetchInbox(msClientId, msTenant)); setTriage(null); } catch (e) { toast((e as Error).message, 'bad'); }
    setLoadingInbox(false);
  };
  useEffect(() => { if (connected) void loadInbox(); }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const runTriage = async () => {
    setTriaging(true);
    try {
      setTriage(await postAi<Triage>('inbox-triage', { emails: inbox.slice(0, 40).map((m) => ({ id: m.id, from: `${m.from} <${m.fromEmail}>`, subject: m.subject, preview: m.preview.slice(0, 400), received: m.received })) }));
    } catch (e) { toast((e as Error).message, 'bad'); }
    setTriaging(false);
  };

  const replyTo = async (m: MailItem) => {
    try {
      const full = await fetchMailBody(msClientId, msTenant, m.id);
      setOriginal({ ...m, body: full });
      setMode('reply');
      setTo(m.fromEmail);
      setSubject(`RE: ${m.subject}`);
      setBody('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { toast((e as Error).message, 'bad'); }
  };

  // Correo copiado desde Outlook/Correo: intenta detectar remitente y asunto.
  const usePasted = (text: string) => {
    setPasted(text);
    const from = text.match(/^(?:De|From)\s*:\s*(.+)$/im)?.[1]?.trim() ?? '';
    const subj = text.match(/^(?:Asunto|Subject)\s*:\s*(.+)$/im)?.[1]?.trim() ?? '';
    const email = from.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? '';
    setOriginal(text.trim() ? { id: '', from, fromEmail: email, subject: subj, preview: '', received: '', isRead: true, body: text } : null);
    if (email && !to) setTo(email);
    if (subj) setSubject(/^re:/i.test(subj) ? subj : `RE: ${subj}`);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error('vacío');
      usePasted(text);
      toast('Correo pegado', 'ok');
    } catch {
      toast('No pude leer el portapapeles: mantén presionado el cuadro y elige Pegar.', 'bad');
    }
  };

  const contextText = () => {
    if (!contextId) return undefined;
    const [kind, id] = contextId.split(':');
    if (kind === 'm') {
      const m = state.meetings.find((x) => x.id === id);
      return m ? (minutesToText(m) || `${m.title}\n${m.notes ?? ''}`) : undefined;
    }
    const t = state.tasks.find((x) => x.id === id);
    return t ? `Pendiente: ${t.title}${t.owner ? ` (responsable ${t.owner})` : ''}${t.due ? `, fecha ${t.due}` : ''}. ${t.notes ?? ''}` : undefined;
  };

  const generate = async (approach?: string) => {
    setBusy(true);
    try {
      const r = await postAi<{ subject: string; body: string; alternatives: string[]; advice: Advice | null }>('email', {
        mode, tone, instructions: approach ? `${instructions}\nEnfoque elegido: ${approach}`.trim() : instructions, to, senderName: state.settings.name || undefined,
        draft: mode === 'improve' ? body : undefined,
        original: mode === 'reply' && original ? { from: `${original.from} <${original.fromEmail}>`, subject: original.subject, body: original.body } : undefined,
        context: contextText(),
      });
      setSubject(mode === 'reply' && original?.subject ? (/^re:/i.test(original.subject) ? original.subject : `RE: ${original.subject}`) : r.subject);
      setBody(r.body);
      setAlts(r.alternatives);
      if (r.advice && !approach) setAdvice(r.advice);
    } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(false);
  };

  const toOutlook = async () => {
    setSaving(true);
    try {
      const link = await saveDraft(msClientId, msTenant, { subject, body, to: to.split(/[,;\s]+/).filter(Boolean), replyToId: mode === 'reply' ? original?.id : undefined });
      toast('Guardado en Borradores de Outlook. Revísalo y envíalo desde ahí.', 'ok');
      if (link && confirm('¿Abrir el borrador en Outlook?')) window.open(link, '_blank');
    } catch (e) { toast((e as Error).message, 'bad'); }
    setSaving(false);
  };

  const sorted = triage
    ? [...inbox].sort((a, b) => {
      const order = ['responder_hoy', 'delegar', 'informativo', 'puede_esperar'];
      const ca = triage.items.find((i) => i.id === a.id)?.category ?? 'puede_esperar';
      const cb = triage.items.find((i) => i.id === b.id)?.category ?? 'puede_esperar';
      return order.indexOf(ca) - order.indexOf(cb);
    })
    : inbox;

  return (
    <div>
      <PageHeader title="Correos" subtitle="Pega un correo y la IA te asesora y redacta la mejor respuesta. Ábrela en Outlook lista para enviar." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="space-y-3 lg:col-span-3">
          <div className="flex flex-wrap gap-2">
            <Chip active={mode === 'new'} onClick={() => { setMode('new'); setOriginal(null); }}>✉️ Nuevo</Chip>
            <Chip active={mode === 'reply'} onClick={() => setMode('reply')}>↩︎ Responder</Chip>
            <Chip active={mode === 'improve'} onClick={() => setMode('improve')}>✨ Mejorar mi borrador</Chip>
          </div>
          {mode === 'reply' && (original?.id ? (
            <div className="rounded-xl bg-ink/[.04] p-3 text-sm">
              <p className="font-semibold">{original.subject}</p>
              <p className="text-muted">De {original.from} · {fmt(original.received, 'd MMM HH:mm')}</p>
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap">{original.body}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-muted">Correo que quieres responder</span>
                <Button size="sm" variant="soft" onClick={pasteFromClipboard}><ClipboardPaste className="h-4 w-4" />Pegar correo</Button>
              </div>
              <Textarea rows={5} value={pasted} onChange={(e) => usePasted(e.target.value)}
                placeholder="En Outlook o Correo: abre el mensaje, mantén presionado el texto → Seleccionar todo → Copiar. Luego toca «Pegar correo»." />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Para"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="correo@empresa.com" /></Field>
            <Field label="Tono">
              <Select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="ejecutivo">Ejecutivo</option><option value="cordial">Cordial</option><option value="firme">Firme</option><option value="breve">Muy breve</option><option value="agradecimiento">Agradecimiento</option>
              </Select>
            </Field>
          </div>
          <Field label="¿Qué quieres decir?">
            <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)}
              placeholder="p. ej. Pedir a Ventas el cierre de octubre por sucursal antes del jueves y agradecer el esfuerzo del equipo" />
          </Field>
          <Field label="Usar como contexto (opcional)">
            <Select value={contextId} onChange={(e) => setContextId(e.target.value)}>
              <option value="">Ninguno</option>
              <optgroup label="Minutas">{state.meetings.filter((m) => m.minutes).slice(0, 20).map((m) => <option key={m.id} value={`m:${m.id}`}>{m.title} · {fmt(m.start, 'd MMM')}</option>)}</optgroup>
              <optgroup label="Pendientes">{state.tasks.filter((t) => !t.done).slice(0, 30).map((t) => <option key={t.id} value={`t:${t.id}`}>{t.title}</option>)}</optgroup>
            </Select>
          </Field>
          <Button onClick={() => generate()} loading={busy} className="w-full" disabled={(mode === 'improve' && !body.trim()) || (mode === 'reply' && !original?.body.trim())}>
            {mode === 'improve' ? <Wand2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {mode === 'improve' ? 'Mejorar redacción' : mode === 'reply' ? 'Analizar y redactar respuesta' : 'Redactar correo'}
          </Button>

          {mode === 'reply' && advice && (
            <div className="rounded-2xl border border-brand/25 bg-brand/[.05] p-4">
              <p className="mb-2 flex items-center gap-2 font-semibold"><Lightbulb className="h-5 w-5 text-brand" />Asesoría</p>
              {advice.summary && <p className="mb-3 text-[15px]">{advice.summary}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {advice.theyAsk.length > 0 && <div><p className="mb-1 text-xs font-semibold uppercase text-muted">Te piden</p><Bullets items={advice.theyAsk} /></div>}
                {advice.watchOut.length > 0 && <div><p className="mb-1 text-xs font-semibold uppercase text-bad">Cuidado con</p><Bullets items={advice.watchOut} /></div>}
              </div>
              {advice.recommendation && <p className="mt-3 text-[15px]"><b>Recomendación:</b> {advice.recommendation}</p>}
              {advice.approaches.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted">Probar otro enfoque</p>
                  <div className="flex flex-wrap gap-2">{advice.approaches.map((a) => <Chip key={a} onClick={() => generate(a)}>{a}</Chip>)}</div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-line pt-3">
            <Input className="mb-2 font-semibold" placeholder="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea rows={12} placeholder="Aquí aparece el correo. Puedes editarlo." value={body} onChange={(e) => setBody(e.target.value)} />
            {alts.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{alts.map((a) => <Chip key={a} onClick={() => setBody(`${a}\n\n${body.split('\n').slice(1).join('\n')}`)}>{a}</Chip>)}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {connected && <Button onClick={toOutlook} loading={saving} disabled={!body.trim()}><Save className="h-4 w-4" />Guardar borrador en Outlook</Button>}
              <Button variant={connected ? 'outline' : 'primary'} disabled={!body.trim()} onClick={() => openExternal(outlookComposeUrl(to, subject, body))}><Send className="h-4 w-4" />Abrir en Outlook</Button>
              <Button variant="outline" disabled={!body.trim()} onClick={() => openExternal(mailtoUrl(to, subject, body))}><Mail className="h-4 w-4" />Abrir en Correo</Button>
              <Button variant="ghost" disabled={!body.trim()} onClick={() => { void navigator.clipboard.writeText(body); toast('Respuesta copiada', 'ok'); }}><ClipboardCopy className="h-4 w-4" />Copiar</Button>
            </div>
            {mode === 'reply' && body && !connected && (
              <p className="mt-2 text-xs text-muted">«Abrir en Outlook» crea un mensaje nuevo con asunto RE:. Para mantener el hilo, toca «Copiar» y pégalo en Responder dentro de Outlook.</p>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 font-semibold"><Inbox className="h-5 w-5 text-brand" />Bandeja de Outlook</div>
              {connected && (
                <div className="flex gap-1">
                  <Button size="sm" variant="soft" onClick={runTriage} loading={triaging} disabled={!inbox.length}><Sparkles className="h-4 w-4" />Priorizar</Button>
                  <Button size="icon" variant="ghost" aria-label="Actualizar" onClick={loadInbox}><RefreshCw className={cls('h-4 w-4', loadingInbox && 'animate-spin')} /></Button>
                </div>
              )}
            </div>
            {!connected ? (
              <div className="p-5 text-sm text-muted">
                <Mail className="mb-2 h-7 w-7" />
                <p className="mb-2 font-medium text-ink">Sin pedir nada a Sistemas:</p>
                <ol className="mb-3 list-decimal space-y-1 pl-5">
                  <li>En Outlook, abre el correo y copia su texto.</li>
                  <li>Aquí elige <b>Responder</b> → <b>Pegar correo</b>.</li>
                  <li>Lee la asesoría, ajusta y toca <b>Abrir en Outlook</b>: la respuesta queda lista para enviar.</li>
                </ol>
                Si Sistemas autoriza la conexión con Microsoft 365 (Ajustes), aquí verás tu bandeja priorizada por IA.
              </div>
            ) : loadingInbox && !inbox.length ? <div className="p-4"><Spinner label="Cargando correos…" /></div> : (
              <>
                {triage?.summary && <p className="border-b border-line bg-brand/[.05] px-4 py-3 text-sm">{triage.summary}</p>}
                <div className="max-h-[70vh] divide-y divide-line overflow-y-auto">
                  {sorted.map((m) => {
                    const t = triage?.items.find((i) => i.id === m.id);
                    return (
                      <div key={m.id} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={cls('truncate text-sm', !m.isRead && 'font-semibold')}>{m.from}</p>
                            <p className="truncate text-sm">{m.subject}</p>
                            <p className="line-clamp-2 text-xs text-muted">{m.preview}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted">{fmt(m.received, 'd MMM')}</span>
                        </div>
                        {t && <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs"><Badge color={CAT[t.category].color}>{CAT[t.category].label}</Badge><span className="text-muted">{t.suggestedAction}</span></div>}
                        <Button size="sm" variant="ghost" className="-ml-2 mt-1" onClick={() => replyTo(m)}><Reply className="h-4 w-4" />Responder con IA</Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
