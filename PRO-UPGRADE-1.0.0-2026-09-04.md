# Ya-Ali Professional 1.0.0 — Learning OS + Runtime/Endpoint Intelligence

## هدف
این نسخه نخستین جهش معماری از «سیستم یادگیری دارای ذخیره‌سازی» به «Learning OS محلی و قابل بازیابی» است و هم‌زمان مسیر انتخاب Runtime و Endpoint را هوشمندتر می‌کند.

## یادگیری
- SQLite migration v5.
- append-only `learning_review_log` برای هر مرور FSRS-6.
- حفظ snapshot کامل state در هر review برای replay/recovery.
- تحلیل durable نرخ موفقیت، lapse و کیفیت مرور.
- `getLearningOptimizerReport()` هدف retention را فقط در بازه محافظه‌کارانه تنظیم می‌کند؛ پارامترهای 21گانه FSRS دست‌کاری نمی‌شوند.
- `learningRecovery.ts` برای audit ledger و آماده‌سازی replay کامل.
- حفظ یادگیری لهجه‌ها و eventهای تشخیص/اختلاط لهجه.

## Runtime
- `runtime_benchmarks` در SQLite.
- benchmark واقعی runtime محلی موجود.
- انتخاب سریع‌ترین Runtime موفق بر اساس chars/sec.
- پشتیبانی benchmark برای llama.cpp، ExecuTorch، ONNX GenAI و LiteRT-LM مطابق فرمت مدل نصب‌شده.
- مسیر LiteRT-LM دیگر صرفاً capability-detection نیست و از bridge تولید استفاده می‌کند.

## Endpoint
- Endpoint Pool با انتخاب health-aware.
- probe خودکار endpointهای stale.
- failover candidate selection.
- نگهداری latency/failure history.
- آماده‌سازی telemetry برای route events.

## Android/Build
- versionCode 8 / versionName 1.0.0.
- Node.js 20+.
- Capacitor 7.
- Android target/compile SDK 36.
- NDK 28.2.13676358.
- Gradle/AGP مطابق پیکربندی پروژه.
- `scripts/build-apk.sh` برای build تکرارپذیر debug APK.

## وضعیت Build
در محیط فعلی، APK به‌عنوان build-green ادعا نمی‌شود مگر dependencyهای npm و Gradle wrapper JAR و Android SDK کامل در دسترس باشند. اسکریپت build دقیقاً این پیش‌نیازها را بررسی می‌کند.
