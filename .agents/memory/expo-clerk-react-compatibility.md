---
name: Expo–Clerk React compatibility
description: Why JoyPlann must keep Expo SDK 54 on one React 19.1.0 renderer even though current Clerk packages declare a narrower peer range.
---

Keep `react` and `react-dom` on Expo SDK 54's exact 19.1.0 versions, with one renderer copy across the workspace. Permit that version through pnpm's peer-dependency rules rather than upgrading React only to satisfy Clerk.

**Why:** Expo SDK 54's renderer requires its matching React patch, while current Clerk adapters declare a narrower peer range even though JoyPlann uses them only in client-rendered apps.

**How to apply:** Keep the exact Expo React pair and the pnpm allowed-version rule until an Expo SDK upgrade is validated with Clerk.