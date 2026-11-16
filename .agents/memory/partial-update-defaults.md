---
name: Partial update defaults
description: Prevent create-time defaults from changing omitted fields during partial updates.
---

For PATCH-style inputs, use a schema whose optional fields do not retain defaults from the create schema. An omitted collection must remain omitted so the update merge preserves the stored collection and its order.

**Why:** Zod defaults can materialize an omitted field while parsing a partial payload. Merging that parsed payload over a stored record can silently replace a persisted route with an empty array.

**How to apply:** Keep create and update schemas separate when any create field has a default, especially JSON arrays such as ordered trip stops. Add a regression test for a name-only update preserving the stored collection.