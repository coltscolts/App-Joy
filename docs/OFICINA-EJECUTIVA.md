# Mando · Oficina ejecutiva con IA

> **Mando** es un nombre provisional. Para cambiarlo edita `artifacts/exec-hub/src/config.ts`,
> `artifacts/exec-hub/index.html` y `artifacts/exec-hub/public/manifest.webmanifest`.
> El color de marca está en `artifacts/exec-hub/src/index.css` (`--brand`).

App de productividad para directores y altos mandos: organiza agenda, reuniones, pendientes,
notas, correos, fotos e indicadores por **día, tema y área/dirección**, con IA en cada paso.

## Qué hace

| Sección | Funciones |
|---|---|
| **Hoy** | Briefing de la mañana con IA (3 prioridades, alertas, qué delegar). Después de la hora de cierre cambia a **Cierre del día**: lo logrado, lo pendiente, lo vencido y botón para pasar todo a mañana. |
| **Captura rápida (+)** | Escribe o dicta "Recuérdame el jueves a las 10 llamar a Juan y agenda junta con Finanzas el lunes"; la IA lo separa en pendientes, reuniones y notas con fecha, recordatorio y área. |
| **Agenda** | Semana (iPad) o día (iPhone). Sincroniza **Outlook**, crea reuniones con **liga de Teams**, importa `.ics` (iCloud/Google) y exporta cada reunión al Calendario. |
| **Reuniones** | **Graba** (por partes de 10 min, sin límite de duración), transcribe y genera la **minuta**: resumen, acuerdos, acciones con responsable y fecha, riesgos y seguimiento. Las acciones pasan solas a Pendientes. Copiar, enviar por correo o descargar. También acepta el audio de una grabación de Teams. |
| **Pendientes** | Por día, área, tema, delegado o **matriz urgente/importante**. Recordatorios dentro de la app y exportables al Calendario con alarma. |
| **Correos** | **Sin Sistemas:** copias el correo desde Outlook, tocas *Pegar correo* y la IA te da **asesoría** (qué te piden, riesgos, cómo conviene responder y otros enfoques) y redacta la respuesta; *Abrir en Outlook* la deja lista para enviar. La IA también **redacta y mejora** correos (tono ejecutivo, cordial, firme…), usando una minuta o pendiente como contexto. Con Outlook conectado: ve la bandeja, **prioriza con IA** (responder hoy / delegar / informativo) y guarda la respuesta como **borrador en Outlook** para que tú la envíes. |
| **Notas** | Escritura a mano con **Apple Pencil** (presión, resaltador, borrador, botón lateral para borrar, rechazo de palma) u hoja de texto. **Convertir a texto** con IA y detectar pendientes. |
| **Indicadores** | Sube un **Excel/CSV** y la IA diseña el dashboard (KPIs con meta, tendencias, barras, mezcla). Filtros, "pregúntale a tus datos", actualizar el Excel conservando el diseño y exportar. A la IA solo se envían nombres de columna y estadísticas, no la tabla completa. |
| **Procesos** | Describe un proceso y la IA lo documenta (pasos, responsables, SLA, indicadores) y programa **automatizaciones** (diarias, semanales, mensuales). Incluye briefing, cierre del día, alertas de vencidos y minutas → pendientes. |
| **Fotos** | Evidencias de recorridos y pizarrones por día, área y tema; se reducen para no llenar el dispositivo. |

## Cómo está construido

- **Web instalable (PWA)** en `artifacts/exec-hub` (React + Vite + Tailwind). En iPad: Safari →
  Compartir → *Agregar a pantalla de inicio*. Funciona a pantalla completa, con notificaciones
  (iPadOS 16.4+) y sin señal para consultar lo guardado.
- **Datos en el dispositivo** (IndexedDB): notas, audios, fotos y Excel no salen del iPad salvo lo
  que se manda a la IA en cada solicitud. Ajustes → *Descargar respaldo*.
- **IA en el servidor** (`artifacts/api-server/src/exec-ai.ts`, rutas `/api/exec/*`), con sesión
  de Clerk y límite por usuario. El servidor no guarda nada.

| Ruta | Uso |
|---|---|
| `POST /api/exec/transcribe` | audio → texto |
| `POST /api/exec/minutes` | transcripción + notas → minuta |
| `POST /api/exec/brief` | briefing / cierre del día |
| `POST /api/exec/capture` | dictado → pendientes, reuniones, notas |
| `POST /api/exec/email` · `inbox-triage` | redactar / priorizar correos |
| `POST /api/exec/dashboard` · `ask-data` | Excel → dashboard / preguntas |
| `POST /api/exec/process` | proceso → pasos, KPIs y automatizaciones |
| `POST /api/exec/ink` | nota a mano (imagen) → texto |

