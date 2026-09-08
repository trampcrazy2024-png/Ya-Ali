# Ya-Ali 1.0.4 — Architecture Target

## Principle

The app is migrated incrementally toward Presentation → Application → Core, with Infrastructure implementing Core contracts. The original 1.0.3 tree remains the baseline; no destructive rewrite is required.

## Core boundaries

- `packages/core`: domain contracts and deterministic algorithms only.
- `packages/database`: SQLite persistence and repositories.
- `apps/mobile`: presentation and application orchestration.
- Android native plugins: platform adapters for STT/TTS/local inference/secure storage.

Core must not import React, Capacitor, SQLite, filesystem APIs, or a concrete AI provider.

## Persistence

SQLite is the durable source for corpus, scenario sessions, evaluations, learner events and skill vectors. LocalStorage may remain a compatibility/cache layer but must not be the authoritative store for durable learning state.

## AI

AI is capability-based. Local inference is preferred when available; network providers are adapters/fallbacks. Provider choice is not part of the domain model.
