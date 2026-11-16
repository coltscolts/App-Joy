---
name: Expo component tests under Vitest
description: Why Expo component integration tests use lightweight React Native primitive mocks under Vitest.
---

Use lightweight host mocks for React Native primitives when rendering Expo components with Vitest and React Test Renderer. Keep application components, hooks, and form logic real; mock only native hosts and external boundaries.

**Why:** React Native Testing Library and direct React Native imports can expose untransformed Flow syntax to Vitest, while React Native Web modals render through portals that React Test Renderer cannot inspect without a DOM.

**How to apply:** Extend the shared mobile test setup for new integrated form tests instead of introducing a second renderer or loading React Native's native source through Vitest.