# Ya-Ali 1.0.4 — Architecture + Adaptive Learning Upgrade

## Baseline protection

The original `Ya-Ali-1.0.3-SOURCE.zip` is preserved unchanged. Pre-change checkpoint:

- SHA256 source: `45791dca3bf24e205165f0804f9a01309641b2b8308adac2f8cf8886516a991c`
- pre-upgrade working-tree checkpoint SHA256: `ec43f98f0fe9728be2898d46cc31ca64efb558640d7c17b4b475b721d305fe99`

## Implemented in this upgrade

- Core domain contracts for corpus, scenarios, learning, AI/STT/TTS.
- Common Voice-oriented parser with explicit dataset/version/license/provenance.
- Vocabulary candidate extraction using frequency, novelty, weak-skill and scenario relevance.
- Conservative CEFR estimation with confidence and method; never treated as ground truth.
- Weighted multidimensional evaluation.
- Scenario V2 decision signals and runtime transition scoring.
- Durable SQLite v7 foundation for corpus, learner profiles, skill vectors, scenario definitions/sessions/turns, evaluations and learner events.
- Repositories for adaptive learning and scenario definitions, including scenario-turn/evaluation persistence ports and query indexes.
- Scenario library synchronization into SQLite.
- Scenario response evaluation is connected to the live chat path when a scenario is active; evaluation results update the durable skill vector and persist structured evaluation records asynchronously.
- Adaptive candidate ranking now prioritizes weak skills, due reviews, contextual relevance and recent under-performance.
- Clean-architecture repository ports are defined in Core and implemented by the database infrastructure.
- Android 16 target/compile API 36 retained and version advanced to 1.0.4/versionCode 12.

## Verification status

Core TypeScript passes under strict + exactOptionalPropertyTypes + noUncheckedIndexedAccess. Database TypeScript passes with the workspace dependency contracts represented by the installed source and a temporary Capacitor SQLite declaration used only for offline verification. Mobile source was additionally checked with temporary external-module declarations; after excluding stub-induced errors, no remaining project-source TypeScript errors were reported.

Full mobile/Android verification is **not claimed** in this environment because workspace dependencies are not installed because `npm ci --ignore-scripts` and a second `npm ci --ignore-scripts --prefer-offline` attempt both timed out in this environment. Therefore a dependency-backed Vite/React/Capacitor typecheck and Android build cannot honestly be claimed here.

Required release gate remains: `npm ci` → typecheck → tests → web build → Capacitor sync → Gradle debug/release build → install on Android 16 device → scenario evaluation → STT/TTS → offline/local-AI test → learning persistence test → artifact SHA256.

## 2026-09-07 stabilization pass — before GitHub upload

Applied locally, with a reversible checkpoint before the pass:

- fixed root `package-lock.json` metadata mismatch for `@types/node`;
- added reproducible npm retry/cache configuration and CI install flags;
- expanded root typecheck to shared/core/database/mobile;
- added shared package tsconfig;
- fixed database nullability error in `DatabaseManager.open()`;
- fixed Vitest discovery so source tests are actually included;
- fixed Android STT runtime permission flow in `NativeSTTPlugin`;
- added final Android WebView scrolling/responsive/safe-area interaction layer;
- added pronunciation manager with file/HTTPS import, provenance/license metadata, SHA-256, playback and deletion;
- documented audio provenance and regression gates.

### npm ci truth status

The repository-side lockfile/workspace problem has been fixed. Direct package/lock comparison passes. Both online-mode and strict-offline `npm ci --dry-run --ignore-scripts` now complete and produce the expected 318-package install plan. A real network-backed `npm ci` is still **NOT VERIFIED as a completed install in this analysis container** because the package tarballs are not available in the local npm cache and the registry connection is not reliable; the attempted real install did not complete. This is no longer a package-lock consistency error.

### TypeScript truth status

`packages/shared`, `packages/core`, and `packages/database` pass the available local TypeScript compiler. Mobile was checked with temporary external-module declarations; no additional project-source semantic errors remained after excluding errors caused by the intentionally minimal dependency stubs. A dependency-backed mobile typecheck is still required after a successful `npm ci`.

## Additional completion pass

- Added 120 curated everyday sentences to the durable language-bank seed path.
- Expanded the scenario library by 20 everyday scenarios; total scenario definitions are now 59.
- Added remote HTTPS pronunciation references in addition to local-file and downloaded-audio modes.
- Added dynamic viewport-height synchronization and stronger touch/scroll behavior for Android WebView.
- Added `scripts/verify-npm-lock.sh`, `scripts/install-deps.sh`, and `scripts/release-gate.sh`.
- Added regression coverage for content-bank size, uniqueness and scenario coverage.
- The original source and prior checkpoints remain preserved; no GitHub upload has been performed.
