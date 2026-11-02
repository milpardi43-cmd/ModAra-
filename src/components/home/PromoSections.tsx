import { ArrowLeft, Sparkles } from 'lucide-react';
import { imageSrcSet, optimizedAsset } from '../../lib/format';

type PromoSectionsProps = {
  onNavigate: (view: string, param?: string) => void;
};

const featuredCategories = [
  {
    slug: 'watch',
    title: 'ساعت؛ امضای استایل',
    subtitle: 'جزئیاتی دقیق برای هر لحظهٔ روز',
    image: '/images/categories/category-watch.jpg',
    alt: 'ساعت‌های مجموعه مُدارا',
  },
  {
    slug: 'bag',
    title: 'کیف؛ همراه انتخاب‌های شما',
    subtitle: 'ترکیبی از کاربرد و جلوهٔ شخصی',
    image: '/images/categories/category-bag.jpg',
    alt: 'کیف‌های مجموعه مُدارا',
  },
  {
    slug: 'accessory',
    title: 'اکسسوری؛ امضای نهایی',
    subtitle: 'لمس‌های کوچک با تأثیری ماندگار',
    image: '/images/categories/category-accessory.jpg',
    alt: 'اکسسوری‌های مجموعه مُدارا',
  },
];

export default function PromoSections({ onNavigate }: PromoSectionsProps) {
  return (
    <div className="space-y-8 py-8 sm:space-y-10 sm:py-10">
      {/* Editorial campaign banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="پیشنهاد مُدارا">
        <div className="group relative isolate min-h-[340px] overflow-hidden rounded-[2rem] bg-[#30251b] shadow-[0_24px_70px_-38px_rgba(42,29,17,0.65)] sm:min-h-[390px] lg:min-h-[430px]">
          <img
            src="/images/hero-atelier/look-minimal.jpg"
            alt="استایل بهاری از مجموعهٔ مُدارا"
            width={1376}
            height={768}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#1d1711]/85 via-[#1d1711]/55 to-[#1d1711]/5" />
          <div className="flex min-h-[340px] items-center px-6 py-10 sm:min-h-[390px] sm:px-10 lg:min-h-[430px] lg:px-16">
            <div className="max-w-xl text-right text-white">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-[#f5d99d] backdrop-blur-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                انتخاب‌های مُدارا برای فصل پیشِ رو
              </div>
              <h2 className="text-balance text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                استایل شما،
                <span className="mt-1 block text-[#e8c987]">روایت خودتان</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/80 sm:text-base sm:leading-8">
                از پوشاک روزمره تا انتخاب‌هایی برای قرارهای خاص؛ قطعه‌ها را کنار هم ببینید، رنگ‌ها را با سلیقهٔ خودتان ترکیب کنید و استایلی بسازید که بازتاب شخصیت شماست.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('shop', 'clothing')}
                className="group/button mt-7 inline-flex items-center gap-3 rounded-full bg-[#f0d59b] px-6 py-3.5 text-sm font-bold text-[#2b2116] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#30251b]"
              >
                دیدن مجموعهٔ پوشاک
                <ArrowLeft className="h-4 w-4 transition-transform group-hover/button:-translate-x-1" aria-hidden="true" />
              </button>
            </div>
          </div>
          <span aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-[1.6rem] border border-white/15 sm:inset-5" />
        </div>
      </section>

      {/* Category discovery promos */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-labelledby="promo-categories-title">
        <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.28em] text-amber-700" dir="ltr">THE MODARA EDIT</p>
            <h2 id="promo-categories-title" className="text-xl font-extrabold text-dark-900 sm:text-2xl">
              جزئیاتی که استایل را کامل می‌کنند
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-5 text-dark-500 sm:text-sm">
            ساعت، کیف و اکسسوری فقط همراه استایل نیستند؛ شخصیت هر ترکیب را شکل می‌دهند. میان انتخاب‌های مُدارا بگردید و جزئیاتی را پیدا کنید که به سلیقهٔ شما نزدیک‌تر است.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {featuredCategories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => onNavigate('shop', category.slug)}
              aria-label={`مشاهدهٔ ${category.title}`}
              className="group relative isolate h-[190px] overflow-hidden rounded-[1.5rem] bg-[#30251b] text-right shadow-[0_16px_40px_-28px_rgba(42,29,17,0.55)] transition-transform duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:h-[220px]"
            >
              <img
                src={optimizedAsset(category.image, 720)}
                srcSet={imageSrcSet(category.image, [480, 720])}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                alt={category.alt}
                width={720}
                height={960}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#17120d]/90 via-[#17120d]/15 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                <span className="block">
                  <span className="block text-base font-bold text-white sm:text-lg">{category.title}</span>
                  <span className="mt-1 block text-[11px] text-white/75 sm:text-xs">{category.subtitle}</span>
                </span>
                <span className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-[#f0d59b] group-hover:bg-[#f0d59b] group-hover:text-[#2b2116]">
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
