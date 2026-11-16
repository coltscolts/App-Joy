# Despliegue de JoyPlann en Railway

La API, la web y la base de datos PostgreSQL viven en **un solo proyecto de Railway**:

```
Railway
├── Servicio "joyplann"  → API (/api/…) + web (todo lo demás)
└── PostgreSQL           → base de datos
```

La app móvil se conecta a `https://<tu-dominio>/api`.

**Coste estimado:** plan Hobby de 5 USD/mes, que incluye 5 USD de consumo. Con pocos usuarios, la API y PostgreSQL suelen quedarse dentro de ese crédito.

## Estado actual (configurado el 16-nov-2026)

| Elemento | Valor |
|---|---|
| URL pública | https://app.joyplann.com (también https://joyplann-production.up.railway.app) |
| Comprobación de vida | `/api/healthz` (lo usa Railway) |
| Comprobación de base de datos | `/api/readyz` |
| Servicio de la app | `joyplann`, desde `coltscolts/App-Joy`, rama `claude/nice-pasteur-469vhb` |
| Base de datos | `Postgres` (plantilla oficial de Railway, PostgreSQL 18) |
| Comandos | build, pre-deploy (migraciones), start y healthcheck configurados en **Settings** del servicio |
| Variables | `DATABASE_URL`, `NODE_ENV`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` |
| Clerk | Instancia de desarrollo (`pk_test`) |
| App móvil | `eas.json` apunta a https://app.joyplann.com con la clave pública de Clerk |
| DNS (en Replit) | `CNAME app` → Railway; MX + SPF de ImprovMX para el correo `@joyplann.com`; registros de Clerk (instancia antigua de Replit) |

**Pendiente en el panel de Railway:**
- Activar el despliegue automático: servicio `joyplann` → **Settings → Source**, comprobar la rama y activar **Auto Deploy**.
- Renombrar el proyecto `poetic-reflection` a `JoyPlann`: **Project Settings → General**.
- Cuando la rama se fusione con `main`, cambiar la rama del servicio a `main`.

Las secciones siguientes explican cómo montarlo desde cero.

---

## 1. Cuenta de Clerk (inicio de sesión)

Hasta ahora el inicio de sesión usaba un Clerk gestionado por Replit, al que no tienes acceso fuera de Replit. Hay que crear uno propio:

1. Regístrate en [clerk.com](https://clerk.com). Es gratis hasta 10.000 usuarios activos al mes.
2. Crea una aplicación llamada **JoyPlann** y activa los métodos de acceso que quieras: email, Google, Apple…
3. En **API Keys**, copia la `Publishable key` (`pk_test_…`) y la `Secret key` (`sk_test_…`).

> Las claves `pk_test`/`sk_test` sirven para pruebas y TestFlight. Antes de publicar en la App Store, crea la instancia **Production** de Clerk. Necesita un dominio propio, por ejemplo `joyplann.com`, y te da claves `pk_live`/`sk_live`.

## 2. Proyecto en Railway

1. Regístrate en [railway.com](https://railway.com) con tu cuenta de GitHub y activa el plan Hobby.
2. **New Project → Deploy from GitHub repo →** `coltscolts/App-Joy`. Elige la rama que quieras desplegar.
   Después, en **Settings** del servicio, configura:
   - **Build Command:** `pnpm --filter @workspace/travel-app run build && pnpm --filter @workspace/exec-hub run build && pnpm --filter @workspace/api-server run build`
     (incluye la oficina ejecutiva, que queda en `https://<dominio>/oficina/`; ver [OFICINA-EJECUTIVA.md](OFICINA-EJECUTIVA.md))
   - **Pre-deploy Command:** `pnpm --filter @workspace/db run migrate`
   - **Start Command:** `pnpm --filter @workspace/api-server run start`
   - **Healthcheck Path:** `/api/healthz`

   (Railway retiró `railway.json`; esta configuración vive en el propio servicio.)
3. En el mismo proyecto: **New → Database → PostgreSQL**.
4. En el servicio de la app, abre **Variables** y añade:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia a la base de datos) |
| `NODE_ENV` | `production` |
| `CLERK_SECRET_KEY` | `sk_test_…` |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_…` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_…` (la misma; la web la necesita al compilar) |
| `OPENAI_API_KEY` | opcional: sugerencias con IA |
| `GOOGLE_PLACES_API_KEY` | opcional: búsqueda de hoteles |
| `AVIATIONSTACK_API_KEY` | opcional: datos de vuelos |

5. En **Settings → Networking → Generate Domain** obtienes una dirección como `joyplann-production.up.railway.app`. Más adelante puedes añadir tu propio dominio.
6. Comprueba que todo funciona en `https://<dominio>/api/healthz`. Debe responder `{"status":"ok"}`.

Cada `git push` a la rama conectada despliega automáticamente. Antes de arrancar la nueva versión, Railway aplica las migraciones pendientes.

## 3. Conectar la app móvil

```bash
cd artifacts/trip-planner-mobile
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://<dominio> --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_test_… --visibility plaintext
# Repite para production cuando toque.
```

Para desarrollo local, pon esas dos variables en `artifacts/trip-planner-mobile/.env`.

## 4. Cambios en la base de datos

Las tablas se crean con migraciones versionadas en `lib/db/migrations`. Si cambias `lib/db/src/schema/schema.ts`:

```bash
DATABASE_URL=… pnpm --filter @workspace/db run generate --name descripcion-del-cambio
git add lib/db/migrations && git commit -m "…" && git push   # Railway la aplica al desplegar
```

No uses `db push` contra producción.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| La web carga pero no inicia sesión | Falta `VITE_CLERK_PUBLISHABLE_KEY`, o se añadió después de compilar. Vuelve a desplegar (**Redeploy**). |
| `/api/trips` responde 401 desde el móvil | Las claves de Clerk de la app y del servidor son de instancias distintas. |
| `/api/suggestions` responde 503 | No hay `OPENAI_API_KEY` (es opcional). |
| El despliegue falla en "pre-deploy" | `DATABASE_URL` no apunta a la base de datos de Railway. |
