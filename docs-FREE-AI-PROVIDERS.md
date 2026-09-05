# Ya Ali — Free / Trial AI Providers

The app supports multiple provider paths so no single cloud service is required.

| Provider | Credential | Free status / note |
|---|---|---|
| Gemini | API key | Google documents a free tier for eligible Gemini API usage; availability depends on the account/model. |
| Groq | API key | Groq exposes current hosted models and free/developer limits; model availability can change. |
| OpenRouter | API key | Free models/router can be used when the selected model is currently free. |
| Hugging Face | HF token with Inference Providers permission | Free accounts currently receive a small monthly inference credit; it is not unlimited. |
| Cloudflare Workers AI | Account ID + API token | Workers AI currently includes a daily free allocation on the Workers Free plan; model-specific restrictions can apply. |
| Cerebras | API key | Current offering includes a one-time free trial credit; treat it as trial, not permanent free usage. |

Cloud services are optional. Ya Ali prioritizes a loaded local GGUF model before cloud providers.

Provider availability and pricing/quotas can change, so the app's connection test is the authoritative runtime check.
