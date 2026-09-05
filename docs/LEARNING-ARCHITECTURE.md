# Ya-Ali Learning Architecture 0.7.0

## Scheduler
Ya-Ali uses an FSRS-6-compatible DSR scheduler with the published 21 default parameters. The scheduler stores stability, difficulty, retrievability-derived intervals, lapses, review timestamps and rating history state.

## Adaptive layer
The queue combines overdue time, difficulty, lapse count and skill signals. Skills are vocabulary, grammar, pronunciation, listening and conversation. Review outcomes update both the card state and the skill vector.

## Migration
The former `yaali_srs_v1` state is migrated into the versioned FSRS-6 state on first read. No old review data is intentionally deleted.

## When not to use
Do not replace FSRS intervals with ad-hoc ease multipliers in UI code. UI should call the learning service so the scheduler remains the single source of truth.

## Operational consequence
The current state remains local-first and exportable. A future SQLite migration can move the same versioned state and review log without changing the scheduler contract.

**Stale when:** FSRS parameters or the learning-state schema changes.

Code: `apps/mobile/src/learning.ts`, `apps/mobile/src/services/adaptiveLearning.ts`.
