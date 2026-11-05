import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import type { Product, Category } from '../../lib/supabase';
import { imageSrcSet, optimizedAsset } from '../../lib/format';
import ProductCard from '../ProductCard';

type MobileHomeStartProps = {
  categories: Category[];
  products: Product[];
  loading: boolean;
  onNavigate: (view: string, param?: string) => void;
};

const categoryImages: Record<string, string> = {
  clothing: '/images/categories/category-clothing.jpg',
  pants: '/images/categories/category-pants.jpg',
  glasses: '/images/categories/category-glasses.jpg',
  watch: '/images/categories/category-watch.jpg',
  bag: '/images/categories/category-bag.jpg',
  accessory: '/images/categories/category-accessory.jpg',
};

const campaignCopy = 'از پوشاک روزمره تا انتخاب‌هایی برای قرارهای خاص؛ قطعه‌ها را کنار هم ببینید، رنگ‌ها را با سلیقهٔ خودتان ترکیب کنید و استایلی بسازید که بازتاب شخصیت شماست.';

export default function MobileHomeStart({ categories, products, loading, onNavigate }: MobileHomeStartProps) {
  const visibleCategories = categories.filter((category) => categoryImages[category.slug]);

  return (
    <section className="bg-[#f7f3eb] px-4 pb-5 pt-[calc(3.75rem+env(safe-area-inset-top)+0.5rem)] md:hidden" dir="rtl">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('modara:open-search'))}
        className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-[#e8e1d5] bg-white px-4 text-right text-sm text-[#8a8174] shadow-[0_6px_18px_rgba(42,32,20,0.04)] transition-colors active:bg-[#fffaf0]"
      >
        <Search className="h-5 w-5 shrink-0 text-[#554838]" aria-hidden="true" />
        <span className="flex-1">جستجو در محصولات مُدارا</span>
      </button>

      <nav aria-label="دسته‌بندی‌های محبوب" className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {visibleCategories.map((category) => {
          const image = categoryImages[category.slug];
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onNavigate('shop', category.slug)}
              className="flex w-[68px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl text-center text-[11px] font-semibold text-[#40372d]"
              aria-label={`مشاهدهٔ دستهٔ ${category.name}`}
            >
              <span className="h-14 w-14 overflow-hidden rounded-[1.1rem] border border-white bg-white shadow-[0_4px_14px_rgba(42,32,20,0.08)]">
                <img
                  src={optimizedAsset(image, 480)}
                  srcSet={imageSrcSet(image, [480, 720])}
                  sizes="56px"
                  alt=""
                  width={240}
                  height={320}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="max-w-full truncate">{category.name}</span>
            </button>
          );
        })}
      </nav>

      <article className="relative isolate mt-4 h-[208px] overflow-hidden rounded-[1.6rem] bg-[#30251b] shadow-[0_16px_35px_-22px_rgba(49,34,18,0.48)]">
        <img
          src="/images/hero-atelier/look-minimal.jpg"
          alt="استایل بهاری از مجموعهٔ مُدارا"
          width={1376}
          height={768}
          loading="eager"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-l from-[#1d1711]/90 via-[#1d1711]/55 to-[#1d1711]/5" />
        <div className="flex h-full items-center justify-start px-4 py-3">
          <div className="w-[66%] text-right text-white">
            <p dir="ltr" className="mb-2 text-[8px] font-bold tracking-[0.28em] text-[#f0d59b]">THE SEASONAL EDIT</p>
            <h1 className="text-[1.15rem] font-black leading-[1.35]">
              استایل شما،
              <span className="block text-[#f0d59b]">روایت خودتان</span>
            </h1>
            <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-white/80" title={campaignCopy}>
              {campaignCopy}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('shop', 'clothing')}
              className="mt-2.5 inline-flex min-h-9 items-center gap-2 rounded-full bg-[#f0d59b] px-3.5 text-[11px] font-bold text-[#2b2116] shadow-sm transition-colors active:bg-white"
            >
              دیدن مجموعهٔ پوشاک
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
      <details className="group mt-2 px-1">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-[#80643b] [&::-webkit-details-marker]:hidden">
          دربارهٔ این مجموعه
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <p className="pb-2 text-xs leading-5 text-[#655a4c]">{campaignCopy}</p>
        <div className="flex flex-wrap gap-2 pb-2">
          {['پوشاک خوش‌فرم', 'جزئیات هماهنگ', 'برای هر موقعیت'].map((item) => (
            <span key={item} className="rounded-full border border-[#e5dac6] bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#66553b]">{item}</span>
          ))}
        </div>
      </details>

      <div className="mb-3 mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold tracking-[0.2em] text-[#a17b3c]">THE MODARA EDIT</p>
          <h2 className="mt-0.5 text-lg font-extrabold text-[#211a12]">محصولات ویژه</h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-xs font-bold text-[#805b27]"
        >
          مشاهده همه
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((item) => (
            <div key={item} className="rounded-2xl border border-[#ebe3d7] bg-white p-2 shadow-sm">
              <div className="aspect-[0.78] rounded-xl shimmer-bg" />
              <div className="mt-3 h-3 w-4/5 rounded shimmer-bg" />
              <div className="mt-2 h-3 w-1/2 rounded shimmer-bg" />
            </div>
          ))}
        </div>
      ) : products.length ? (
        <div className="grid grid-cols-2 gap-3">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} onView={(slug) => onNavigate('product', slug)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#ebe3d7] bg-white px-4 py-8 text-center text-sm text-[#756b5f]">
          محصولات تازه به‌زودی نمایش داده می‌شوند.
        </div>
      )}
    </section>
  );
}
