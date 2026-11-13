# استقرار مُدارا روی Netlify — راهنمای حرفه‌ای

این سند دقیقاً برای همین پروژه (Vite + React + TypeScript، روتینگ hash-based، بک‌اند اختیاری Supabase) نوشته شده است.
هدف: یک استقرار **تکرارپذیر، سریع، امن و قابل بازگشت** روی CDN جهانی Netlify.

---

## ۰) نقشهٔ راه در یک نگاه

| مرحله | چه کاری | زمان تقریبی |
| --- | --- | --- |
| ۱ | آماده‌سازی و تست build محلی | ۵ دقیقه |
| ۲ | اطمینان از درستی `netlify.toml` (از قبل در ریپو هست) | — |
| ۳ | اتصال ریپو در Netlify و اولین Deploy | ۵ دقیقه |
| ۴ | تنظیم متغیرهای محیطی (اختیاری: Supabase) | ۲ دقیقه |
| ۵ | دامنهٔ اختصاصی + HTTPS | ۱۰ دقیقه |
| ۶ | چک‌لیست پس از انتشار و بهینه‌سازی | ۱۰ دقیقه |

**معماری استقرار:** Netlify فقط فایل‌های ایستا (`dist/`) را سرو می‌کند. هیچ سرور Node‌ای اجرا نمی‌شود.
بنابراین:

- داده‌های دمو (اگر Supabase تنظیم نشده باشد) در `localStorage` مرورگرِ کاربر ذخیره می‌شوند → هر بازدیدکننده کاتالوگ خودش را می‌بیند.
- دادهٔ واقعی و مشترک فقط با اتصال Supabase به‌دست می‌آید (بخش ۴).

---

## ۱) آماده‌سازی و تست محلی (قبل از هر Deploy)

روی سیستم خودتان، در ریشهٔ ریپو:

```bash
# ۱) نصب دقیق و تکرارپذیر وابستگی‌ها (بر اساس package-lock.json)
npm ci

# ۲) کنترل کیفیت
npm run typecheck
npm run lint

# ۳) build عیناً مثل Netlify (با base = "/")
BASE_PATH=/ npm run build

# ۴) پیش‌نمایش خروجی production
npm run preview      # → http://localhost:4173
```

اگر مرحلهٔ ۴ درست بالا آمد (هیرو سینمایی، تصاویر، ناوبری `#/shop`)، Netlify هم درست کار می‌کند.
تست محلی روی پورت ۴۱۷۳ همان چیزی است که روی CDN اجرا می‌شود.

> **نکتهٔ حیاتی:** پیش‌فرض `vite.config.ts` هنگام build مسیر پایه را `/Modara/` می‌گذارد
> (چون GitHub Pages این ریپو را زیر آن زیرمسیر سرو می‌کند). Netlify سایت را از **ریشهٔ دامنه**
> سرو می‌کند؛ پس `BASE_PATH` باید `/` باشد. این کار در `netlify.toml` انجام شده است و
> اگر فراموش شود، نتیجه‌اش **صفحهٔ سفید و ۴۰۴ برای `/assets/*`** است.

---

## ۲) فایل `netlify.toml` — چه چیزی و چرا

این فایل در ریشهٔ ریپو قرار دارد و Netlify آن را خودکار می‌خواند (نیازی به تنظیم دستی در پنل نیست):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
  BASE_PATH = "/"
