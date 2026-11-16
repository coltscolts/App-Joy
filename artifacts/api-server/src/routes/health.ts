import { Router, type IRouter } from "express";
import { GetHealthResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// Vivo: el proceso responde (lo usa Railway como healthcheck).
router.get("/healthz", (_req, res) => {
  const data = GetHealthResponse.parse({ status: "ok" });
  res.json(data);
});

// Listo: la base de datos responde y las tablas migradas existen.
router.get("/readyz", async (req, res) => {
  try {
    await pool.query("select 1 from trips limit 1");
    await pool.query("select 1 from activities limit 1");
    res.json({ status: "ok", database: "ok" });
  } catch (err) {
    req.log.error({ err }, "Readiness check failed");
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

export default router;
