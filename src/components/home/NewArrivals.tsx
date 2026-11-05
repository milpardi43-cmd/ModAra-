import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Product } from '../../lib/supabase';
import { getNewestProducts } from '../../lib/catalog';
import { imageSrcSet, optimizedAsset } from '../../lib/format';
import ProductCard from '../ProductCard';
import SectionHeading, { Reveal } from './SectionHeading';

type NewArrivalsProps = {
  onNavigate: (view: string, param?: string) => void;
};

/** Centered preview carousel for the newest products. */
export default function NewArrivals({ onNavigate }: NewArrivalsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getNewestProducts(10).then((data) => {
      if (cancelled) return;
      setProducts(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncVisibility = () => setIsDocumentVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  useEffect(() => {
    if (loading || products.length < 2 || !autoPlayEnabled || isInteracting || !isDocumentVisible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % products.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeIndex, autoPlayEnabled, isDocumentVisible, isInteracting, loading, products.length]);

  const moveSlide = (step: number) => {
    if (!products.length) return;
    setActiveIndex((index) => (index + step + products.length) % products.length);
  };
  const selectSlide = (index: number) => setActiveIndex(index);
  const activeProduct = products[activeIndex];
  const previousProduct = products.length
    ? products[(activeIndex - 1 + products.length) % products.length]
    : undefined;
  const nextProduct = products.length
    ? products[(activeIndex + 1) % products.length]
    : undefined;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8" dir="rtl">
      <SectionHeading
        eyebrow="تازه رسیده‌ها"
        eyebrowEn="NEW ARRIVALS"
        title="جدیدترین‌های مُدارا"
        description="آخرین قطعه‌هایی که به ویترین ما اضافه شده‌اند؛ پیش از آن‌که تمام شوند، کشفشان کنید."
        action={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => moveSlide(-1)}
              aria-label="محصول قبلی"
              disabled={loading || products.length < 2}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#211a12]/15 bg-white text-[#211a12] transition-all duration-300 hover:border-gold-600 hover:bg-gold-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:w-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveSlide(1)}
              aria-label="محصول بعدی"
              disabled={loading || products.length < 2}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#211a12]/15 bg-white text-[#211a12] transition-all duration-300 hover:border-gold-600 hover:bg-gold-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:w-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="group mr-1 hidden items-center gap-2 text-sm font-bold text-gold-700 transition-colors hover:text-gold-800 sm:inline-flex"
            >
              مشاهده فروشگاه
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        }
      />

      <Reveal>
        <div
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          onFocusCapture={() => setIsInteracting(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsInteracting(false);
            }
          }}
          className="rounded-[2rem] border border-gold-200/70 bg-gradient-to-br from-[#fffdf9] via-[#fbf7ef] to-[#f4ecdc] p-2 shadow-[0_24px_70px_-42px_rgba(66,45,18,0.45)] sm:p-4 lg:p-5"
        >
          <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)_minmax(0,1fr)] lg:gap-4">
            <div className="hidden lg:block">
              {previousProduct && (
                <ProductPreview
                  product={previousProduct}
                  position="قبلی"
                  onSelect={() => moveSlide(-1)}
                />
              )}
            </div>

            <div className="mx-auto w-full max-w-[320px] rounded-[1.75rem] border-2 border-gold-400/70 bg-white p-1.5 shadow-[0_18px_45px_-22px_rgba(133,94,35,0.55)] sm:p-2">
              <div className="mb-2 flex items-center justify-center gap-2 rounded-full bg-[#211a12] px-3 py-1.5 text-[10px] font-bold tracking-wide text-gold-200 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400 shadow-[0_0_10px_rgba(216,173,87,0.8)]" />
                پیش‌نمایش محصول
              </div>
              {loading ? (
                <ProductCardSkeleton />
              ) : activeProduct ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeProduct.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <ProductCard
                      product={activeProduct}
                      onView={(slug) => onNavigate('product', slug)}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-[#f3ede0] text-sm text-dark-400">
                  محصولی برای نمایش وجود ندارد
                </div>
              )}
            </div>

            <div className="hidden lg:block">
              {nextProduct && (
                <ProductPreview
                  product={nextProduct}
                  position="بعدی"
                  onSelect={() => moveSlide(1)}
                />
              )}
            </div>
          </div>

          {!loading && products.length > 0 && (
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:mt-6">
              <div className="flex max-w-full flex-wrap items-center justify-center gap-2" aria-label="انتخاب محصول">
                {products.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectSlide(index)}
                    aria-label={`نمایش محصول ${new Intl.NumberFormat('fa-IR').format(index + 1)}`}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 before:absolute before:h-2.5 before:rounded-full before:transition-all before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 md:h-8 md:w-8 ${
                      index === activeIndex ? 'before:w-8 before:bg-gold-600' : 'before:w-2.5 before:bg-[#211a12]/20 hover:before:bg-gold-400'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold tabular-nums text-dark-500">
                {new Intl.NumberFormat('fa-IR').format(activeIndex + 1)} /{' '}
                {new Intl.NumberFormat('fa-IR').format(products.length)}
              </span>
              <button
                type="button"
                onClick={() => setAutoPlayEnabled((enabled) => !enabled)}
                aria-label={autoPlayEnabled ? 'توقف پخش خودکار' : 'شروع پخش خودکار'}
                title={autoPlayEnabled ? 'توقف پخش خودکار' : 'شروع پخش خودکار'}
                className="inline-flex items-center gap-2 rounded-full border border-[#211a12]/15 bg-white px-3 py-2 text-xs font-semibold text-dark-700 transition-colors hover:border-gold-500 hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                {autoPlayEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {autoPlayEnabled ? 'توقف خودکار' : 'پخش خودکار'}
              </button>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}

function ProductPreview({
  product,
  position,
  onSelect,
}: {
  product: Product;
  position: string;
  onSelect: () => void;
}) {
  const imageUrl = optimizedAsset(product.image_url, 480);
  const imageSet = imageSrcSet(product.image_url, [480, 720]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group mx-auto block w-full max-w-[220px] overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/65 text-right opacity-75 shadow-[0_16px_40px_-28px_rgba(45,33,18,0.55)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:opacity-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f3ede0]">
        <img
          src={imageUrl}
          srcSet={imageSet}
          sizes="220px"
          alt={product.name}
          width={480}
          height={360}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute right-3 top-3 rounded-full bg-[#211a12]/75 px-3 py-1 text-[10px] font-bold text-gold-200 backdrop-blur-sm">
          {position}
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold leading-6 text-[#211a12]">{product.name}</p>
        <p className="mt-1 line-clamp-1 text-xs leading-5 text-dark-400">{product.description}</p>
        <p className="mt-2 text-sm font-black text-gold-700">
          {new Intl.NumberFormat('fa-IR').format(product.price)} تومان
        </p>
      </div>
    </button>
  );
}

function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-[1.75rem] bg-[#fffdf9] shadow-[0_2px_14px_rgba(33,26,18,0.05)] ring-1 ring-[#211a12]/[0.07]"
    >
      <div className="shimmer-bg aspect-[3/4]" />
      <div className="p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-3 w-1/3 rounded shimmer-bg" />
          <div className="h-2 w-1/4 rounded shimmer-bg" />
        </div>
        <div className="shimmer-bg mb-2 h-4 w-4/5 rounded" />
        <div className="h-3 w-2/3 rounded shimmer-bg" />
        <div className="mt-5 flex items-center justify-between">
          <div className="h-5 w-2/5 rounded shimmer-bg" />
          <div className="h-10 w-10 rounded-full shimmer-bg" />
        </div>
      </div>
    </div>
  );
}
