# Ya-Ali Professional 1.0.1 — Release Repair Report

## علت خطای GitHub/TypeScript

نسخه 1.0.0 در `apps/mobile/src/App.tsx` چند خطای واقعی در JSX داشت. مهم‌ترین مورد در Endpoint Lab بود: دکمه MLC خارج از `providerGrid` قرار گرفته و یک `</div>` اضافی باعث می‌شد parser ساختار بعدی را داخل `section` اشتباه تفسیر کند. همچنین `registerPlugin<any>(...)` مستقیماً داخل JSX attribute expression قرار گرفته بود و در TSX به شکل JSX generic تفسیر می‌شد.

## اصلاحات

- App.tsx: اصلاح nesting بخش Endpoint Lab.
- App.tsx: تعریف `LocalAI` خارج از JSX و استفاده از آن برای `pickTokenizer`.
- learning.ts: سازگار کردن optional property با `exactOptionalPropertyTypes`.
- deviceHealth.ts: ساختن object به‌صورت conditional برای optional fields.
- learningRecovery.ts: ثبت `latestEventAt` فقط در صورت وجود.
- endpointPersistence.ts: حذف assignmentهای `undefined` به optional fields.
- runtimeBenchmark.ts: اصلاح optional `backend`، type callbackها و فراخوانی LiteRT-LM benchmark.
- voicePackManager.ts: کپی chunkهای Fetch به `ArrayBuffer` برای سازگاری TypeScript/DOM و Blob.
- نسخه به 1.0.1 و Android versionCode به 9 افزایش یافت.
- build script به نام artifact نسخه 1.0.1 اصلاح شد.

## اعتبارسنجی انجام‌شده

- TypeScript parser روی 43 فایل TS/TSX: PASS
- JSX ساختاری App.tsx: PASS
- خطاهای exactOptionalPropertyTypes در فایل‌های گزارش‌شده: رفع شد.
- `git diff --check`: باید در محیط Git اجرا شود؛ source package بدون خطای whitespace شناخته‌شده تولید شده است.

## اصلاح CI/CD و Build

- GitHub Actions اکنون با Android API 36، NDK 28.2.13676358 و Gradle 8.13 هم‌راستا است.
- CI قبل از Capacitor sync، `npm run typecheck` و وجود `apps/mobile/dist/index.html` را بررسی می‌کند.
- CI دیگر به `gradle-wrapper.jar` موجود در مخزن وابسته نیست و از `gradle/actions/setup-gradle@v4` استفاده می‌کند.
- اسکریپت محلی `scripts/build-apk.sh` اگر wrapper کامل موجود نباشد، از Gradle سیستم استفاده می‌کند.

## نکته Build

قبل از `assembleDebug` باید در GitHub/Codespace اجرا شود:

```bash
npm ci
npm run typecheck
npm run build
npx cap sync android
cd android
./gradlew clean assembleDebug --no-daemon
```

فقط پس از موفقیت این زنجیره، APK همان commit را نصب کنید.
