# Lanzamiento 1.0 (gratis): cambio a Clerk producción

Instancia de producción de Clerk creada el 17 nov 2026 para `joyplann.com`.

- Publishable key (pública): `pk_live_Y2xlcmsuam95cGxhbm4uY29tJA` → `clerk.joyplann.com`
- Secret key: guardada en Railway como `CLERK_SECRET_KEY_LIVE` (no se usa hasta el cambio).

## Pendiente antes del cambio
1. DNS de Clerk verificados (clerk, accounts, clkmail, clk._domainkey, clk2._domainkey).
2. Apple sign-in con credenciales propias (Services ID + clave .p8) en Clerk producción.
3. Google sign-in con cliente OAuth propio (Google Cloud, proyecto JoyPlann).
4. En Clerk producción: solo email obligatorio; sin verificación en dispositivo nuevo; Native applications → iOS con Team ID `J5Z6FUTFMS` y bundle `com.joyplann.app`.

## Día del cambio (todo junto)
1. Railway → variables: `CLERK_SECRET_KEY` = valor de `CLERK_SECRET_KEY_LIVE`;
   `CLERK_PUBLISHABLE_KEY` y `VITE_CLERK_PUBLISHABLE_KEY` = pk_live → Deploy.
2. `artifacts/trip-planner-mobile/eas.json` → `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = pk_live.
3. Build final de iOS (production) con auto-submit.
4. Los usuarios de prueba de la instancia de desarrollo no pasan a producción: crear cuenta de nuevo.
