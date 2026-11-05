import { useEffect, useMemo, useState } from 'react';
import { ArrowUpLeft, Heart } from 'lucide-react';
import type { Product } from '../../lib/supabase';
import { getTopRatedProducts } from '../../lib/catalog';
import { formatPrice, imageSrcSet, optimizedAsset } from '../../lib/format';
import SectionHeading, { Reveal } from './SectionHeading';
import { useFavorites } from '../../context/FavoritesContext';
import { tapFeedback } from '../../native/feedback';

type LookbookProps = {
  onNavigate: (view: string, param?: string) => void;
};

/** One highlight per category first keeps the gallery visually diverse. */
function pickLookbook(products: Product[]): Product[] {
  const seenCategories = new Set<string | null>();
  const picked: Product[] = [];
  for (const product of products) {
    if (!product.image_url || seenCategories.has(product.category_id)) continue;
    seenCategories.add(product.category_id);
    picked.push(product);
    if (picked.length >= 6) break;
  }
  for (const product of products) {
    if (picked.length >= 8) break;
    if (product.image_url && !picked.includes(product)) picked.push(product);
  }
  return picked;
}

const spanPattern = [
  'row-span-2',
  'row-span-1',
  'row-span-1',
  'row-span-2',
  'row-span-1',
  'row-span-1',
  'row-span-2',
  'row-span-1',
];

/** Shoppable lookbook gallery built from real catalogue imagery. */
export default function Lookbook({ onNavigate }: LookbookProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTopRatedProducts(24).then((data) => {
      if (cancelled) return;
      setProducts(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles = useMemo(() => pickLookbook(products), [products]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8" dir="rtl">
      <SectionHeading
        eyebrow="لوک‌بوک این فصل"
        eyebrowEn="SHOP THE LOOK"
        title="استایل‌ها، آمادهٔ خرید"
        description="قطعه‌های برگزیدهٔ این فصل از نگاه دوربین ما؛ روی هر تصویر بزنید تا همان محصول را ببینید."
      />

      <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-[#211a12]/10 bg-[#201a13] p-3 shadow-[0_28px_80px_-48px_rgba(45,31,13,0.62)] sm:p-5 lg:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(212,164,76,0.16),transparent_38%),radial-gradient(ellipse_at_0%_100%,rgba(181,120,40,0.10),transparent_40%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[9px] rounded-[2rem] border border-white/[0.07] sm:inset-3" />
        <div className="relative -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide md:mx-0 md:grid md:auto-rows-[210px] md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:auto-rows-[230px]">
          {loading
            ? Array.from({ length: 8 }, (_, index) => (
                <div key={index} className={`flex h-[72px] w-[min(11rem,68vw)] shrink-0 snap-start items-center gap-2 rounded-xl p-2 opacity-70 md:block md:h-auto md:w-auto md:rounded-[1.35rem] md:p-0 ${spanPattern[index]}`}>
                <div className="h-14 w-14 shrink-0 rounded-lg shimmer-bg md:hidden" />
                <div className="h-3 flex-1 rounded shimmer-bg md:hidden" />
                <div className="hidden h-full w-full rounded-[1.35rem] shimmer-bg md:block" />
              </div>
              ))
            : tiles.map((product, index) => (
                <Reveal key={product.id} delay={0.05 * index} className={`w-[min(11rem,68vw)] shrink-0 snap-start md:w-auto md:shrink ${spanPattern[index % spanPattern.length]}`}>
                  <article className="group/look relative flex h-[72px] w-full items-center overflow-hidden rounded-xl border border-white/10 bg-[#30251b] text-right shadow-[0_8px_22px_-14px_rgba(0,0,0,0.7)] transition-all duration-500 hover:-translate-y-1 hover:border-gold-300/60 hover:shadow-[0_30px_60px_-34px_rgba(218,174,83,0.38)] md:block md:h-full md:w-full md:rounded-[1.35rem] md:shadow-[0_20px_50px_-34px_rgba(0,0,0,0.9)]">
                    <button
                      type="button"
                      onClick={() => onNavigate('product', product.slug)}
                      aria-label={`مشاهده ${product.name}`}
                      className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 md:rounded-[1.35rem]"
                    />
                    <img
                      src={optimizedAsset(product.image_url, 128)}
                      srcSet={imageSrcSet(product.image_url, [128, 256, 480, 720])}
                      sizes="(min-width: 768px) 25vw, 56px"
                      alt=""
                      aria-hidden="true"
                      width={120}
                      height={160}
                      loading="lazy"
                      decoding="async"
                      className="pointer-events-none relative h-14 w-14 shrink-0 object-cover transition-transform duration-[1100ms] ease-out group-hover/look:scale-[1.07] md:absolute md:inset-0 md:h-full md:w-full"
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-[#100c08]/90 via-[#100c08]/10 to-transparent opacity-80 transition-opacity duration-500 group-hover/look:opacity-100 md:block" />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-3 hidden rounded-[1.05rem] border border-white/0 transition-colors duration-500 group-hover/look:border-white/35 md:inset-4 md:block" />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-4 hidden h-10 w-10 translate-y-1 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white opacity-0 backdrop-blur-sm transition-all duration-500 group-hover/look:translate-y-0 group-hover/look:opacity-100 md:flex"
                    >
                      <ArrowUpLeft className="h-4 w-4" />
                    </span>
                    <span className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col items-start p-2 transition-transform duration-500 md:absolute md:inset-x-0 md:bottom-0 md:block md:translate-y-1 md:p-4 md:group-hover/look:translate-y-0 lg:p-5">
                      <span className="block w-full truncate text-xs font-bold text-white md:text-[15px]">{product.name}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-gold-300 md:text-sm">{formatPrice(product.price)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(product.id);
                        void tapFeedback();
                      }}
                      aria-label={isFavorite(product.id) ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
                      aria-pressed={isFavorite(product.id)}
                      className={`absolute right-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 text-white shadow-md backdrop-blur-sm md:hidden ${isFavorite(product.id) ? 'bg-[#9b3b37]' : 'bg-[#120d08]/55'}`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                    </button>
                  </article>
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
