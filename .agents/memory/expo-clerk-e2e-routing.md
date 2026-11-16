---
name: Expo Clerk E2E routing
description: How to avoid mistaking the web artifact for Expo after programmatic Clerk authentication.
---

In this multi-artifact project, programmatic Clerk browser authentication can navigate to `/trips`, which renders the web artifact even when the test began on the direct Expo development domain. Returning to the Expo root can also lose the injected browser session.

**Why:** A mobile regression run repeatedly exercised the responsive web modal and reported a false Expo save failure. The origin alone was not enough to prove which component tree was rendered.

**How to apply:** Before evaluating authenticated Expo behavior, assert an Expo-only UI marker such as `button-save-trip` and assert that the web-only `button-submit-trip` is absent. If the web marker appears, treat the run as an authentication/routing limitation rather than a mobile product failure. Prefer a controlled Expo auth harness or native/dev-client run for authenticated mobile E2E.