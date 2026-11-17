# JoyPlann

App para planificar viajes: itinerarios de uno o varios destinos, hoteles, transporte entre etapas, recordatorios y historial sincronizado entre web y móvil.

## Estructura (monorepo pnpm)

| Carpeta | Qué es |
|---|---|
| `artifacts/trip-planner-mobile` | App iOS/Android — Expo SDK 54, React Native 0.81, expo-router |
| `artifacts/travel-app` | App web — React + Vite + Tailwind + shadcn/ui |
| `artifacts/exec-hub` | **Oficina ejecutiva ("Mando")** — agenda, reuniones con minuta por IA, pendientes, notas con Apple Pencil, correos e indicadores. Web instalable en iPad/iPhone, servida en `/oficina/`. Guía: [`docs/OFICINA-EJECUTIVA.md`](docs/OFICINA-EJECUTIVA.md) |
| `artifacts/exec-mobile` | App nativa iPhone/iPad de la oficina ejecutiva (Expo): muestra `/oficina/` y agrega Calendario de Apple, avisos con la app cerrada y apertura de Outlook/Teams |
| `artifacts/api-server` | API — Express 5 + Drizzle ORM |
| `artifacts/mockup-sandbox` | Previsualización de componentes (diseño) |
| `lib/db` | Esquema PostgreSQL (Drizzle) |
| `lib/api-spec` | Contrato OpenAPI → genera `api-zod` y `api-client-react` con Orval |
| `attached_assets` | Logos, referencias de diseño e imágenes |

Autenticación con Clerk. Notas técnicas del proyecto en `.agents/memory/`.

**Producción:** Railway (API + web + PostgreSQL en un solo servicio). Guía paso a paso en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

Identificadores de la app: `com.joyplann.app` (iOS y Android) y esquema `joyplann://`.

## Puesta en marcha

Requisitos: Node 22+, pnpm 10, PostgreSQL.

```bash
pnpm install
cp .env.example .env            # rellena las variables
pnpm --filter @workspace/db run push          # crea las tablas
pnpm --filter @workspace/api-server run dev   # API
pnpm --filter @workspace/travel-app run dev   # web → http://localhost:5173
pnpm --filter @workspace/trip-planner-mobile start   # móvil (Expo)
```

La API lee automáticamente el `.env` de la raíz. La app móvil lee `artifacts/trip-planner-mobile/.env`. Para `db push`, exporta `DATABASE_URL` en la terminal.

En desarrollo, si no defines `EXPO_PUBLIC_API_URL`, la app móvil se conecta a la API usando la IP de tu ordenador y el puerto 8080. Tu móvil debe estar en la misma red Wi-Fi.

## Compilar la app móvil (EAS)

Requisitos: una cuenta en [expo.dev](https://expo.dev), la membresía de Apple Developer (99 USD/año) y una cuenta de Google Play Console (25 USD, pago único).

```bash
npm i -g eas-cli
cd artifacts/trip-planner-mobile
eas login
eas init                     # vincula el proyecto y añade el projectId a app.json

# Variables por entorno (una vez):
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://api.tudominio.com --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_xxx --visibility plaintext
# Repite con --environment preview / development.

eas build --profile development --platform ios      # cliente de desarrollo (simulador)
eas build --profile preview --platform android      # APK para probar en tu móvil
eas build --profile production --platform all       # para las tiendas
eas submit --platform ios                           # sube a App Store Connect / TestFlight
```

| Perfil | Para qué sirve |
|---|---|
| `development` | Cliente de desarrollo con recarga en caliente |
| `preview` | APK o build interna para probadores |
| `production` | App Store y Google Play; el número de build se incrementa solo |

## Calidad

```bash
pnpm run typecheck
pnpm run test:multidestination   # API (necesita DATABASE_URL y claves de Clerk)
pnpm run test:mobile-form
npx vitest run --config artifacts/travel-app/vitest.config.ts
```
