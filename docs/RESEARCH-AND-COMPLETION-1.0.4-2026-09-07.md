# Ya-Ali 1.0.4 — Research and Completion Pass

## Scope

This pass is intentionally performed before any GitHub upload. The project remains local until the final dependency-backed release gate passes.

## Architecture

- Core remains framework-independent and owns corpus, scenario, evaluation, learning and provider contracts.
- Database remains an infrastructure implementation of Core ports.
- Scenario Engine V2 is reusable and state/decision based rather than transcript based.
- SQLite FTS5 is retained as the intended search primitive for the durable bank; the UI mirror remains a compatibility/cache layer.
- Android 15+ edge-to-edge behavior is explicitly handled with viewport units, safe-area padding and scrolling/inset-aware layout.

## Learning system

- FSRS scheduling remains separate from adaptive prioritization.
- Weighted evaluation feeds the Skill Vector.
- Weak-skill and contextual candidate ranking feeds practice selection.
- Scenario evaluation can persist structured evaluation records and learning events.
- The curated everyday sentence layer now adds 120 high-frequency sentences: 60 American English and 60 Iraqi Arabic, with Persian meaning, category, level and transliteration where available.
- Scenario coverage now extends from the existing 39 scenarios to 59 by adding 20 everyday scenarios across service, travel, home, technology, finance, education, social and daily-life contexts.

## Audio and pronunciation

The pronunciation manager now supports three source modes:

1. Local audio file imported from the device.
2. HTTPS audio downloaded into local IndexedDB with SHA-256 metadata.
3. HTTPS remote link stored as a reference and playable directly when the WebView permits it.

Every record can carry locale, source name and license. Individual assets can be played and deleted independently.

The voice-pack manager remains separate for larger dialect/model packs.

## Speech input

Native STT checks microphone permission, prefers on-device recognition when Android provides it, falls back to the system recognizer, and destroys the recognizer after use. Android documents `createOnDeviceSpeechRecognizer()` from API 31 and requires `destroy()` when the recognizer is no longer needed.

## Mobile UI

- Duplicate viewport declaration removed.
- Dynamic `--vh` is synchronized with actual `innerHeight`.
- Chat scrolling uses `dvh`/viewport fallback, `min-height: 0`, touch scrolling and overscroll containment.
- Bottom navigation accounts for the safe-area inset.
- Microphone button has a clear listening state and focus-visible behavior.

## npm ci investigation

The repository had two real consistency problems that could make clean installation unreliable:

- workspace package manifests under `packages/*` had lost their `name`/`version`/module metadata even though the lockfile still contained those workspace identities;
- the root `@types/node` range was `^22.10.0` while the lockfile resolved `26.2.0`, which is outside that range.

Both are now aligned with the lockfile. `npm ci --dry-run --ignore-scripts --prefer-offline` completes and reports the full 318-package installation plan. The strict offline dry-run also completes when npm is allowed to resolve from the lockfile, but a real install requires the package tarballs in npm's cache or access to the configured registry.

The actual install in the current analysis environment cannot be used as the final release proof because registry/network access is not reliable and the local npm cache does not contain the tarballs. The repository therefore includes `scripts/install-deps.sh` and `scripts/release-gate.sh` so the same clean install and complete verification sequence can be run in a networked environment without mutating the lockfile.

## Release gate

The final proof command is:

```bash
bash scripts/release-gate.sh
```

It performs, in order:

1. `npm ci`
2. root workspace typecheck
3. Vitest tests
4. Vite production build
5. Capacitor Android sync
6. Gradle debug APK build
7. APK existence and SHA-256 output

A GitHub upload should occur only after this gate passes in the actual build environment and the resulting APK is exercised on an Android 16 device.
