# راه‌اندازی درگاه زرین‌پال و پنل مدیریت

## معماری امنیتی

صفحه‌ی GitHub Pages فقط رابط کاربری است و نباید `merchant_id` یا `service_role_key` را در متغیرهای `VITE_*` قرار دهد. کد پروژه از دو Supabase Edge Function استفاده می‌کند:

- `zarinpal-request`: نشست کاربر را بررسی می‌کند، سبد خرید را از دیتابیس می‌خواند، مبلغ را روی سرور محاسبه می‌کند، سفارش را با وضعیت `pending` می‌سازد و کاربر را به درگاه هدایت می‌کند.
- `zarinpal-callback`: callback عمومی زرین‌پال را دریافت می‌کند، authority و مبلغ ذخیره‌شده را بررسی می‌کند، تراکنش را server-to-server verify می‌کند و فقط پس از پاسخ موفق سفارش را `paid` می‌کند.

در `CheckoutModal` هیچ شماره کارت، CVV یا تاریخ انقضایی دریافت یا ذخیره نمی‌شود. در حالت بدون متغیرهای Supabase، سایت همچنان در حالت دمو کار می‌کند و پرداخت واقعی انجام نمی‌دهد.

## استقرار Supabase

پس از نصب Supabase CLI و ورود به حساب پروژه، دستورات زیر را اجرا کنید:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set \
  ZARINPAL_MERCHANT_ID=YOUR_MERCHANT_ID \
  ZARINPAL_SANDBOX=true \
  PUBLIC_SITE_URL=https://milanorezaee2.github.io/Modara/ \
  ALLOWED_ORIGIN=https://milanorezaee2.github.io \
  MOBILE_RETURN_URL=com.modara.app://payment-callback
supabase functions deploy zarinpal-request
supabase functions deploy zarinpal-callback
```

مقدار `ZARINPAL_SANDBOX` را ابتدا `true` بگذارید. پس از تست کامل و فعال شدن درگاه پذیرنده، آن را به `false` تغییر دهید. مقدار `PUBLIC_SITE_URL` باید دقیقاً با آدرس منتشرشده‌ی سایت و مسیر پایه‌ی آن هماهنگ باشد. در اپ Native، `MOBILE_RETURN_URL` را روی scheme ثبت‌شده در Android/iOS بگذارید. تابع درخواست callback زرین‌پال را به Edge Function عمومی `zarinpal-callback` می‌فرستد؛ آن تابع authority و مبلغ را بررسی و تراکنش را server-to-server تأیید می‌کند و فقط سپس به این URL یا به `PUBLIC_SITE_URL` redirect می‌کند. برای iOS/Android، راهنمای کامل در [`MOBILE_BUILD.md`](./MOBILE_BUILD.md) است.

متغیرهای `SUPABASE_URL`، `SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY` در محیط Edge Function باید از پروژه‌ی Supabase تأمین شوند؛ `SUPABASE_SERVICE_ROLE_KEY` را در کد frontend یا GitHub Pages قرار ندهید.

در build سایت، این دو متغیر عمومی باید در محیط GitHub Actions تنظیم شوند تا سایت از حالت دمو خارج شود:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

## تعیین مدیر

برای حساب مدیر، نقش را در `app_metadata` تنظیم کنید؛ نقش را از `user_metadata` یا ورودی مرورگر نخوانید. این نمونه باید در محیط امن SQL و با ایمیل حساب واقعی اجرا شود:

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'admin@example.com';
```

سپس مدیر باید یک‌بار از حساب خارج و دوباره وارد شود تا JWT جدید شامل نقش `admin` باشد. پنل در مسیر زیر در دسترس است:

```text
https://mcdonun1-hub.github.io/ModernAra1/#admin
```

Migration `20260822100000_payment_admin.sql` ستون‌های payment metadata و policyهای RLS لازم برای مدیر را اضافه می‌کند. بدون اجرای `supabase db push`، پنل production و پرداخت واقعی را فعال نکنید.

## تست عملی

ابتدا با sandbox یک سفارش آزمایشی بسازید و این موارد را کنترل کنید:

1. سفارش قبل از redirect با وضعیت `pending` ایجاد شود.
2. مبلغ سفارش از دیتابیس و با واحد `IRT` محاسبه شود؛ مبلغ را از مرورگر اعتماد نکنید.
3. callback فقط وقتی `Status=OK` و `Authority` متعلق به همان سفارش است ادامه پیدا کند.
4. verify سمت سرور انجام شود و سفارش فقط یک‌بار به `paid` برسد.
5. callback تکراری، تراکنش لغوشده و تراکنش با مبلغ نادرست به‌درستی رد شوند.

مستندات رسمی API زرین‌پال: <https://www.zarinpal.com/docs/paymentGateway/connectToGateway>
