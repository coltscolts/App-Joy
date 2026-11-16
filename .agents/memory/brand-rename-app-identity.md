---
name: Brand renames preserve app identity
description: Visible rebrands must not silently change identifiers used by the already-published mobile app or existing calendar events.
---

Keep the mobile slug, URL scheme, iOS bundle identifier, Android package, artifact routes, and existing calendar UID domain stable during a visible brand rename unless the user explicitly requests and approves an identity migration.

**Why:** These identifiers connect installed apps, deep links, published listings, routing, and previously exported calendar events. Changing them as part of a cosmetic rename can create a separate app, break links, or duplicate calendar entries.

**How to apply:** Update user-facing names, metadata, artifact titles, shared captions, and export labels freely. Treat technical identifier changes as a separate migration with compatibility planning.