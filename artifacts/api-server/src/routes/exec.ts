import express, { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { isAiConfigured } from "../openai";
import { requireAuth } from "../middlewares/requireAuth";
import {
  MAX_AUDIO_BYTES,
  MAX_INK_BASE64,
  askData,
  askDataInputSchema,
  briefInputSchema,
  captureInputSchema,
  dashboardInputSchema,
  designDashboard,
  draftEmail,
  emailInputSchema,
  triageInbox,
  triageInputSchema,
  designProcess,
  generateBrief,
  generateMinutes,
  inkToText,
  minutesInputSchema,
  parseCapture,
  processInputSchema,
  transcribeAudio,
} from "../exec-ai";

// Rutas de IA de la oficina ejecutiva (/api/exec/*).
// Los datos del ejecutivo viven en su dispositivo; aquí solo se procesa lo que
// manda la app en cada petición y no se guarda nada.
const execRouter = Router();

// En local se puede probar sin Clerk con EXEC_ALLOW_ANON=true (nunca en producción).
const allowAnon = process.env.EXEC_ALLOW_ANON === "true" && process.env.NODE_ENV !== "production";
execRouter.use("/exec", allowAnon ? (req, _res, next) => { req.userId = "local"; next(); } : requireAuth);

// Límite simple por usuario para que nadie dispare el gasto de IA.
const windows = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = Number(process.env.EXEC_AI_RATE_PER_MIN || 30);
execRouter.use("/exec", (req, res, next) => {
  const key = req.userId ?? req.ip ?? "anon";
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    res.status(429).json({ error: "Demasiadas solicitudes de IA, espera un minuto." });
    return;
  }
  recent.push(now);
  windows.set(key, recent);
  next();
});

execRouter.get("/exec/status", (_req, res) => {
  res.json({ ai: isAiConfigured() });
});

function handler<S extends z.ZodType>(schema: S, run: (body: z.infer<S>) => Promise<unknown>, label: string) {
  return async (req: Request, res: Response) => {
    if (!isAiConfigured()) {
      res.status(503).json({ error: "La IA no está configurada en el servidor (OPENAI_API_KEY)." });
      return;
    }
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos", details: z.prettifyError(parsed.error) });
      return;
    }
    try {
      res.json(await run(parsed.data));
    } catch (error) {
      req.log.error({ err: error }, `exec ai: ${label}`);
      res.status(502).json({ error: "La IA no pudo completar la solicitud. Intenta de nuevo." });
    }
  };
}

execRouter.post("/exec/minutes", handler(minutesInputSchema, generateMinutes, "minutes"));
execRouter.post("/exec/brief", handler(briefInputSchema, generateBrief, "brief"));
execRouter.post("/exec/capture", handler(captureInputSchema, parseCapture, "capture"));
execRouter.post("/exec/dashboard", handler(dashboardInputSchema, designDashboard, "dashboard"));
execRouter.post("/exec/ask-data", handler(askDataInputSchema, askData, "ask-data"));
execRouter.post("/exec/email", handler(emailInputSchema, draftEmail, "email"));
execRouter.post("/exec/inbox-triage", handler(triageInputSchema, triageInbox, "inbox-triage"));
execRouter.post("/exec/process", handler(processInputSchema, designProcess, "process"));
execRouter.post(
  "/exec/ink",
  handler(
    z.object({
      image: z.string().min(10).max(MAX_INK_BASE64),
      mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]).default("image/png"),
    }),
    ({ image, mimeType }) => inkToText(image, mimeType),
    "ink",
  ),
);

// Audio crudo en el cuerpo (un segmento de la grabación, máx. ~24 MB).
execRouter.post(
  "/exec/transcribe",
  express.raw({ type: ["audio/*", "video/mp4", "application/octet-stream"], limit: MAX_AUDIO_BYTES }),
  async (req, res) => {
    if (!isAiConfigured()) {
      res.status(503).json({ error: "La IA no está configurada en el servidor (OPENAI_API_KEY)." });
      return;
    }
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length < 1000) {
      res.status(400).json({ error: "Audio vacío o inválido" });
      return;
    }
    try {
      const hint = typeof req.query.hint === "string" ? req.query.hint : undefined;
      const text = await transcribeAudio(body, String(req.headers["content-type"] ?? "audio/mp4"), hint);
      res.json({ text });
    } catch (error) {
      req.log.error({ err: error }, "exec ai: transcribe");
      res.status(502).json({ error: "No se pudo transcribir el audio." });
    }
  },
);

export default execRouter;
