# Ya Ali 1.0.4 — Pronunciation and Audio Provenance

The app now has two distinct audio layers:

1. **Voice Pack Manager** — manages reusable external voice/model packs.
2. **Pronunciation Manager** — attaches one or more concrete audio files to a specific word/phrase/sentence in the language bank.

## Pronunciation Manager

A pronunciation asset records:

- bank item ID
- locale
- source type (local file or HTTPS URL)
- source name
- license when supplied
- MIME type
- byte size
- SHA-256 when Web Crypto is available
- creation time

Audio is stored in IndexedDB, not localStorage, and is independently deletable.

External URLs must be HTTPS and CORS-readable by the WebView. A URL that cannot be fetched is rejected instead of being recorded as if it were installed.

Maximum pronunciation asset size: 64 MiB.

## Licensing rule

The application never silently assigns a license to user-supplied audio. The source and license fields are explicit.

For Common Voice, the current official dataset catalog lists many releases as CC0-1.0 and Mozilla's terms state that Common Voice datasets are provided publicly under CC0 unless otherwise specified; the project must still preserve the exact dataset/version used. citeturn0search0turn0search1

For any other corpus or audio source, the exact license and attribution requirements must be verified before it is redistributed as a built-in Ya Ali asset.
