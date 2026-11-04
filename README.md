# مُدارا | ModAra

[![CI](https://github.com/milanorezaee2/Modara/actions/workflows/ci.yml/badge.svg)](https://github.com/milanorezaee2/Modara/actions/workflows/ci.yml)

فروشگاه آنلاین مد و فشن (React + TypeScript + Vite + Tailwind).

## اجرای سریع (بدون هیچ تنظیماتی)

```bash
npm install
npm run dev
```

سپس آدرس نمایش‌داده‌شده در ترمینال را در مرورگر باز کنید (به‌صورت پیش‌فرض `http://localhost:5173`).
سرور روی `0.0.0.0` گوش می‌دهد، بنابراین از طریق آدرس شبکه/پیش‌نمایش هم مستقیماً در کروم قابل باز کردن است.

### حالت دمو (پیش‌فرض)

اگر متغیرهای محیطی Supabase تنظیم نشده باشند، برنامه به‌صورت خودکار از یک بک‌اند محلی داخل مرورگر
استفاده می‌کند (`src/lib/localBackend.ts`) که داده‌های اولیه‌اش از فایل‌های
`supabase/migrations/*.sql` استخراج شده است (`src/lib/demoSeed.ts`).

در این حالت همه‌ی بخش‌ها کار می‌کنند:

- صفحه اصلی، فروشگاه، فیلتر دسته‌بندی، مرتب‌سازی و جست‌وجو
- صفحه محصول، محصولات مرتبط و ثبت نظر
- ثبت‌نام / ورود (کاربر به‌صورت محلی در مرورگر ذخیره می‌شود)
- سبد خرید، تسویه‌حساب و تاریخچه سفارش‌ها
- وبلاگ و صفحه مقاله

داده‌ها در `localStorage` نگهداری می‌شوند؛ برای ریست‌کردن، `localStorage` را پاک کنید.

### اتصال به Supabase واقعی

فایل `.env` بسازید (نمونه در `.env.example`):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

با وجود این مقادیر، برنامه به‌جای بک‌اند محلی از کلاینت واقعی Supabase استفاده می‌کند و
مایگریشن‌های موجود در `supabase/migrations` را می‌توانید روی پروژه اجرا کنید.

## تصاویر رگال و پالت رنگ

هیروی صفحه‌ی اصلی («رگال») هر محصول را به‌صورت نواری باریک و تمام‌قد نشان می‌دهد.
این نوارها و رنگ میانگین هر پارچه از روی عکس‌های اصلی ساخته می‌شوند:

```bash
npm run images:rack     # می‌سازد public/images/rack/**  (نوار ۷۲px برای هر محصول)
npm run images:palette   # می‌سازد src/lib/productPalette.ts (رنگ و روشنایی هر محصول)
```

پس از افزودن یا تغییر عکس محصول، هر دو را دوباره اجرا کنید.

## اسکریپت‌ها

| دستور | توضیح |
| --- | --- |
| `npm run dev` | اجرای سرور توسعه |
| `npm run build` | ساخت نسخه production در `dist` |
| `npm run build:netlify` | همان build با `BASE_PATH=/` (عیناً مثل Netlify) |
| `npm run verify:live <url>` | مقایسهٔ اثرانگشت باندل سایت زنده با `dist/` |
| `npm run preview` | سرو کردن خروجی build |
| `npm run lint` | اجرای ESLint |
| `npm run typecheck` | بررسی تایپ‌ها با TypeScript |

## انتشار روی GitHub Pages

ورک‌فلوی `.github/workflows/deploy.yml` با هر پوش روی `main` پروژه را build و منتشر می‌کند.
چون Pages این ریپو را زیر مسیر `/Modara/` سرو می‌کند، `vite.config.ts` هنگام build مقدار
`base` را روی `/Modara/` می‌گذارد و همهٔ تصاویر با تابع `asset()` (در `src/lib/format.ts`)
نسبت به همان مسیر ساخته می‌شوند. برای انتشار روی دامنهٔ اختصاصی یا ریشهٔ سایت:

```bash
BASE_PATH=/ npm run build
```

## انتشار روی Netlify

فایل `netlify.toml` از قبل آماده است (build: `npm run build`، publish: `dist`،
`BASE_PATH=/`، redirect، هدرهای کش و امنیتی). کافی است ریپو را در Netlify ایمپورت کنید.
بعد از اتصال، هر merge روی `main` به‌صورت خودکار منتشر می‌شود و هر Pull Request یک
Deploy Preview می‌گیرد؛ برای اثبات اینکه همان بیلد روی سایت زنده است:

```bash
npm run build:netlify
npm run verify:live https://<your-site>.netlify.app
```

راهنمای گام‌به‌گام، متغیرهای محیطی، دامنهٔ اختصاصی، عیب‌یابی و چک‌لیست انتشار:
[`NETLIFY_DEPLOY.md`](./NETLIFY_DEPLOY.md)
