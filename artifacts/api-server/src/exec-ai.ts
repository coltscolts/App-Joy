import { toFile } from "openai";
import { z } from "zod/v4";
import { getOpenAI } from "./openai";

// IA de la oficina ejecutiva: minutas, briefing del día, captura inteligente,
// dashboards a partir de Excel, procesos y notas manuscritas.
// El modelo se puede subir de nivel sin tocar código con EXEC_AI_MODEL
// (p. ej. un modelo más potente para minutas y análisis).
const EXEC_MODEL = () => process.env.EXEC_AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const TRANSCRIBE_MODEL = () => process.env.EXEC_TRANSCRIBE_MODEL || "gpt-4o-transcribe";

export const MAX_AUDIO_BYTES = 24 * 1024 * 1024; // límite de la API de transcripción ≈25 MB
export const MAX_INK_BASE64 = 6 * 1024 * 1024;

async function jsonCompletion<T>(system: string, user: string, schema: z.ZodType<T>, temperature = 0.3): Promise<T> {
  const completion = await getOpenAI().chat.completions.create({
    model: EXEC_MODEL(),
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = completion.choices[0]?.message.content ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return schema.parse(JSON.parse(match ? match[0] : text));
}

const SYSTEM_BASE =
  "Eres el jefe de gabinete (chief of staff) de un alto ejecutivo de una empresa industrial mexicana. " +
  "Escribes en español de México, directo, ejecutivo y sin relleno. Nunca inventes datos, cifras, nombres ni fechas que no estén en la información recibida. " +
  "Responde SIEMPRE con un único objeto JSON válido.";

// ---------- Transcripción ----------

export async function transcribeAudio(buffer: Buffer, mimeType: string, prompt?: string): Promise<string> {
  const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a"
    : mimeType.includes("webm") ? "webm"
    : mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3"
    : "m4a";
  const file = await toFile(buffer, `reunion.${ext}`, { type: mimeType || "audio/mp4" });
  const result = await getOpenAI().audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL(),
    language: "es",
    ...(prompt ? { prompt: prompt.slice(0, 800) } : {}),
  });
  return (result as { text?: string }).text ?? "";
}

// ---------- Minuta ----------

export const minutesInputSchema = z.object({
  title: z.string().max(300).default("Reunión"),
  date: z.string().max(40).optional(),
  area: z.string().max(120).optional(),
  attendees: z.array(z.string().max(120)).max(60).default([]),
  agenda: z.string().max(4000).optional(),
  notes: z.string().max(20000).optional(),
  transcript: z.string().max(400000).default(""),
});

const actionSchema = z.object({
  task: z.string(),
  owner: z.string().nullable().optional().transform((v) => v || null),
  due: z.string().nullable().optional().transform((v) => v || null),
  priority: z.enum(["alta", "media", "baja"]).catch("media"),
});

export const minutesSchema = z.object({
  summary: z.string().catch(""),
  keyPoints: z.array(z.string()).catch([]),
  decisions: z.array(z.string()).catch([]),
  actions: z.array(actionSchema).catch([]),
  risks: z.array(z.string()).catch([]),
  openQuestions: z.array(z.string()).catch([]),
  nextMeeting: z.string().nullable().catch(null),
});
export type Minutes = z.infer<typeof minutesSchema>;

export async function generateMinutes(input: z.infer<typeof minutesInputSchema>): Promise<Minutes> {
  if (!input.transcript.trim() && !input.notes?.trim()) {
    throw new Error("Sin transcripción ni notas");
  }
  const user = `Elabora la minuta ejecutiva de esta reunión.
Título: ${input.title}
Fecha: ${input.date ?? "no indicada"}
Área / Dirección: ${input.area ?? "no indicada"}
Asistentes: ${input.attendees.join(", ") || "no indicados"}
Agenda: ${input.agenda || "no indicada"}

Notas del ejecutivo:
${input.notes || "(sin notas)"}

Transcripción:
${input.transcript || "(sin transcripción)"}

Devuelve JSON con este formato exacto:
{
  "summary": "Resumen ejecutivo en 3-5 líneas",
  "keyPoints": ["Puntos tratados"],
  "decisions": ["Acuerdos tomados (solo los explícitos)"],
  "actions": [{"task": "Acción concreta con verbo", "owner": "Responsable o null", "due": "YYYY-MM-DD si se mencionó, o null", "priority": "alta|media|baja"}],
  "risks": ["Riesgos o alertas detectados"],
  "openQuestions": ["Temas pendientes de definir"],
  "nextMeeting": "Fecha/tema de seguimiento si se acordó, o null"
}
Si la fecha de una acción es relativa ("el viernes"), conviértela usando la fecha de la reunión.`;
  return jsonCompletion(SYSTEM_BASE, user, minutesSchema, 0.2);
}

