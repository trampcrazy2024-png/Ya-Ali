# Ya-Ali 1.0.2 — Adaptive Learning

## Learning model
- FSRS-6-compatible review state remains the scheduling backbone.
- A five-dimensional skill vector tracks grammar, vocabulary, pronunciation, listening and conversation.
- CEFR is used as a progression signal from Pre-A1 through C2.
- Six learning modes rotate to prevent single-modality overfitting: recall, recognition, listening, pronunciation, cloze and conversation.

## Daily plan
`buildLearningPlan()` accepts a card limit and time budget. It ranks overdue/difficult cards, biases toward the weakest skill, estimates task duration and prevents a plan from exceeding the time budget unless the first card itself is longer than the budget.

## Language bank
Built-in filtering now admits Iraqi, Lebanese/Levantine, Gulf, Saudi, Egyptian, Palestinian/Jordanian, MSA and American English labels, while import normalization still rejects ambiguous entries unless a fallback dialect is supplied.

## Voice resources
Voice packs are external resources rather than APK payloads. Custom sources can be registered, downloaded, checked for a 512MB limit and recorded with SHA-256 metadata.

## Success metrics
Track retention, lapse rate, overdue backlog, skill balance, daily completion, modality diversity and time-to-mastery.
