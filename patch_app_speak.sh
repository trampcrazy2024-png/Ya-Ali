#!/usr/bin/env bash
# پچ نقطه‌ای App.tsx: رفع خطای TS2345 (x.text / current.text ممکن است undefined باشد)
# اجرا از ریشه‌ی ریپو: cd /workspaces/Ya-Ali && bash patch_app_speak.sh
set -e
cd apps/mobile/src

python3 - <<'PYEOF'
path = "App.tsx"
with open(path,"r",encoding="utf-8") as f:
    content = f.read()

fixes = [
    ("void speak(x.text,getLangCode(x.dialect,x.source_language==='en'?'english':'arabic'))",
     "void speak(x.text||'',getLangCode(x.dialect,x.source_language==='en'?'english':'arabic'))"),
    ("void speak(current.text,getLangCode(current.dialect,current.source_language==='en'?'english':'arabic'))",
     "void speak(current.text||'',getLangCode(current.dialect,current.source_language==='en'?'english':'arabic'))"),
]
total = 0
for old,new in fixes:
    c = content.count(old)
    print(f"الگو {c} بار پیدا شد: {old[:60]}...")
    total += c
    if c:
        content = content.replace(old,new)

if total == 0:
    print("⚠️ هیچ الگویی پیدا نشد — احتمالاً محتوای فایل با نسخه‌ای که پچ برایش نوشته شده فرق دارد.")
else:
    with open(path,"w",encoding="utf-8") as f:
        f.write(content)
    print(f"✅ {total} مورد پچ شد.")
PYEOF
