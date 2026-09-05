# Ya Ali — Runtime Fix 2026-09-04

This checkpoint/fix addresses the installed-device report received after runtime testing.

## Fixed / hardened

1. **STT crash path**
   - Removed direct in-process `SpeechRecognizer.startListening()` as the primary path.
   - Android system recognition Activity is now the primary STT path, reducing OEM RecognitionService crash risk.
   - Microphone permission and service availability are checked before launch.
   - Offline recognition remains a preference when the installed speech service supports it.

2. **Conversation persistence**
   - Conversations are automatically saved locally after messages change.
   - Previous conversations can be reopened later.
   - New conversation, delete, JSON export and JSON import were added.
   - The complete message list is retained locally (up to 500 messages per conversation / 100 conversations).

3. **Language-bank JSON import**
   - Import accepts Ya Ali exports and common JSON structures (`items`, `data`, `entries`, `words`, `phrases`, `vocabulary`, `bank`, `records`).
   - Common field names are normalized into the internal schema.
   - A default dialect can be selected before import: Iraqi / Lebanese / American English.
   - Generic/unsupported dialect labels use the selected fallback instead of silently disappearing.
   - Import count is logged and shown to the user.

4. **Local GGUF startup**
   - The last selected GGUF model is automatically reloaded on app startup when its stored path is available.
   - Empty local-model responses now produce an actionable error.

5. **Non-GGUF local models**
   - Local endpoint support is hardened for OpenAI-compatible servers and native Ollama `/api/chat` fallback.
   - Model name can be discovered or entered manually.
   - Custom Endpoint can be tested directly.
   - Local Endpoint is allowed even when Android reports no Internet connection, so LAN-only local AI can work.
   - Intended targets: Ollama, LM Studio and LocalAI using a reachable local endpoint.

6. **Tab colors**
   - Added fixed per-tab active colors and an always-visible top accent bar.
   - Each of the 7 tabs now has a distinct active color.

7. **Launcher icon**
   - Manifest now explicitly declares `@mipmap/ic_launcher` and `@mipmap/ic_launcher_round`.
   - Android versionCode/versionName bumped to 2 / 1.1 so an update cannot be confused with the previous installed package.
   - Existing Ya Ali launcher assets remain the source artwork.

8. **Language locale fallback**
   - Raw Arabic text now falls back to `ar-IQ` instead of `ar-SA`.

## Validation

- New conversation store TypeScript module: passed standalone TypeScript syntax/type check.
- Java brace/parenthesis structural checks: passed for MainActivity, LocalAIPlugin and NativeSTTPlugin.
- Android XML parsing: passed for manifest and adaptive icon XML.
- Full Android build was not executed in this container because project dependencies/node_modules are not installed; do not treat this report as a claim of a green APK build.

## Next runtime step

After installing the new APK, test the microphone and local model once. If STT or native Local AI still crashes, send the Android Logcat from the app's **عیب‌یابی** tab in the next message.
