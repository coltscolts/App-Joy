# JoyPlann

App para planificar viajes: itinerarios de uno o varios destinos, hoteles, transporte entre etapas, recordatorios y historial sincronizado entre web y móvil.

## Estructura (monorepo pnpm)

| Carpeta | Qué es |
|---|---|
| `artifacts/trip-planner-mobile` | App iOS/Android — Expo SDK 54, React Native 0.81, expo-router |
| `artifacts/travel-app` | App web — React + Vite + Tailwind + shadcn/ui |
| `artifacts/api-server` | API — Express 5 + Drizzle ORM |
| `artifacts/mockup-sandbox` | Previsualización de componentes (diseño) |
| `lib/db` | Esquema PostgreSQL (Drizzle) |
| `lib/api-spec` | Contrato OpenAPI → genera `api-zod` y `api-client-react` con Orval |
| `attached_assets` | Logos, referencias de diseño e imágenes |

Autenticación con Clerk. Notas técnicas del proyecto en `.agents/memory/`.

## Puesta en marcha

Requisitos: Node 22+, pnpm 10, PostgreSQL.

```bash
pnpm install
cp .env.example .env            # rellena las variables
pnpm --filter @workspace/db run push          # crea las tablas
pnpm --filter @workspace/api-server run dev   # API
pnpm --filter @workspace/travel-app run dev   # web
cd artifacts/trip-planner-mobile && npx expo start   # móvil
```

## Calidad

```bash
pnpm run typecheck
pnpm run test:multidestination   # API (necesita DATABASE_URL y claves de Clerk)
pnpm run test:mobile-form
npx vitest run --config artifacts/travel-app/vitest.config.ts
```
