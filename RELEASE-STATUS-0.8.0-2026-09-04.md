# Ya-Ali 0.8.0 — Release Status

## Learning
- Dialect learning upgraded to v2 with weighted skill mastery, retention, level progression, daily goal, next-review timing, and confusion-risk tracking.
- Pronunciation coaching now feeds the selected dialect's pronunciation skill.
- Learning reviews/signals append durable events to SQLite when native storage is available.
- SQLite migration 003 adds append-only learning events and dialect state tables.

## Architecture / Technology
- Android Keystore-backed secure storage plugin added for provider/API secrets.
- Existing localStorage secrets migrate into Keystore on native startup and are removed from localStorage.
- Endpoint profiles/pool added: multiple endpoints, priorities, health/latency scoring, capability-aware best-endpoint selection, and active endpoint routing.
- Diagnostics now reports endpoint pool health, secure-settings hydration, and durable learning-event count.
- Database schema/version advanced to 3.
- Android versionCode/name advanced to 6 / 0.8.0.

## Validation
- JSON manifests parse successfully.
- Targeted source syntax checks completed without new syntax errors.
- Full TypeScript build remains blocked by pre-existing malformed JSX in `apps/mobile/src/App.tsx` in the 0.7.0 baseline and by unavailable npm dependency installation in the sandbox.
- Android APK build was not claimed green; Gradle wrapper/dependency availability must be restored in a networked Android build environment.
