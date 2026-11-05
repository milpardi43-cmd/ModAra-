# راهنمای اپ Hybrid مُدارا

## محدوده و پیش‌نیازها

این اپ، رابط فعلی React/Vite را با Capacitor در پوستهٔ Native اجرا می‌کند؛ منطق سبد، ورود و خریدِ موجود حفظ شده است و نسخهٔ وب همچنان جداگانه ساخته می‌شود. شناسهٔ اپ `com.modara.app` است. پروژهٔ Android حداقل API 24 و پروژهٔ iOS حداقل iOS 15 را هدف می‌گیرد.

برای build و امضای Android، Android Studio، JDK/Android SDK سازگار با پروژه و کلید امضای متعلق به ناشر لازم است. برای iOS، macOS، Xcode، حساب Apple Developer و signing/provisioning معتبر لازم است. کلید امضا، گواهی، فایل Firebase یا secret را در مخزن نگذارید.

## ساخت و همگام‌سازی

```bash
npm install
npm run build:mobile
```

این فرمان Vite را با `BASE_PATH=/` اجرا می‌کند و سپس `cap sync` را برای Android و iOS اجرا می‌کند. خروجی وب در `dist/` است؛ فرمان به‌تنهایی APK، AAB یا IPA امضاشده نمی‌سازد.

### Android

```bash
npm run cap:open:android
```

در Android Studio، Gradle sync را کامل کنید، دستگاه یا emulator را انتخاب و برای تست Run کنید. برای انتشار، در بخش Build/Generate Signed Bundle یا APK، کلید متعلق به خودتان را انتخاب کنید و AAB امضاشده بسازید. تنظیمات bundle id، نسخه، keystore و دسترسی‌های انتشار را پیش از انتشار بازبینی کنید.

### iOS

```bash
npm run cap:open:ios
```

در Xcode، Team و Bundle Identifier را تنظیم کنید، دستگاه واقعی یا simulator را انتخاب و برای تست build کنید. برای توزیع، signing و provisioning معتبر انتخاب و از Archive/Organizer خروجی بگیرید. این مرحله روی Linux یا Windows قابل انجام نیست.

پس از تغییر plugin، `capacitor.config.ts` یا فایل‌های web، `npm run build:mobile` را دوباره اجرا کنید تا پروژه‌های Native sync شوند. آیکون و splash را از `assets/logo.svg` بازتولید کنید:

```bash
npm run assets:mobile
npm run build:mobile
```

فایل‌های تولیدشده و خروجی‌های build را بررسی کنید و فقط assets لازم را نگه دارید؛ هیچ گواهی یا credential به Git اضافه نکنید.

## محیط و آدرس اشتراک‌گذاری

در صورت اتصال به Supabase واقعی، مقادیر عمومی کلاینت را هنگام build تنظیم کنید (نمونه در `.env.example`):

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
VITE_PUBLIC_SITE_URL=https://milanorezaee2.github.io/Modara/
```

`VITE_PUBLIC_SITE_URL` برای ساخت لینک وبِ قابل اشتراک محصولات است؛ مقدار دلخواه باید آدرس canonical واقعی فروشگاه باشد. متغیرهای `VITE_*` داخل برنامهٔ کاربر قرار می‌گیرند و محل secret نیستند. بدون متغیرهای Supabase، برنامه در حالت demo/local اجرا می‌شود؛ این حالت به معنی سفارش، پرداخت یا backend production نیست.

برای وب، build عادی مسیر GitHub Pages یعنی `/Modara/` را حفظ می‌کند؛ `npm run build:netlify` برای مسیر `/` است. برای اپ، فقط از `npm run build:mobile` استفاده کنید.

## بازگشت امن از پرداخت

مسیر Native `com.modara.app://payment-callback` در Android و iOS ثبت شده است. ابتدا لازم است هر دو Edge Function روی همان پروژهٔ Supabase مستقر باشند:

```bash
supabase functions deploy zarinpal-request
supabase functions deploy zarinpal-callback
```

