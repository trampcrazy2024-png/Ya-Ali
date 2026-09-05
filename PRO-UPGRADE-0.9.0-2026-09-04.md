# Ya-Ali Professional 0.9.0

## Learning
- SQLite-first durable review-state projection with v4 schema.
- Append-only learning events now carry complete FSRS-6 review snapshots for future event-sourced rebuilds.
- Startup hydration restores scheduler and dialect state from SQLite.
- All seven dialect learning tracks are eligible in the learning pool.
- Dialect confusion risk now increases recognition-focused practice priority.

## Architecture / Technology
- Database schema advanced from v3 to v4.
- Durable endpoint profile projection in SQLite.
- Endpoint pool now ranks by capability, latency, priority and failure penalty.
- Custom endpoint routing tries multiple healthy/capable endpoints with automatic success/failure health feedback.
- Android versionCode 7 / versionName 0.9.0.

## Validation
- Source sanity and formatting checks performed.
- Full Android APK build is not claimed green when Gradle wrapper/dependencies are unavailable in the sandbox.
