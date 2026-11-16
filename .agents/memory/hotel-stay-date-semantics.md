---
name: Hotel stay date semantics
description: Product rules for hotel-stay creation and independent editing across multi-stop trips.
---

Hotel stays created as a one- or two-stay batch must cover the overall trip continuously. The stays may include transit days or gaps between destination ranges. Hotel creation uses the dedicated batch endpoint rather than the general activity-create endpoint.

Existing hotel stays are intentionally editable one at a time. An edit validates that hotel's check-in/check-out range against the overall trip dates; it must not require the check-in day to fall inside a destination stop or reapply batch continuity rules.

**Why:** Accommodation can legitimately bridge destinations and transit dates, while people still need to update one hotel's details independently after it is saved.

**How to apply:** Keep hotel creation validation separate from generic activity creation and from hotel PATCH validation. Ordinary activities continue to require a date belonging to a destination stop.