```

| مورد | کارکرد |
| --- | --- |
| `command` | دستور ساخت پروژه |
| `publish` | پوشه‌ای که به CDN آپلود می‌شود (`dist`) |
| `NODE_VERSION` | نسخهٔ Node در محیط build (هم‌راستا با `.nvmrc`) |
| `BASE_PATH = "/"` | ریشهٔ دامنه؛ بدون آن صفحه سفید می‌شود |
| `[[redirects]] /* → /index.html (200)` | مسیرهای مستقیم/قدیمی به اپ می‌رسند، نه ۴۰۴ خام |
| `[[headers]] /assets/*` | کش یک‌ساله و `immutable` برای فایل‌های هش‌دار Vite |
| `[[headers]] /images/*` | کش ۳۰ روزه برای دارایی‌های نام‌ثابت |
| `[[headers]] /index.html` | بدون کش، تا نسخهٔ جدید فوراً دیده شود |
| هدرهای امنیتی | `nosniff`، `Referrer-Policy`، `Permissions-Policy`، `X-Frame-Options` |

روتینگ این پروژه **hash-based** است (`/#shop`، `/#product/...`)؛ بنابراین به لایهٔ redirect سمت سرور
برای کارکرد اپ نیازی نیست و لینک‌های اشتراکی روی هر میزبانی کار می‌کنند.

---

## ۳) اتصال ریپو و اولین Deploy (از طریق داشبورد)

1. وارد [app.netlify.com](https://app.netlify.com) شوید و با GitHub لاگین کنید.
2. **Add new project → Import an existing project → GitHub**.
3. ریپوی `milpardi43-cmd/ModAra-` را انتخاب کنید و دسترسی Netlify به آن را تأیید کنید.
4. در تنظیمات build، مقادیر فایل `netlify.toml` را نگه دارید:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. برای اینکه تغییرات شاخهٔ کاری همین نشست مستقیماً روی سایت اصلی منتشر شوند، در **Site configuration → Build & deploy → Branches** مقدار **Production branch** را روی `arena/84ba23af-modara` بگذارید. اگر می‌خواهید `main` سایت اصلی بماند، به‌جای آن **Branch deploys** را برای همین شاخه فعال کنید؛ در آن حالت تغییرات در آدرس جداگانهٔ branch deploy دیده می‌شوند.
6. **Deploy site** را بزنید.

پس از اتصال GitHub و انتخاب شاخه، هر `push` روی شاخهٔ deployشونده به‌طور خودکار Build و Deploy می‌شود. تغییراتی که در محیط کار انجام می‌شوند تا زمانی که به GitHub push نشوند، به Netlify نمی‌رسند.

---

## ۴) متغیرهای محیطی (فقط اگر Supabase واقعی می‌خواهید)

اگر پروژه را همین‌طور که هست منتشر کنید، حالت **دمو** فعال می‌ماند و همهٔ صفحات کار می‌کنند.
برای اتصال به بک‌اند واقعی:

1. **Site configuration → Environment variables → Add a variable**
2. دو متغیر زیر را اضافه کنید:

   | Key | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | کلید `anon public` پروژهٔ Supabase |

3. مطمئن شوید **Scopes** شامل `Builds` است (این متغیرها در زمان build داخل باندل قرار می‌گیرند).
4. سپس **Deploys → Trigger deploy → Clear cache and deploy site**.

نکات مهم:

- این دو کلید **build-time** هستند؛ تغییرشان بدون Deploy جدید اثری ندارد. (برخلاف Netlify Functions که runtime هستند.)
- `ANON_KEY` برای نمایش عمومی طراحی شده، **اما** امنیت واقعی از **RLS** می‌آید. مطمئن شوید روی جداول
  `products`، `orders`، `reviews` و… سیاست‌های Row Level Security فعال است.
- مایگریشن‌های `supabase/migrations` را یک‌بار روی پروژهٔ Supabase اجرا کنید.
- **هرگز** `service_role` key را در متغیرهای `VITE_*` نگذارید؛ این مقادیر در باندل عمومی قابل مشاهده‌اند.

---

## ۵) دامنهٔ اختصاصی و HTTPS

1. **Domain management → Add a domain** و دامنه‌تان (مثلاً `modara.ir`) را وارد کنید.
2. دو مسیر دارید:

   **الف) Netlify DNS (ساده‌ترین و سریع‌ترین):**
   - دامنه را به Netlify DNS منتقل کنید (Nameservers نمایش‌داده‌شده را در پنل ثبت‌کنندهٔ دامنه تنظیم کنید).
   - رکوردهای `A`/`CNAME` خودکار ساخته می‌شوند.

   **ب) DNS فعلی خودتان (خارجی):**
   - دامنهٔ ریشه → رکورد `A` به IP نمایش‌داده‌شده توسط Netlify (یا `ALIAS`/`ANAME` اگر پشتیبانی می‌شود).
   - `www` → رکورد `CNAME` به `<site-name>.netlify.app`.
3. در بخش **HTTPS**، گواهی Let's Encrypt معمولاً خودکار صادر می‌شود (چند دقیقه تا چند ساعت).
4. **Force HTTPS** را روشن کنید و یک دامنهٔ اصلی (Primary) انتخاب کنید تا `www` به ریشه یا برعکس ریدایرکت شود.
5. اگر بعداً `PUBLIC_SITE_URL` را در Supabase/درگاه پرداخت استفاده می‌کنید، آن را به دامنهٔ نهایی به‌روز کنید.

---

## ۶) عیب‌یابی (جدول سریع)

| نشانه | علت رایج | راه‌حل |
| --- | --- | --- |
| صفحهٔ سفید، کنسول پر از ۴۰۴ برای `/assets/*.js` | `BASE_PATH` روی `/Modara/` مانده | `netlify.toml` را با `BASE_PATH = "/"` بررسی و **Clear cache and deploy** کنید |
| تصاویر یا ویدئوها ۴۰۴ | build بدون `BASE_PATH` گرفته شده | همان بالا؛ در لاگ build عبارت `base: /` را ببینید |
| صفحه ۴۰۴ خام Netlify روی `/shop` | قاعدهٔ redirect حذف شده | `[[redirects]]` در `netlify.toml` برگردانده شود |
| بعد از Deploy نسخهٔ قدیمی دیده می‌شود | کش مرورگر/سرویس‌ورکر | Hard reload (`Ctrl/Cmd+Shift+R`) و بررسی هدر `Cache-Control` روی `index.html` |
| فونت فارسی دیر می‌آید | فونت از Google Fonts می‌آید | `preconnect` در `index.html` هست؛ برای استقلال کامل، فونت را local کنید |
| خطای build: `Unsupported engine` | نسخهٔ Node قدیمی | `NODE_VERSION = "22"` در `netlify.toml` و `.nvmrc` |
| `Cannot find module` در build | نصب با `npm install` بدون lockfile | Netlify به‌صورت پیش‌فرض `npm ci` می‌زند؛ lockfile را کامیت نگه دارید |
| داده‌ها بین کاربران مشترک نیست | حالت دمو (بدون Supabase) | بخش ۴؛ یا دیتابیس واقعی را وصل کنید |
| پرداخت/بازگشت درگاه کار نمی‌کند | URL بازگشت به دامنهٔ قدیمی اشاره دارد | `PUBLIC_SITE_URL`/تنظیمات درگاه را با دامنهٔ جدید هماهنگ کنید |

---

## ۷) گردش‌کار تیمی حرفه‌ای

- **Deploy Previews:** هر Pull Request → URL موقت مستقل (ایده‌آل برای بازبینی طرح هیرو/UI).
- **Branch deploys:** شاخه‌های مشخص را به یک subdomain اختصاصی (مثلاً `staging--<site>.netlify.app`) وصل کنید.
- **Rollback فوری:** **Deploys → روی Deploy سالم قبلی → Publish deploy**. بازگشت در چند ثانیه انجام می‌شود.
- **Deploy lock:** وقتی می‌خواهید انتشار خودکار موقتاً متوقف شود (مثلاً هنگام تغییر DNS یا سئو).
- **Netlify CLI (اختیاری، برای کنترل از ترمینال):**

```bash
npm i -g netlify-cli
netlify login
netlify init                # اتصال ریپوی فعلی به یک site
netlify deploy --build      # Deploy پیش‌نمایش (draft)
netlify deploy --build --prod
netlify env:list            # بررسی متغیرهای محیطی
```

---

## ۸) چک‌لیست پس از انتشار

- [ ] صفحهٔ اصلی با هیرو سینمایی و تصاویر کامل لود می‌شود (بدون قاب خالی).
- [ ] ناوبری hash کار می‌کند: `/#shop`، `/#product/<slug>`، `/#blog`، `/#account`.
- [ ] لینک مستقیم به یک صفحه (مثلاً ارسال در تلگرام) درست باز می‌شود.
- [ ] سبد خرید → تسویه‌حساب → سفارش (در حالت دمو یا Supabase) کامل می‌شود.
- [ ] ورود پنل مدیریت (`/#backoffice-login`) و ثبت محصول تست شده است.
- [ ] در **DevTools → Console** خطای قرمز نیست؛ در **Network** هیچ ۴۰۴ای وجود ندارد.
- [ ] Lighthouse در موبایل: Performance و Accessibility بالای ۹۰ (تصاویر WebP از قبل بهینه شده‌اند).
- [ ] هدرها درست است: `Cache-Control` روی `/assets/*` مقدار `immutable` دارد.
- [ ] `https://` اجباری است و دامنهٔ `www` ریدایرکت می‌شود.
- [ ] Open Graph/`<title>` و توضیحات متا در اشتراک‌گذاری درست دیده می‌شوند.

---

## ۹) بهینه‌سازی‌های پیشنهادی (اختیاری)

- **تصاویر:** هر تصویر جدید را با `npm run images:optimize` به WebP تبدیل کنید (نیازمند ImageMagick).
- **Preload برای LCP:** تصویر اول هیرو (`/images/hero-atelier/look-minimal.jpg`) می‌تواند در `index.html`
  با `<link rel="preload" as="image">` بیاید تا اولین رنگ‌آمیزی سریع‌تر شود.
- **CSP سخت‌گیرانه (اختیاری):** اگر بعداً افزودید، باید دامنه‌های `*.supabase.co` و
  `fonts.googleapis.com`/`fonts.gstatic.com` را مجاز کنید و `style-src 'unsafe-inline'` را در نظر بگیرید
  (Tailwind/Framer Motion استایل درون‌خطی می‌سازند).
- **Analytics:** Netlify Analytics یا Plausible؛ بدون کوکی و سبک.
- **فرم‌ها:** اگر خبرنامه/تماس سمت سرور می‌خواهید، Netlify Forms یا Netlify Functions.

---

## ۱۰) نکتهٔ این ریپو: GitHub Pages هم فعال است

ورک‌فلوی `.github/workflows/deploy.yml` هنوز با هر push روی `main` سایت را روی GitHub Pages
(با `BASE_PATH=/Modara/`) منتشر می‌کند. این با Netlify تضادی ندارد، اما اگر نمی‌خواهید دو نسخه
همزمان منتشر شود، در GitHub: **Actions → Deploy to GitHub Pages → ⋯ → Disable workflow**.
اگر فقط Netlify می‌خواهید، فایل ورک‌فلوی مذکور را هم می‌توانید حذف کنید (اختیاری).

---

## ۱۱) از «همین‌جا» تا Netlify — هر تغییر کجا دیده می‌شود؟

پرسشی که این بخش پاسخ می‌دهد: «اگر چیزی را در این ریپو تغییر بدهیم، هم در GitHub و هم در Netlify دیده می‌شود؟»

**پاسخ کوتاه:** بله — به شرطی که ۱) ریپو در Netlify وصل شده باشد و ۲) تغییر در شاخهٔ `main` باشد.
شاخه‌های کاری (`arena/...`) به‌تنهایی روی سایت اصلی منتشر نمی‌شوند؛ آن‌ها اول به `main` می‌رسند.

### مسیر یک تغییر

| اتفاق | GitHub | Netlify |
| --- | --- | --- |
| commit روی شاخهٔ کاری | همان لحظه در شاخه و در تب **Branches** | فقط اگر Branch deploy فعال باشد |
| باز شدن Pull Request | diff کامل + اجرای **CI** (`typecheck` / `lint` / `build`) | **Deploy Preview** با URL موقت همان PR |
| merge در `main` | `main` به‌روز + CI سبز + انتشار GitHub Pages | **Production** خودکار build و publish می‌شود |

ورک‌فلوی `.github/workflows/ci.yml` دقیقاً همان دستوری را اجرا می‌کند که Netlify اجرا می‌کند
(`npm run build:netlify` با `BASE_PATH=/`)؛ پس اگر تیک سبز CI را روی PR دیدید، build نتلیفای هم سالم است.

### اثبات اینکه سایت زنده همان بیلد است

Vite نام هر باندل را با اثرانگشت محتوا می‌سازد (`index-<hash>.js`). اسکریپت زیر همان اثرانگشت را
از `dist/` محلی می‌خواند و با HTML سایت زنده مقایسه می‌کند؛ نتیجه‌اش «همان بیلد» یا «بیلد قدیمی» است،
نه حدس و گمان:

```bash
npm run build:netlify
npm run verify:live https://your-site.netlify.app
```

خروجی موفق:

```
  target  https://your-site.netlify.app
  commit  1a2b3c4  style(hero): one column, one rhythm, nothing floating

  fingerprint        this build      live site
  ────────────────────────────────────────────────
  ✓ index-9f3ac1d2.js   9f3ac1d2     9f3ac1d2
  ✓ index-4b7e0a1c.css  4b7e0a1c     4b7e0a1c

  ✓ the live site is serving exactly this build
```

اگر `✗` دیدید، به ترتیب این سه مورد را بررسی کنید:

1. **Deploy تمام نشده** — Netlify → Deploys؛ صبر کنید تا وضعیت `Published` شود.
2. **شاخهٔ انتشار اشتباه است** — Netlify → Site configuration → Build & deploy → Branches؛
   `Production branch` باید `main` باشد.
3. **تغییر هنوز در `main` نیست** — PR مرج نشده است.

> اسکریپت با `?v=<timestamp>` و `cache-control: no-cache` درخواست می‌دهد، پس کش مرورگر یا CDN
> نتیجه را خراب نمی‌کند.

### اگر هنوز Netlify را به GitHub وصل نکرده‌اید

تا وقتی اتصال برقرار نشود، تغییرات **خودکار** منتشر نمی‌شوند (GitHub به‌روز می‌شود، Netlify نه).
دو راه دارید:

- **اتصال ریپو (توصیه‌شده):** بخش ۳ همین سند؛ از آن به بعد هر merge روی `main` = یک انتشار.
- **انتشار دستی (موقت):**
  ```bash
  npm run build:netlify
  npx netlify-cli deploy --prod --dir=dist   # نیاز به netlify login
  ```
  یا پوشهٔ `dist` را در تب **Deploys** داخل کادر Drag & Drop رها کنید. توجه: در حالت manual،
  `SITE_URL` را هم تنظیم کنید تا تگ‌های Open Graph به دامنهٔ درست اشاره کنند:
  `SITE_URL=https://your-site.netlify.app npm run build:netlify`.

### آنچه در بیلد به‌صورت خودکار درست می‌شود

- **آدرس مطلق برای اشتراک‌گذاری:** Netlify هنگام build متغیرهای `URL` و `DEPLOY_PRIME_URL` را می‌دهد؛
  `vite.config.ts` آن‌ها را داخل `canonical`، `og:url` و `og:image` جای‌گذاری می‌کند
  (روی GitHub Pages هم به‌طور خودکار آدرس Pages استفاده می‌شود). بدون این کار، پیش‌نمایش لینک
  در تلگرام/واتس‌اپ تصویر پیش‌فرض بیربط نشان می‌داد.
- **تصویر اشتراک‌گذاری اختصاصی:** `public/images/og-cover.jpg` (۱۲۰۰×۶۳۰، رگال کالکشن).
- **آیکون سایت:** `public/favicon.svg` و `public/apple-touch-icon.png`.
