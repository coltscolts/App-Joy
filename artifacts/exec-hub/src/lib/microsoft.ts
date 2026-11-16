import type { AccountInfo, PublicClientApplication } from '@azure/msal-browser';
import type { CalendarEvent } from './types';
import { ymdhm } from './util';

// Conexión con Microsoft 365 (Outlook + Teams) vía Microsoft Graph.
// Requiere registrar una app en Entra ID (Azure AD) de la empresa:
//   tipo "Single-page application", redirect URI = <dominio>/oficina/
//   permisos delegados: User.Read, Calendars.ReadWrite, Mail.ReadWrite
// TI de la empresa puede necesitar dar consentimiento.
const SCOPES = ['User.Read', 'Calendars.ReadWrite', 'Mail.ReadWrite'];
let pca: PublicClientApplication | null = null;
let pcaKey = '';

async function client(clientId: string, tenant: string) {
  const key = `${clientId}|${tenant}`;
  if (!pca || pcaKey !== key) {
    const { PublicClientApplication } = await import('@azure/msal-browser');
    pca = new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenant || 'organizations'}`,
        redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
      cache: { cacheLocation: 'localStorage' },
    });
    await pca.initialize();
    pcaKey = key;
  }
  return pca;
}

export async function msAccount(clientId: string, tenant: string): Promise<AccountInfo | null> {
  if (!clientId) return null;
  const c = await client(clientId, tenant);
  return c.getAllAccounts()[0] ?? null;
}

export async function msLogin(clientId: string, tenant: string): Promise<AccountInfo> {
  const c = await client(clientId, tenant);
  const r = await c.loginPopup({ scopes: SCOPES, prompt: 'select_account' });
  return r.account;
}

export async function msLogout(clientId: string, tenant: string) {
  const c = await client(clientId, tenant);
  const account = c.getAllAccounts()[0];
  if (account) await c.logoutPopup({ account });
}

async function token(clientId: string, tenant: string): Promise<string> {
  const c = await client(clientId, tenant);
  const account = c.getAllAccounts()[0];
  if (!account) throw new Error('Conecta tu cuenta de Microsoft');
  try {
    return (await c.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
  } catch {
    return (await c.acquireTokenPopup({ scopes: SCOPES, account })).accessToken;
  }
}

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function graph<T>(clientId: string, tenant: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await token(clientId, tenant)}`,
      'Content-Type': 'application/json',
      Prefer: `outlook.timezone="${tz()}"`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Microsoft Graph ${res.status}`);
  return res.json() as Promise<T>;
}

interface GraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: { displayName?: string };
  onlineMeeting?: { joinUrl?: string } | null;
  attendees?: { emailAddress: { name: string } }[];
}

export async function fetchOutlookEvents(clientId: string, tenant: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const q = new URLSearchParams({
    startDateTime: from.toISOString(),
    endDateTime: to.toISOString(),
    $top: '200',
    $orderby: 'start/dateTime',
    $select: 'id,subject,start,end,location,onlineMeeting,attendees,isCancelled',
  });
  const data = await graph<{ value: (GraphEvent & { isCancelled?: boolean })[] }>(clientId, tenant, `/me/calendarView?${q}`);
  return data.value.filter((e) => !e.isCancelled).map((e) => ({
    id: `ol-${e.id}`,
    title: e.subject || '(sin asunto)',
    start: e.start.dateTime.slice(0, 16),
    end: e.end.dateTime.slice(0, 16),
    location: e.location?.displayName,
    teamsUrl: e.onlineMeeting?.joinUrl ?? null,
    attendees: e.attendees?.map((a) => a.emailAddress.name),
    source: 'outlook' as const,
  }));
}

/** Crea el evento en Outlook; con teams=true genera la liga de Teams. */
export async function createOutlookEvent(
  clientId: string, tenant: string,
  ev: { title: string; start: Date; durationMin: number; body?: string; location?: string; attendeesEmails?: string[]; teams: boolean },
) {
  const end = new Date(ev.start.getTime() + ev.durationMin * 60000);
  const created = await graph<GraphEvent>(clientId, tenant, '/me/events', {
    method: 'POST',
    body: JSON.stringify({
      subject: ev.title,
      body: { contentType: 'text', content: ev.body ?? '' },
      start: { dateTime: ymdhm(ev.start), timeZone: tz() },
      end: { dateTime: ymdhm(end), timeZone: tz() },
      location: ev.location ? { displayName: ev.location } : undefined,
      attendees: (ev.attendeesEmails ?? []).filter((x) => x.includes('@')).map((address) => ({ emailAddress: { address }, type: 'required' })),
      isOnlineMeeting: ev.teams,
      onlineMeetingProvider: ev.teams ? 'teamsForBusiness' : undefined,
      isReminderOn: true,
      reminderMinutesBeforeStart: 10,
    }),
  });
  return { id: created.id, teamsUrl: created.onlineMeeting?.joinUrl ?? null };
}

// ---------- Correo (Outlook) ----------

export interface MailItem { id: string; from: string; fromEmail: string; subject: string; preview: string; received: string; isRead: boolean; webLink?: string }

export async function fetchInbox(clientId: string, tenant: string, top = 25): Promise<MailItem[]> {
  const q = new URLSearchParams({
    $top: String(top),
    $orderby: 'receivedDateTime desc',
    $select: 'id,subject,from,bodyPreview,receivedDateTime,isRead,webLink',
  });
  const data = await graph<{ value: { id: string; subject: string; from?: { emailAddress: { name: string; address: string } }; bodyPreview: string; receivedDateTime: string; isRead: boolean; webLink: string }[] }>(
    clientId, tenant, `/me/mailFolders/inbox/messages?${q}`);
  return data.value.map((m) => ({
    id: m.id, subject: m.subject || '(sin asunto)', from: m.from?.emailAddress.name ?? '', fromEmail: m.from?.emailAddress.address ?? '',
    preview: m.bodyPreview, received: m.receivedDateTime, isRead: m.isRead, webLink: m.webLink,
  }));
}

export async function fetchMailBody(clientId: string, tenant: string, id: string): Promise<string> {
  const m = await graph<{ body: { content: string } }>(clientId, tenant, `/me/messages/${encodeURIComponent(id)}?$select=body`, {
    headers: { Prefer: 'outlook.body-content-type="text"' },
  });
  return m.body.content.slice(0, 30000);
}

const toHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

/** Guarda el correo como BORRADOR en Outlook (no lo envía): tú lo revisas y envías. */
export async function saveDraft(clientId: string, tenant: string, d: { subject: string; body: string; to: string[]; replyToId?: string }) {
  if (d.replyToId) {
    const draft = await graph<{ id: string; webLink: string }>(clientId, tenant, `/me/messages/${encodeURIComponent(d.replyToId)}/createReply`, { method: 'POST', body: '{}' });
    // Antepone la respuesta al hilo citado que Outlook ya puso en el borrador.
    const full = await graph<{ body: { content: string } }>(clientId, tenant, `/me/messages/${encodeURIComponent(draft.id)}?$select=body`);
    await graph(clientId, tenant, `/me/messages/${encodeURIComponent(draft.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: { contentType: 'html', content: `<div>${toHtml(d.body)}</div><br>${full.body.content}` } }),
    });
    return draft.webLink;
  }
  const draft = await graph<{ webLink: string }>(clientId, tenant, '/me/messages', {
    method: 'POST',
    body: JSON.stringify({
      subject: d.subject,
      body: { contentType: 'html', content: toHtml(d.body) },
      toRecipients: d.to.filter((x) => x.includes('@')).map((address) => ({ emailAddress: { address } })),
    }),
  });
  return draft.webLink;
}
