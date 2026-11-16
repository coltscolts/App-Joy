import { useState } from 'react';
import type { Meeting } from '@/lib/types';
import { useStore } from '@/lib/store';
import { createOutlookEvent, msAccount } from '@/lib/microsoft';
import { nowIso, toDate, uid, ymd } from '@/lib/util';
import { navigate } from '@/lib/router';
import { AreaSelect, Button, Field, Input, Modal, Select, Textarea, useToast } from './ui';

export function newMeeting(p: Partial<Meeting> = {}): Meeting {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return { id: uid(), title: '', start: `${ymd(d)}T${String(d.getHours()).padStart(2, '0')}:00`, durationMin: 60, attendees: [], audioIds: [], createdAt: nowIso(), ...p };
}

export function MeetingEditor({ meeting, onClose, openAfter = true }: { meeting: Meeting; onClose: () => void; openAfter?: boolean }) {
  const { state, upsert } = useStore();
  const toast = useToast();
  const [m, setM] = useState(meeting);
  const [attendees, setAttendees] = useState(meeting.attendees.join(', '));
  const [outlook, setOutlook] = useState<'no' | 'outlook' | 'teams'>('no');
  const [busy, setBusy] = useState(false);
  const isNew = !state.meetings.some((x) => x.id === meeting.id);
  const { msClientId, msTenant } = state.settings;
  const set = (p: Partial<Meeting>) => setM((s) => ({ ...s, ...p }));

  const save = async () => {
    const list = attendees.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    let next: Meeting = { ...m, title: m.title.trim() || 'Reunión', attendees: list };
    if (outlook !== 'no') {
      setBusy(true);
      try {
        if (!(await msAccount(msClientId, msTenant))) throw new Error('Conecta Microsoft 365 en Ajustes');
        const r = await createOutlookEvent(msClientId, msTenant, {
          title: next.title, start: toDate(next.start)!, durationMin: next.durationMin, body: next.agenda,
          location: next.location, attendeesEmails: list, teams: outlook === 'teams',
        });
        next = { ...next, externalId: r.id, teamsUrl: r.teamsUrl };
        toast(outlook === 'teams' ? 'Creada en Outlook con liga de Teams' : 'Creada en Outlook', 'ok');
      } catch (e) {
        toast((e as Error).message, 'bad');
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    upsert('meetings', next);
    onClose();
    if (isNew && openAfter) navigate(`reuniones/${next.id}`);
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'Nueva reunión' : 'Editar reunión'}
      footer={<Button onClick={save} loading={busy}>Guardar</Button>}>
      <div className="space-y-3">
        <Input autoFocus placeholder="Título (p. ej. Comité de Ventas)" value={m.title} onChange={(e) => set({ title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio"><Input type="datetime-local" value={m.start} onChange={(e) => set({ start: e.target.value })} /></Field>
          <Field label="Duración">
            <Select value={m.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })}>
              {[15, 30, 45, 60, 90, 120, 180, 240].map((n) => <option key={n} value={n}>{n < 60 ? `${n} min` : `${n / 60} h`}</option>)}
            </Select>
          </Field>
          <Field label="Área / Dirección"><AreaSelect value={m.areaId} onChange={(areaId) => set({ areaId })} /></Field>
          <Field label="Tema"><Input value={m.topic ?? ''} onChange={(e) => set({ topic: e.target.value })} placeholder="p. ej. Cierre trimestral" /></Field>
        </div>
        <Field label="Asistentes" hint="Separados por coma. Con correo se invitan desde Outlook.">
          <Input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Ana López, juan@empresa.com" />
        </Field>
        <Field label="Lugar"><Input value={m.location ?? ''} onChange={(e) => set({ location: e.target.value })} placeholder="Sala de consejo / Teams" /></Field>
        <Field label="Agenda / objetivo"><Textarea rows={3} value={m.agenda ?? ''} onChange={(e) => set({ agenda: e.target.value })} /></Field>
        {isNew && msClientId && (
          <Field label="Calendario de Outlook">
            <Select value={outlook} onChange={(e) => setOutlook(e.target.value as typeof outlook)}>
              <option value="no">Solo en esta app</option>
              <option value="outlook">Crear también en Outlook</option>
              <option value="teams">Crear en Outlook con reunión de Teams</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
