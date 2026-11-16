---
name: Expo Launch with Clerk JavaScript auth
description: Avoiding an iOS CocoaPods/SPM failure when an Expo app uses custom Clerk forms instead of Clerk native components.
---

When the app uses Clerk's JavaScript hooks and custom authentication screens only, keep `@clerk/expo` out of Expo native autolinking and disable Clerk native client synchronization.

**Why:** Clerk versions with native components add `ClerkKit` and `ClerkKitUI` through React Native's CocoaPods SPM hook. Expo Launch can generate no matching pod target, causing `undefined method package_product_dependencies for nil` before the iOS app compiles.

**How to apply:** Exclude `@clerk/expo` under the app package's `expo.autolinking.exclude`, enable ClerkProvider's JavaScript-only synchronization option, and verify Apple autolinking output contains no Clerk native module. Do not apply this if the app starts using Clerk native views or biometric/native Clerk APIs.