// ---------- Briefing de la mañana / cierre del día ----------

export const briefInputSchema = z.object({
  mode: z.enum(["morning", "evening"]),
  now: z.string().max(40),
  name: z.string().max(80).optional(),
  tasks: z.array(z.object({
    title: z.string().max(300),
    due: z.string().max(40).nullable().optional(),
    priority: z.string().max(20).optional(),
    area: z.string().max(120).optional(),
    done: z.boolean().optional(),
    doneToday: z.boolean().optional(),
  })).max(300),
  events: z.array(z.object({
    title: z.string().max(300),
    start: z.string().max(40),
    end: z.string().max(40).optional(),
    area: z.string().max(120).optional(),
  })).max(100),
});

export const briefSchema = z.object({
  headline: z.string().catch(""),
  priorities: z.array(z.string()).catch([]),
  watchOut: z.array(z.string()).catch([]),
  tomorrow: z.array(z.string()).catch([]),
  delegate: z.array(z.string()).catch([]),
  message: z.string().catch(""),
});

export async function generateBrief(input: z.infer<typeof briefInputSchema>) {
  const isEvening = input.mode === "evening";
  const user = `${isEvening ? "Haz el CIERRE DEL DÍA" : "Haz el BRIEFING DE LA MAÑANA"} para ${input.name || "el ejecutivo"}.
Fecha y hora actual: ${input.now}
Pendientes (JSON): ${JSON.stringify(input.tasks)}
Agenda (JSON): ${JSON.stringify(input.events)}

${isEvening
    ? "Resume qué se logró hoy, qué quedó pendiente, qué está vencido y qué debe preparar para mañana. Sugiere qué delegar."
    : "Define las 3 prioridades del día, alertas (vencidos, choques de agenda, reuniones sin preparación) y qué delegar."}
Formato JSON:
{"headline": "Una frase", "priorities": ["máx 3"], "watchOut": ["alertas"], "tomorrow": ["para mañana (solo en cierre)"], "delegate": ["qué delegar y a quién si se sabe"], "message": "Mensaje breve y motivador, 2 líneas"}`;
  return jsonCompletion(SYSTEM_BASE, user, briefSchema, 0.4);
}

// ---------- Captura inteligente ("recuérdame...") ----------

export const captureInputSchema = z.object({
  text: z.string().min(1).max(2000),
  now: z.string().max(40),
  areas: z.array(z.string().max(120)).max(50).default([]),
});

export const captureSchema = z.object({
  items: z.array(z.object({
    kind: z.enum(["task", "meeting", "note"]).catch("task"),
    title: z.string(),
    due: z.string().nullable().catch(null),
    remindAt: z.string().nullable().catch(null),
    start: z.string().nullable().catch(null),
    durationMin: z.number().nullable().catch(null),
    area: z.string().nullable().catch(null),
    priority: z.enum(["alta", "media", "baja"]).catch("media"),
    notes: z.string().nullable().catch(null),
  })).catch([]),
});

