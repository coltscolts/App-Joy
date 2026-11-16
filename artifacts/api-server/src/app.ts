import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
// Las capturas de reservas llegan en base64: límite mayor solo para esa ruta.
app.use("/api/bookings/extract", express.json({ limit: "8mb" }));
app.use("/api/exec", express.json({ limit: "8mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// La oficina ejecutiva (artifacts/exec-hub) se sirve bajo /oficina/.
const execDistDir = resolveDistDir(process.env.EXEC_WEB_DIST_DIR, "../../exec-hub/dist/public");
if (execDistDir) {
  app.use("/oficina", express.static(execDistDir, { index: false, maxAge: "1h" }));
  app.get(/^\/oficina(\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(execDistDir, "index.html"));
  });
  logger.info({ execDistDir }, "Serving exec hub");
}

// En producción, la misma API sirve la web compilada (artifacts/travel-app/dist/public),
// así web y API comparten dominio y no hace falta CORS ni un segundo servicio.
const webDistDir = resolveWebDistDir();
if (webDistDir) {
  app.use(express.static(webDistDir, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(webDistDir, "index.html"));
  });
  logger.info({ webDistDir }, "Serving web app");
}

function resolveDistDir(envDir: string | undefined, relative: string): string | null {
  if (process.env.SERVE_WEB === "false") return null;
  const candidates = [envDir, path.resolve(path.dirname(fileURLToPath(import.meta.url)), relative)]
    .filter((dir): dir is string => Boolean(dir));
  return candidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) ?? null;
}

function resolveWebDistDir(): string | null {
  if (process.env.SERVE_WEB === "false") return null;
  const candidates = [
    process.env.WEB_DIST_DIR,
    // dist/index.mjs → ../../travel-app/dist/public
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../travel-app/dist/public"),
  ].filter((dir): dir is string => Boolean(dir));
  return candidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) ?? null;
}

export default app;
