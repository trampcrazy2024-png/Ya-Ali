#!/usr/bin/env bash
# پچ جامع App.tsx: هم text و هم dialect را برای speak()/getLangCode() ایمن می‌کند
# اگر قبلاً patch_app_speak.sh را اجرا کرده‌اید، اشکالی ندارد — این نسخه idempotent است.
# اجرا از ریشه‌ی ریپو: cd /workspaces/Ya-Ali && bash patch_app_speak2.sh
set -e
cd apps/mobile/src

python3 - <<'PYEOF'
path = "App.tsx"
with open(path,"r",encoding="utf-8") as f:
    content = f.read()

# حالت ۱: اگر پچ قبلی (فقط text) اجرا شده باشد
step1 = [
    ("speak(x.text||'',getLangCode(x.dialect,x.source_language==='en'?'english':'arabic'))",
     "speak(x.text||'',getLangCode(x.dialect||'',x.source_language==='en'?'english':'arabic'))"),
    ("speak(current.text||'',getLangCode(current.dialect,current.source_language==='en'?'english':'arabic'))",
     "speak(current.text||'',getLangCode(current.dialect||'',current.source_language==='en'?'english':'arabic'))"),
]
# حالت ۲: اگر هیچ پچی اجرا نشده (نسخه اصلی خام)
step2 = [
    ("speak(x.text,getLangCode(x.dialect,x.source_language==='en'?'english':'arabic'))",
     "speak(x.text||'',getLangCode(x.dialect||'',x.source_language==='en'?'english':'arabic'))"),
    ("speak(current.text,getLangCode(current.dialect,current.source_language==='en'?'english':'arabic'))",
     "speak(current.text||'',getLangCode(current.dialect||'',current.source_language==='en'?'english':'arabic'))"),
]

total = 0
for old,new in step1 + step2:
    c = content.count(old)
    if c:
        content = content.replace(old,new)
        total += c

if total == 0:
    print("ℹ️ هیچ الگویی برای پچ پیدا نشد — یا قبلاً کامل پچ شده یا محتوای فایل فرق دارد.")
else:
    with open(path,"w",encoding="utf-8") as f:
        f.write(content)
    print(f"✅ {total} مورد پچ شد (text و dialect هر دو ایمن شدند).")
PYEOF
