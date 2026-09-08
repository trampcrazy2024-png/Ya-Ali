# Ya-Ali 1.0.3 — Final Pre-Release Checklist

Date: 2026-09-06

## Source integrity

- [x] `package.json`, workspace package version and `package-lock.json` set to 1.0.3.
- [x] Android `versionCode=11`, `versionName=1.0.3`.
- [x] Android minSdk is 24 in the authoritative `variables.gradle`.
- [x] Manifest XML parses successfully.
- [x] Shell release/build scripts pass `bash -n`.
- [x] Changed TypeScript files pass TypeScript parser-only validation without syntax diagnostics.
- [x] No `TODO`, `FIXME`, placeholder marker or debug `console.log` was introduced by this upgrade.
- [x] Scenario and learning-memory modules are included in the archive.

## Mobile behavior changes

- [x] Main page uses real viewport units and safe-area padding.
- [x] Non-chat tabs use document scrolling instead of clipped panels.
- [x] Chat keeps an isolated message scroller.
- [x] Bottom navigation supports eight sections and horizontal overflow on very narrow devices.
- [x] Scenario section is reachable from the main navigation.
- [x] Microphone button retains explicit 44px touch target.
- [x] API 31+ Android STT prefers on-device recognition when available.

## Data and learning

- [x] 39 role-based real-world scenario definitions.
- [x] Scenario seed contributes 273 scenario-derived phrase/example rows plus 145 curated English word rows (418 additional seed rows before deduplication).
- [x] Local learner memory records turns, weak/strong topics, preferred dialect, corrections and useful phrases.
- [x] Local memory is injected into the next AI prompt as a compact teaching context.
- [x] Data provenance policy documents Tatoeba, OPUS and Common Voice handling.

## Build verification

- [ ] Full `npm ci` + `npm run typecheck` + `npm test` + `npm run build` in this sandbox — blocked because dependency installation timed out.
- [ ] Android Gradle build in this sandbox — blocked because `gradle-wrapper.jar` is absent and network access is unavailable.
- [ ] Final APK `versionCode=11` install test on a physical phone — requires external Android build/installation environment.

The archive is therefore source-complete and statically checked, but an APK release must not be claimed until the GitHub Actions build completes and the resulting APK is installed and verified on the target phone.
