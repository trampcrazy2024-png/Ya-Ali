# Ya-Ali 1.0.3 → 1.0.4 — Real Architecture Audit

## Scope

Audited the actual `Ya-Ali-1.0.3-SOURCE.zip` tree, not the earlier description alone. The source archive contains 202 files and hashes to `45791dca3bf24e205165f0804f9a01309641b2b8308adac2f8cf8886516a991c`.

## Claim audit

| Claim | Status | Evidence |
|---|---|---|
| Dynamic scenario library exists | DONE | `App.tsx` selects `SCENARIOS`; `scenarioPrompt()` is included in the live chat system prompt. |
| Scenario text is not a fixed transcript | DONE | `scenarioPrompt()` supplies role/context/objective/constraints/turn plan; the live provider generates each reply. |
| Local learning memory exists | PARTIAL | `localLearningMemory.ts` is live from `App.tsx`, but its durable source was localStorage rather than SQLite. 1.0.4 adds a durable learner-event/skill-vector path. |
| FSRS learning exists | PARTIAL | `learning.ts` contains an FSRS-6 implementation and SQLite mirror functions, but synchronous state is still localStorage-first. |
| SQLite learning persistence exists | PARTIAL | migrations v3-v5 and `learningPersistence.ts` exist and are called, but `DatabaseManager` was configured with SQLite version 4 while migration v5 existed. This made the schema contract inconsistent. |
| Corpus provenance exists | PARTIAL | `DATA-PROVENANCE-1.0.3.md` documents policy, but corpus ingestion was not yet a standardized domain pipeline. |
| Common Voice parser V2 exists | MISSING | No dedicated Common Voice parser/domain record pipeline existed in the audited tree. |
| Scenario Engine V2 exists | MISSING | Scenario definitions were UI/library data plus prompt generation; no reusable runtime state/decision-signal engine was wired. |
| Weighted multidimensional evaluation exists | PARTIAL | Chat and learning had useful signals, but no reusable weighted evaluation contract connected to skill-vector updates. |
| Core architecture boundary exists | PARTIAL | `packages/core`, `packages/database`, and `apps/mobile` exist, but application/domain boundaries were not consistently enforced. |

## Critical findings

1. SQLite schema version was `4` while migration `v005_learning_os` existed and was executed. This is a real contract mismatch.
2. Durable learning errors were frequently swallowed in fallback paths, making persistence failures easy to miss.
3. Scenario state transitions were represented in metadata but not as a reusable runtime with explicit decision signals.
4. CEFR values in imported language-bank records could fall back to broad fixed ranges rather than an explicit estimate/confidence/method model.
5. Corpus provenance was documented but not structurally mandatory at the domain layer.

## 1.0.4 resolution

- SQLite schema version advanced to 6.
- Added normalized corpus/learner/scenario/evaluation/event tables.
- Added repository adapters.
- Added explicit corpus provenance types and validation-oriented ingestion.
- Added Common Voice TSV parser and candidate extraction.
- Added conservative CEFR estimation with confidence/method.
- Added Scenario V2 decision-signal runtime.
- Added weighted evaluation and skill-vector update logic.
- Connected active scenario chat responses to an asynchronous structured evaluation path that persists skill outcomes.
- Preserved the original source archive as an immutable baseline.

## Verification boundary

The core package passes system TypeScript compilation. Full mobile/Android compilation is not claimed because the extracted source does not contain installed `node_modules`; running the application build without those dependencies would be a false green.
