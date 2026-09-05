#!/usr/bin/env bash
# رفع پرانتز جا افتاده در App.tsx: {[ ... ] as const).map( -> {([ ... ] as const).map(
# اجرا از ریشه‌ی ریپو: cd /workspaces/Ya-Ali && bash fix_providerGrid_paren.sh
set -e
cd apps/mobile/src

python3 - <<'PYEOF'
path = "App.tsx"
with open(path,"r",encoding="utf-8") as f:
    content = f.read()

old = """            <div className="providerGrid">
              {[
                [
                  'ollama',
                  'Ollama',
                ],
                [
                  'lmstudio',
                  'LM Studio',
                ],
                [
                  'llamacpp',
                  'llama.cpp',
                ],
                [
                  'localai',
                  'LocalAI',
                ],
                [
                  'vllm',
                  'vLLM',
                ],
                [
                  'mlc',
                  'MLC',
                ],
              ] as const).map("""

new = """            <div className="providerGrid">
              {([
                [
                  'ollama',
                  'Ollama',
                ],
                [
                  'lmstudio',
                  'LM Studio',
                ],
                [
                  'llamacpp',
                  'llama.cpp',
                ],
                [
                  'localai',
                  'LocalAI',
                ],
                [
                  'vllm',
                  'vLLM',
                ],
                [
                  'mlc',
                  'MLC',
                ],
              ] as const).map("""

c = content.count(old)
print(f"الگو {c} بار پیدا شد.")
if c == 1:
    content = content.replace(old, new)
    with open(path,"w",encoding="utf-8") as f:
        f.write(content)
    print("✅ پرانتز اضافه شد.")
elif c == 0:
    print("⚠️ الگوی دقیق پیدا نشد — فایل ممکن است کمی فرق داشته باشد. لطفاً این را اجرا کنید و خروجی را بفرستید:")
    print("  sed -n '3460,3496p' apps/mobile/src/App.tsx")
else:
    print("⚠️ بیش از ۱ مورد پیدا شد — دستی بررسی لازم است.")
PYEOF
