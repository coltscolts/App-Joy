export type Priority = 'alta' | 'media' | 'baja';

export interface Area {
  id: string;
  name: string; // Dirección / área (p. ej. "Dirección Comercial")
  color: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  areaId?: string | null;
  topic?: string;
  owner?: string; // a quién se delegó
  due?: string | null; // YYYY-MM-DD o YYYY-MM-DDTHH:mm
  remindAt?: string | null; // YYYY-MM-DDTHH:mm local
  reminded?: boolean;
  priority: Priority;
  urgent?: boolean; // para la matriz de Eisenhower
  done: boolean;
  doneAt?: string | null;
  meetingId?: string | null;
  source?: 'manual' | 'minuta' | 'captura' | 'automatizacion' | 'nota';
  createdAt: string;
}

export interface MinutesAction { task: string; owner: string | null; due: string | null; priority: Priority }
export interface Minutes {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actions: MinutesAction[];
  risks: string[];
  openQuestions: string[];
  nextMeeting: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  start: string; // YYYY-MM-DDTHH:mm
  durationMin: number;
  areaId?: string | null;
  topic?: string;
  attendees: string[];
  location?: string;
  agenda?: string;
  notes?: string;
  transcript?: string;
  audioIds: string[]; // segmentos en IndexedDB
  minutes?: Minutes | null;
  inkNoteIds?: string[];
  photoIds?: string[];
  externalId?: string | null; // evento de Outlook
  teamsUrl?: string | null;
  createdAt: string;
}

export interface Stroke { points: [number, number, number][]; color: string; width: number; erase?: boolean }

export interface Note {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  areaId?: string | null;
  topic?: string;
  kind: 'texto' | 'manuscrita';
  text: string;
  strokes?: Stroke[];
  pageHeight?: number;
  meetingId?: string | null;
  photoIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string; // también es la clave del blob
  caption: string;
  date: string;
  areaId?: string | null;
  topic?: string;
  meetingId?: string | null;
  createdAt: string;
}

export type ColumnType = 'number' | 'date' | 'text';
export interface Column { name: string; type: ColumnType }
export type Cell = string | number | null;

export interface Widget {
  id: string;
  type: 'kpi' | 'bar' | 'line' | 'pie' | 'table';
  title: string;
  metric: string | null;
  agg: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy: string | null;
  format: 'number' | 'currency' | 'percent';
  target: number | null;
  why?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  areaId?: string | null;
  datasetName: string;
  columns: Column[];
  rows: Cell[][];
  widgets: Widget[];
  insights: string[];
  filter?: { column: string; value: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type AutomationTrigger = 'daily' | 'weekly' | 'monthly' | 'after_meeting' | 'task_overdue';
export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  day?: number | null; // weekly 0-6, monthly 1-31
  time?: string | null; // HH:mm
  action: 'create_task' | 'notify' | 'evening_review' | 'morning_brief' | 'minutes_to_tasks' | 'overdue_alert';
  text?: string;
  areaId?: string | null;
  lastRun?: string | null;
  builtin?: boolean;
}

export interface ProcessDoc {
  id: string;
  name: string;
  objective: string;
  steps: { step: string; owner: string | null; sla: string | null }[];
  kpis: { name: string; formula: string; target: string | null }[];
  quickWins: string[];
  areaId?: string | null;
  createdAt: string;
}

export interface Settings {
  name: string;
  pencilOnly: boolean; // ignora el dedo en el lienzo (rechazo de palma)
  msClientId: string;
  msTenant: string;
  notifications: boolean;
  appleCalendar: boolean; // leer el Calendario del iPhone/iPad (app nativa)
  appleCalendarIds: string[] | null; // null = todos
  onboarded: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO local YYYY-MM-DDTHH:mm
  end: string;
  location?: string;
  teamsUrl?: string | null;
  source: 'outlook' | 'ics' | 'local' | 'apple';
  notes?: string;
  calendarName?: string;
  allDay?: boolean;
  meetingId?: string;
  attendees?: string[];
}

export interface AppState {
  areas: Area[];
  tasks: Task[];
  meetings: Meeting[];
  notes: Note[];
  photos: Photo[];
  dashboards: Dashboard[];
  automations: Automation[];
  processes: ProcessDoc[];
  importedEvents: CalendarEvent[];
  settings: Settings;
  log: { id: string; at: string; text: string }[];
}
