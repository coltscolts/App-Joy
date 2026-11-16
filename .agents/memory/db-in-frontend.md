---
name: DB package not safe for frontend
description: @workspace/db must never be imported in frontend (Vite) artifacts — it pulls in pg/drizzle-orm which use Node.js Buffer and crash in the browser.
---

## Rule

Never import `@workspace/db` in frontend (Vite) artifacts — not even just for types that look harmless (insertXxxSchema is a runtime Zod value, not type-only).

**Why:** `@workspace/db` imports `drizzle-orm/node-postgres` and `pg`, both of which reference Node.js `Buffer`. Vite bundles these into the browser bundle, causing "Buffer is not defined" crashes.

**How to apply:** Define schema mirrors locally in `src/lib/schemas.ts` inside the frontend artifact. For types, use a type-only import pattern but still avoid the package. Use `@workspace/api-zod` generated schemas where possible instead.
