# Ya-Ali Endpoint Compatibility 0.6.0

Ya-Ali treats local AI servers as protocol capabilities rather than vendor names.

## Detection matrix
- OpenAI-compatible: `/v1/models`, `/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`
- Ollama: `/api/tags`, `/api/chat`, `/api/generate`, `/api/embed`, `/api/embeddings`, `/api/show`
- LM Studio: `/api/v1/models`, `/api/v1/chat`, plus OpenAI-compatible `/v1/*`
- llama.cpp: `/v1/*` and legacy `/completion`
- LocalAI: `/v1/*`, `/readyz`/`/healthz` when exposed
- vLLM: `/v1/*`, `/health`
- MLC LLM gateways: OpenAI-compatible `/v1/*`

## Generation order
The custom endpoint adapter tries OpenAI Chat Completions, OpenAI Responses, LM Studio native chat, Ollama native chat, Ollama generate, then legacy llama.cpp completion. This maximizes interoperability without claiming that every server implements every route.

## Security
Bearer tokens are scoped to the configured endpoint. Diagnostic/export paths must redact them. Prefer HTTPS or an authenticated private tunnel in production; cleartext LAN is a development convenience only.

## Android LAN
A server running on another computer must use its LAN address, never `localhost` or `127.0.0.1`.

**Stale when:** upstream protocol contracts or route availability change.

Code: `apps/mobile/src/services/endpointMatrix.ts`, `apps/mobile/src/ai.ts`.
