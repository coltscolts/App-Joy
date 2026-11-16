---
name: Expo Web splash gating
description: Preventing a permanent blank Expo Web preview when fonts or persisted theme state are slow to initialize.
---

Render the provider and navigation tree even while asynchronous fonts or persisted theme preferences are still initializing. On Expo Web, hide the splash immediately; on native, the splash may wait for coordinated font and theme readiness.

**Why:** A readiness gate that returned `null` before rendering the Clerk/navigation tree intermittently left Expo Web on a permanent blank splash with no runtime exception, even though Metro had bundled successfully.

**How to apply:** Keep readiness checks for native splash timing, not as a condition that prevents the application tree from mounting. Verify the Expo domain root directly after workflow restarts.