export async function parseCapture(input: z.infer<typeof captureInputSchema>) {
  const user = `Convierte este dictado en elementos de agenda. Ahora es ${input.now} (hora local de México).
Áreas/direcciones disponibles: ${input.areas.join(", ") || "ninguna"} (usa exactamente uno de esos nombres o null).
Texto: """${input.text}"""

Reglas: "recuérdame"/"pendiente"/"llamar"/"enviar" = task; "junta"/"reunión"/"cita" con hora = meeting; ideas o información = note.
Fechas en formato local ISO sin zona: "YYYY-MM-DDTHH:mm". Si piden recordatorio sin hora usa 09:00. Puede haber varios elementos.
JSON: {"items":[{"kind":"task|meeting|note","title":"","due":null,"remindAt":null,"start":null,"durationMin":null,"area":null,"priority":"alta|media|baja","notes":null}]}`;
  return jsonCompletion(SYSTEM_BASE, user, captureSchema, 0.1);
}

// ---------- Dashboards desde Excel ----------

export const dashboardInputSchema = z.object({
  goal: z.string().max(2000).default(""),
  datasetName: z.string().max(200).default("Datos"),
  rowCount: z.number().int().nonnegative(),
  columns: z.array(z.object({
    name: z.string().max(200),
    type: z.enum(["number", "date", "text"]),
    sample: z.array(z.union([z.string(), z.number(), z.null()])).max(8),
    distinct: z.number().optional(),
    min: z.union([z.number(), z.string()]).nullable().optional(),
    max: z.union([z.number(), z.string()]).nullable().optional(),
    sum: z.number().nullable().optional(),
  })).min(1).max(80),
});

const widgetSchema = z.object({
  type: z.enum(["kpi", "bar", "line", "pie", "table"]),
  title: z.string(),
  metric: z.string().nullable().catch(null),
  agg: z.enum(["sum", "avg", "count", "min", "max"]).catch("sum"),
  groupBy: z.string().nullable().catch(null),
  format: z.enum(["number", "currency", "percent"]).catch("number"),
  target: z.number().nullable().catch(null),
  why: z.string().catch(""),
});

export const dashboardSchema = z.object({
  title: z.string().catch("Dashboard"),
  widgets: z.array(widgetSchema).catch([]),
  insights: z.array(z.string()).catch([]),
});

export async function designDashboard(input: z.infer<typeof dashboardInputSchema>) {
  const names = input.columns.map((c) => c.name);
  const user = `Diseña un dashboard de indicadores (KPIs) para un director a partir de esta tabla.
Objetivo del usuario: ${input.goal || "el que mejor sirva para tomar decisiones"}
Tabla "${input.datasetName}" con ${input.rowCount} filas. Columnas (con tipo, muestra y estadísticas):
${JSON.stringify(input.columns)}

Reglas:
- Usa SOLO estos nombres de columna exactos: ${JSON.stringify(names)}.
- "metric" debe ser columna numérica (o null si agg = "count"). "groupBy" una columna de texto o fecha (null en kpi).
- Entre 4 y 8 widgets: primero 2-4 "kpi", luego gráficas. "line" solo si groupBy es fecha.
- "insights": 3-5 observaciones basadas ÚNICAMENTE en las estadísticas recibidas; no inventes cifras.
JSON: {"title":"","widgets":[{"type":"kpi|bar|line|pie|table","title":"","metric":null,"agg":"sum|avg|count|min|max","groupBy":null,"format":"number|currency|percent","target":null,"why":"para qué sirve"}],"insights":[""]}`;
  const result = await jsonCompletion(SYSTEM_BASE, user, dashboardSchema, 0.3);
  // Descarta columnas que no existen para que la app nunca falle al pintar.
  result.widgets = result.widgets.filter((w) =>
    (w.metric === null || names.includes(w.metric)) && (w.groupBy === null || names.includes(w.groupBy)),
  );
  return result;
}

export const askDataInputSchema = z.object({
  question: z.string().min(1).max(2000),
  datasetName: z.string().max(200).default("Datos"),
  columns: dashboardInputSchema.shape.columns,
  rowCount: z.number().int().nonnegative(),
  // Agregados calculados en el dispositivo (la IA no recibe la tabla completa).
  aggregates: z.record(z.string(), z.unknown()).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).max(400).optional(),
});

