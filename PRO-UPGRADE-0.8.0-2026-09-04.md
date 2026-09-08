# Ya-Ali Professional 0.8.0

This release advances both learning intelligence and runtime architecture.

### Learning v2
- weighted dialect skill mastery
- retention and progression level
- daily adaptive goal
- dialect-specific next-review timing
- confusion-risk tracking
- pronunciation results feed dialect learning
- append-only durable learning event log

### Architecture v2
- Android Keystore secure secret storage
- automatic migration of native API secrets out of localStorage
- multi-endpoint profile pool with capability-aware selection
- endpoint health/latency/priority scoring
- SQLite schema v3 for learning telemetry
- diagnostics visibility for secure storage, endpoint pool, and learning durability

No runtime format is misrepresented: GGUF remains llama.cpp-native; non-GGUF models use their explicit runtimes or compatible endpoints.
