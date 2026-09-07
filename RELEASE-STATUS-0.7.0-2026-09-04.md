# Ya-Ali 0.7.0 — Release Status

## Upgrade
- Dialect learning upgraded to a dedicated mastery engine.
- Seven target varieties now have independent learning state: Iraqi, Lebanese, Gulf, Saudi, Egyptian, MSA, American English.
- Dialect normalization maps language-bank labels to stable IDs.
- Per-dialect mastery, confidence, exposure, streak, success/review counts and six skill scores.
- Dialect confusion tracking and dialect-specific learning plan.
- Learning UI selects a single target dialect and prevents automatic cross-dialect mixing.
- Dialect prompts now include learning focus and guardrails.
- Android versionCode 5 / versionName 0.7.0.

## Validation
- Targeted TypeScript compile for dialectEngine + dialectLearning + learning: PASS (TypeScript 5.8.3).
- JSON validation: PASS.
- Git commit: 60e64e0f456443c243d4e93d79149090f7f603f6.
- Full npm test/typecheck could not be treated as green because project dependencies are not installed in the release sandbox.
- Android APK build was not run as a green build claim; previous environment lacks the Gradle wrapper JAR/network access.