export async function askData(input: z.infer<typeof askDataInputSchema>) {
  const user = `Pregunta del director sobre la tabla "${input.datasetName}" (${input.rowCount} filas): ${input.question}
Columnas: ${JSON.stringify(input.columns)}
Agregados: ${JSON.stringify(input.aggregates ?? {})}
Filas (muestra o total): ${JSON.stringify(input.rows ?? [])}
Responde con base solo en estos datos; si no alcanzan, dilo y sugiere qué columna falta.
JSON: {"answer":"respuesta ejecutiva en 2-6 líneas","followUps":["preguntas sugeridas"]}`;
  return jsonCompletion(SYSTEM_BASE, user, z.object({ answer: z.string().catch(""), followUps: z.array(z.string()).catch([]) }), 0.2);
}

// ---------- Procesos y automatización ----------

export const processInputSchema = z.object({
  description: z.string().min(5).max(6000),
  areas: z.array(z.string().max(120)).max(50).default([]),
});

export const processSchema = z.object({
  name: z.string().catch("Proceso"),
  objective: z.string().catch(""),
  steps: z.array(z.object({ step: z.string(), owner: z.string().nullable().catch(null), sla: z.string().nullable().catch(null) })).catch([]),
  automations: z.array(z.object({
    trigger: z.enum(["daily", "weekly", "monthly", "after_meeting", "task_overdue"]).catch("weekly"),
    day: z.number().int().min(0).max(31).nullable().catch(null),
    time: z.string().nullable().catch(null),
    action: z.string(),
  })).catch([]),
  kpis: z.array(z.object({ name: z.string(), formula: z.string(), target: z.string().nullable().catch(null) })).catch([]),
  quickWins: z.array(z.string()).catch([]),
});

export async function designProcess(input: z.infer<typeof processInputSchema>) {
  const user = `Documenta y automatiza este proceso de trabajo:
"""${input.description}"""
Áreas: ${input.areas.join(", ") || "no indicadas"}

Entrega: pasos claros con responsable y SLA, automatizaciones que la app puede ejecutar
(trigger: daily=diario, weekly=semanal con day 0-6 (0=domingo), monthly=mensual con day 1-31, after_meeting=al cerrar una minuta, task_overdue=cuando algo vence; time "HH:mm"),
indicadores para medirlo y quick wins.
JSON: {"name":"","objective":"","steps":[{"step":"","owner":null,"sla":null}],"automations":[{"trigger":"weekly","day":1,"time":"09:00","action":"Texto del recordatorio o tarea a crear"}],"kpis":[{"name":"","formula":"","target":null}],"quickWins":[""]}`;
  return jsonCompletion(SYSTEM_BASE, user, processSchema, 0.4);
}

// ---------- Apple Pencil: manuscrito → texto ----------

export async function inkToText(imageBase64: string, mimeType: string): Promise<{ text: string; title: string; actions: string[] }> {
  const completion = await getOpenAI().chat.completions.create({
    model: process.env.EXEC_VISION_MODEL || EXEC_MODEL(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_BASE },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Transcribe fielmente esta nota manuscrita (respeta listas y saltos de línea). Si hay flechas o diagramas, descríbelos entre corchetes. Extrae pendientes explícitos. JSON: {"title":"título corto","text":"transcripción","actions":["pendientes"]}',
          },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
  });
  const raw = completion.choices[0]?.message.content ?? "{}";
  const parsed = z.object({
    text: z.string().catch(""),
    title: z.string().catch("Nota"),
    actions: z.array(z.string()).catch([]),
  }).parse(JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw));
  return parsed;
}

// ---------- Correos ----------

export const emailInputSchema = z.object({
  mode: z.enum(["new", "reply", "improve"]),
  instructions: z.string().max(6000).default(""),
  tone: z.enum(["ejecutivo", "cordial", "firme", "breve", "agradecimiento"]).default("ejecutivo"),
  to: z.string().max(400).optional(),
  senderName: z.string().max(120).optional(),
  draft: z.string().max(20000).optional(),
  original: z.object({
    from: z.string().max(300),
    subject: z.string().max(500),
    body: z.string().max(30000),
  }).optional(),
  context: z.string().max(20000).optional(),
});

