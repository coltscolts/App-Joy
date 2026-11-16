---
name: Multi-stop checkout boundaries
description: Rules for adjacent dates between stops in a multi-destination trip.
---

Multi-destination trips may use the same calendar date as the end of one stop and the start of the next. This represents checking out and checking in on a travel day. A later stop may not begin before the preceding stop's end date.

**Why:** Travelers commonly change destinations on the previous accommodation's checkout date, so treating that boundary as an invalid overlap prevents valid itineraries.

**How to apply:** Keep the boundary-day exception aligned in server validation and both clients' calendars. When labeling an activity on a shared boundary day, assign it to the later stop because it is the check-in destination.