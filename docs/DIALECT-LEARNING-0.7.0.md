# Ya-Ali 0.7.0 — Dialect Learning Engine

## هدف
یادگیری لهجه از «انتخاب یک prompt» به یک مسیر مستقل و قابل اندازه‌گیری تبدیل شد.

## قابلیت‌ها
- پروفایل مستقل برای عراقی، لبنانی، خلیجی، سعودی، مصری، MSA و انگلیسی آمریکایی.
- نرمال‌سازی برچسب‌های بانک به شناسه استاندارد لهجه.
- mastery، confidence، exposure، streak، success و review برای هر لهجه.
- امتیاز جداگانه برای vocabulary، grammar، listening، pronunciation، conversation و recognition.
- ثبت confusion بین لهجه‌ها برای تشخیص نقاط اختلاط.
- برنامه تمرینی لهجه‌محور با اولویت FSRS + وضعیت mastery.
- تمرین لهجه انتخاب‌شده بدون مخلوط‌کردن خودکار با لهجه دیگر.
- guardrail و learning focus اختصاصی در prompt هر لهجه.
- اتصال امتیازدهی کارت‌های یادگیری به پروفایل همان لهجه.

## معماری
`LanguageBank -> Dialect Normalizer -> Dialect Profile -> Dialect Mastery -> FSRS Priority -> Skill Focus -> Review`

داده پروفایل فعلاً versioned در localStorage نگهداری می‌شود تا در مرحله بعد بتوان آن را بدون تغییر API به SQLite منتقل کرد.
