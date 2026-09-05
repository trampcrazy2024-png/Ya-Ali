# ADR-0002: FSRS-6 + adaptive skill scheduling

## Decision
Use FSRS-6-compatible scheduling as the single interval authority and layer adaptive skill prioritization above it.

## Why
FSRS-6 models difficulty, stability and retrievability and supports all reviews rather than a legacy ease-only multiplier. The adaptive layer can therefore choose *what* to study without corrupting *when* it should recur.

## Rejected
A hand-written ease multiplier was rejected because it does not model stability/retrievability and makes long-term scheduling less consistent.

## When not to use
Do not alter the scheduler from UI components or create a second interval algorithm for a feature.

## Operational consequence
State is versioned in local storage and migrated from the legacy scheduler. Future SQLite persistence can preserve the same state contract.

Sources: FSRS-6 algorithm documentation and `ts-fsrs` ecosystem. Review this ADR if FSRS changes major version.
