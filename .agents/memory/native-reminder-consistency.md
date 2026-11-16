---
name: Native reminder consistency
description: Keep the itinerary's reminder state aligned with local operating-system notifications.
---

When a reminder has both a backend preference and a device-local scheduled notification, save the preference as disabled first and enable it only after scheduling succeeds. Persist the notification identifier locally so updates and deletes can cancel it after an app restart. Treat that identifier as metadata, not proof: before displaying an active reminder after a reload, confirm the operating system still lists it as scheduled.

**Why:** Permissions can change, a chosen trigger can already be in the past, and one-shot notifications can expire or be canceled by the operating system. Recording an enabled preference or trusting stale local metadata leaves the itinerary claiming an alert exists when the operating system has none.

**How to apply:** For activity creation and edits, update the activity, cancel an old schedule only after that update succeeds, schedule the new notification, and then persist the enabled state. If the final state update fails, cancel the new notification too. On loading a form or badge, verify the stored identifier with the native scheduler, prune it if missing, and fail closed if verification fails. While an edit form is awaiting that verification, prevent saving so a temporary false UI state cannot cancel a valid notification.