### Elegir "la mejor IA"

Se usa cualquier proveedor compatible con la API de OpenAI. Variables:

- `EXEC_AI_MODEL`: modelo para minutas, correos y análisis (usa el más capaz disponible).
- `EXEC_TRANSCRIBE_MODEL`: transcripción (por defecto `gpt-4o-transcribe`).
- `EXEC_VISION_MODEL`: lectura de notas a mano.
- `OPENAI_BASE_URL`: para apuntar a otro endpoint compatible (por ejemplo, uno corporativo).

Para información confidencial de la empresa conviene un contrato empresarial con el proveedor de IA
(sin entrenamiento con tus datos) y validarlo con TI y Seguridad.

## App de iPhone/iPad: Calendario de Apple sin Sistemas

`artifacts/exec-mobile` es la app nativa. Carga la misma oficina web y le agrega lo que un navegador no puede:

- **Calendario de Apple**: lee todas las cuentas que tengas en la app Calendario, **incluida la de Truper**
  si ya ves ahí tus juntas. Trae hora, lugar, asistentes, notas y la **liga de Teams**. No toca los
  servidores de la empresa, así que no requiere permisos de Sistemas. Se elige qué calendarios mostrar.
- **Avisos con la app cerrada**: recordatorios de pendientes, 10 min antes de cada junta, briefing y
  cierre del día (notificaciones locales de iOS).
- Abre Teams, Outlook y Correo en sus apps; agrega pendientes al Calendario con alarma; mantiene la
  pantalla encendida mientras grabas.

Compilar e instalar (se necesita la membresía de Apple Developer que ya usa JoyPlann):

```bash
cd artifacts/exec-mobile
npx eas-cli init                      # una vez: crea el proyecto en expo.dev
npx eas-cli build -p ios --profile preview      # instalación directa en tus dispositivos
npx eas-cli build -p ios --profile production && npx eas-cli submit -p ios   # TestFlight
```

La dirección de la web está en `eas.json` (`EXPO_PUBLIC_WEB_URL`, por defecto `https://app.joyplann.com/oficina/`).
El identificador provisional es `com.joyplann.mando`; cámbialo junto con el nombre en `app.json`.

## Conectar Outlook y Teams (Microsoft 365, requiere Sistemas)

Lo hace TI una sola vez:

1. Entra a **portal.azure.com → Microsoft Entra ID → Registros de aplicaciones → Nuevo registro**.
2. Tipo de cuenta: *solo esta organización*. Plataforma **Aplicación de página única (SPA)**, URI de
   redirección `https://<tu-dominio>/oficina/`.
3. **Permisos de API → Microsoft Graph → Delegados**: `User.Read`, `Calendars.ReadWrite`,
   `Mail.ReadWrite`. Otorga consentimiento de administrador si la política lo exige.
4. Copia el **Id. de aplicación (cliente)** y el **Id. de directorio (inquilino)**.
5. Ponlos en Ajustes de la app, o en las variables `VITE_MS_CLIENT_ID` / `VITE_MS_TENANT` antes de compilar.

Con eso: ver calendario, crear reuniones con liga de Teams, leer la bandeja y guardar borradores.
La app **nunca envía correos sola**: deja el borrador en Outlook para que lo revises.

## Probar en local

```bash
pnpm install
# Terminal 1 — API con IA (sin Clerk, solo local)
EXEC_ALLOW_ANON=true OPENAI_API_KEY=sk-... pnpm --filter @workspace/api-server run dev
# Terminal 2 — app
pnpm --filter @workspace/exec-hub run dev     # http://localhost:5174/oficina/
```

El micrófono y las notificaciones requieren `https` o `localhost`.

## Límites actuales y siguientes pasos

- En la web, los recordatorios se ejecutan con la app abierta; en la app de iPhone/iPad llegan aunque
  esté cerrada. Las automatizaciones que crean pendientes se ejecutan al abrir la app.
- Sin la conexión de Microsoft 365, los correos se traen copiando y pegando (iOS no permite a ninguna
  app leer el buzón de Correo u Outlook). «Abrir en Outlook» crea un mensaje nuevo con asunto RE:.
- Los datos viven en un dispositivo. Siguiente paso: sincronización cifrada iPad ↔ iPhone ↔ web
  usando la base de datos PostgreSQL existente.
- Transcripciones nativas de Teams (permiso `OnlineMeetingTranscript.Read.All`, requiere aprobación
  de TI) para hacer la minuta sin grabar desde el iPad.
- App nativa en App Store reutilizando la base Expo de `artifacts/trip-planner-mobile`.
