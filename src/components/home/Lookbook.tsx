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
        <div className="relative grid auto-rows-[150px] grid-cols-2 gap-2.5 sm:auto-rows-[190px] sm:gap-4 md:auto-rows-[210px] md:grid-cols-4 lg:auto-rows-[230px]">
          {loading
            ? Array.from({ length: 8 }, (_, index) => (
                <div key={index} className={`shimmer-bg rounded-[1.35rem] opacity-70 ${spanPattern[index]}`}>
                <div className="hidden" />
                <div className="hidden" />
                <div className="hidden" />
              </div>
              ))
            : tiles.map((product, index) => (
                <Reveal key={product.id} delay={0.05 * index} className={spanPattern[index % spanPattern.length]}>
                  <article className="group/look relative block h-full w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#30251b] text-right shadow-[0_20px_50px_-34px_rgba(0,0,0,0.9)] transition-all duration-500 hover:-translate-y-1 hover:border-gold-300/60 hover:shadow-[0_30px_60px_-34px_rgba(218,174,83,0.38)]">
                    <button
                      type="button"
                      onClick={() => onNavigate('product', product.slug)}
                      aria-label={`مشاهده ${product.name}`}
                      className="absolute inset-0 z-0 rounded-[1.35rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
                    />
                    <img
                      src={optimizedAsset(product.image_url, 480)}
                      srcSet={imageSrcSet(product.image_url, [480, 720])}
                      sizes="(min-width: 768px) 25vw, 50vw"
                      alt={product.name}
                      width={480}
                      height={640}
                      loading="lazy"
                      decoding="async"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover/look:scale-[1.07]"
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#100c08]/90 via-[#100c08]/10 to-transparent opacity-80 transition-opacity duration-500 group-hover/look:opacity-100" />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-[1.05rem] border border-white/0 transition-colors duration-500 group-hover/look:border-white/35 sm:inset-4" />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-4 flex h-10 w-10 translate-y-1 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white opacity-0 backdrop-blur-sm transition-all duration-500 group-hover/look:translate-y-0 group-hover/look:opacity-100"
                    >
                      <ArrowUpLeft className="h-4 w-4" />
                    </span>
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 block translate-y-1 p-4 transition-transform duration-500 group-hover/look:translate-y-0 sm:p-5">
                      <span className="block truncate text-sm font-bold text-white sm:text-[15px]">{product.name}</span>
                      <span className="mt-1 block text-xs font-semibold text-gold-300 sm:text-sm">{formatPrice(product.price)}</span>
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