در Supabase، `zarinpal-callback` باید بدون JWT ورودی قابل دسترسی باشد تا درگاه بتواند callback را فراخوانی کند؛ این تابع از قبل در `supabase/config.toml` با `verify_jwt = false` تعریف شده است. تابع درخواست، callback را به `/functions/v1/zarinpal-callback` می‌فرستد؛ تابع callback سفارش و authority را تطبیق می‌دهد و تراکنش را مستقیماً با زرین‌پال verify می‌کند. فقط پس از تأیید سرور وضعیت سفارش `paid` می‌شود و سپس نتیجه به وب یا deep link اپ برمی‌گردد.

Secretهای Edge Function را در داشبورد Supabase یا با CLI تنظیم کنید؛ نمونهٔ زیر را با مقادیر واقعی پروژه جایگزین کنید و هیچ secretای را در اپ یا مخزن قرار ندهید:

```bash
supabase secrets set \
  ZARINPAL_MERCHANT_ID=<merchant-id> \
  ZARINPAL_SANDBOX=true \
  PUBLIC_SITE_URL=https://milanorezaee2.github.io/Modara/ \
  MOBILE_RETURN_URL=com.modara.app://payment-callback
```

`SUPABASE_URL`، `SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY` باید در محیط Edge Functions پروژه حاضر باشند؛ کلید service role هرگز نباید در frontend باشد. ابتدا از sandbox استفاده و end-to-end را با سفارش آزمایشی روی پروژهٔ واقعی بررسی کنید. تنها بعد از فعال‌سازی پذیرنده، sandbox را خاموش کنید. جزئیات کلی در [`PAYMENT_SETUP.md`](./PAYMENT_SETUP.md) آمده است.

پاسخ query یا deep link به‌تنهایی اثبات پرداخت نیست. اگر Edge Functionها، تنظیمات Supabase/ZarinPal، دیتابیس و schema لازم مستقر نباشند، پرداخت واقعی کار نمی‌کند؛ این مخزن/محیط آن استقرار را انجام نمی‌دهد.

## اعلان‌های Push

کلاینت فقط وقتی `VITE_PUSH_TOKEN_ENDPOINT` هنگام build تنظیم شده باشد، امکان درخواست مجوز اعلان را نشان می‌دهد. تا پیش از آن، مجوز درخواست نمی‌شود و Push فعال نیست. endpoint باید HTTPS و احراز هویت‌شده باشد؛ کلاینت درخواست `POST` با JSON زیر می‌فرستد و access token نشست Supabase را در `Authorization: Bearer ...` قرار می‌دهد:

```json
{"token":"<device-token>","platform":"android-or-ios"}
```

مالک backend باید JWT را اعتبارسنجی کند، توکن را به کاربر و دستگاه درست نسبت دهد، به‌روزرسانی/حذف توکن را پشتیبانی کند و ارسال واقعی اعلان را پیاده‌سازی کند. همچنین تنظیمات واقعی FCM برای Android و APNs/پیکربندی لازم iOS باید به پروژهٔ Native اضافه شوند؛ فایل‌های `google-services.json` و `GoogleService-Info.plist` یا کلید APNs در این مخزن تأمین نشده‌اند. صرف دریافت توکن یا فعال‌شدن prompt به معنی راه‌اندازی ارسال Push نیست.

## بررسی پیش از انتشار

- `npm run typecheck`, `npm run lint`, `npm run build` و `npm run build:netlify` را اجرا کنید.
- `npm run build:mobile` را اجرا و تغییرات Android/iOS را در diff بازبینی کنید.
- روی دستگاه واقعی، safe area، کیبورد، Android Back، share، هپتیک، ورود، سبد و مسیر برگشت پرداخت را بررسی کنید.
- پرداخت را تنها با sandbox و تأیید سمت سرور آزمایش کنید؛ Push را فقط پس از پیکربندی FCM/APNs و endpoint واقعی آزمایش کنید.
- APK/AAB و iOS Archive را روی سیستم‌های دارای SDK/Xcode بسازید و با signing متعلق به ناشر امضا کنید.