export const emailSchema = z.object({
  subject: z.string().catch(""),
  body: z.string().catch(""),
  alternatives: z.array(z.string()).catch([]),
  // Asesoría (solo al responder): qué piden, riesgos y cómo conviene responder.
  advice: z.object({
    summary: z.string().catch(""),
    theyAsk: z.array(z.string()).catch([]),
    watchOut: z.array(z.string()).catch([]),
    recommendation: z.string().catch(""),
    approaches: z.array(z.string()).catch([]),
  }).nullable().catch(null),
});

export async function draftEmail(input: z.infer<typeof emailInputSchema>) {
  const tones: Record<string, string> = {
    ejecutivo: "ejecutivo, claro y directo, cortés",
    cordial: "cordial y cercano, profesional",
    firme: "firme y respetuoso, deja claras las fechas y responsables",
    breve: "muy breve (máximo 5 líneas)",
    agradecimiento: "de agradecimiento y reconocimiento",
  };
  const task = input.mode === "reply"
    ? `Redacta la RESPUESTA a este correo.\nDe: ${input.original?.from}\nAsunto: ${input.original?.subject}\nCuerpo:\n${input.original?.body}`
    : input.mode === "improve"
      ? `Mejora este borrador sin cambiar el fondo ni inventar datos:\n${input.draft ?? ""}`
      : "Redacta un correo NUEVO.";
  const user = `${task}
Para: ${input.to || "no indicado"}
Firma como: ${input.senderName || "(sin nombre; firma genérica)"}
Tono: ${tones[input.tone]}
Indicaciones del ejecutivo: ${input.instructions || "ninguna"}
Contexto adicional (minuta, pendientes, datos): ${input.context || "ninguno"}

Reglas: español de México, sin frases de relleno, párrafos cortos, viñetas si hay varios puntos, cierra con siguiente paso concreto.
Si falta un dato (fecha, cifra, nombre), deja un marcador entre corchetes como [fecha].
${input.mode === "reply" ? `Además actúa como asesor del ejecutivo: resume el correo, lista qué le piden, señala riesgos
(compromisos de fecha o dinero, temas legales, tono, a quién copiar o no) y recomienda la mejor forma de responder
(aceptar, negociar, pedir información, delegar o no responder por escrito). Propón 3 enfoques distintos en pocas palabras.` : ""}
JSON: {"subject":"asunto (Re: ... si es respuesta)","body":"cuerpo en texto plano","alternatives":["2 frases de apertura alternativas"],"advice":${input.mode === "reply"
    ? '{"summary":"qué dice el correo en 1-2 líneas","theyAsk":["lo que piden"],"watchOut":["riesgos o cuidados"],"recommendation":"cómo conviene responder y por qué","approaches":["Aceptar con condiciones","Pedir más información","Delegar a ..."]}'
    : "null"}}`;
  return jsonCompletion(SYSTEM_BASE, user, emailSchema, 0.5);
}

export const triageInputSchema = z.object({
  emails: z.array(z.object({
    id: z.string().max(400),
    from: z.string().max(300),
    subject: z.string().max(500),
    preview: z.string().max(1000),
    received: z.string().max(40),
  })).min(1).max(60),
});

export const triageSchema = z.object({
  summary: z.string().catch(""),
  items: z.array(z.object({
    id: z.string(),
    category: z.enum(["responder_hoy", "delegar", "informativo", "puede_esperar"]).catch("puede_esperar"),
    reason: z.string().catch(""),
    suggestedAction: z.string().catch(""),
  })).catch([]),
});

export async function triageInbox(input: z.infer<typeof triageInputSchema>) {
  const user = `Prioriza la bandeja de entrada de un director. Clasifica cada correo:
responder_hoy (requiere su decisión o es de un superior/cliente clave), delegar (lo puede resolver su equipo), informativo, puede_esperar.
Correos: ${JSON.stringify(input.emails)}
JSON: {"summary":"2 líneas de lo más importante","items":[{"id":"","category":"","reason":"por qué","suggestedAction":"qué hacer en una línea"}]}`;
  return jsonCompletion(SYSTEM_BASE, user, triageSchema, 0.2);
}
