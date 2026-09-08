# Adaptive Learning Loop 1.0.4

Conversation → turn evaluation → weighted skill outcomes → durable learner event → skill vector update → FSRS/review state → next-session recommendation.

Evaluation is multidimensional and evidence-based. A single overall score is never the only persisted learning signal.

FSRS remains the scheduling mechanism; it should not be replaced with an ad-hoc interval algorithm. Existing local FSRS state is migrated gradually into the durable SQLite projection.
