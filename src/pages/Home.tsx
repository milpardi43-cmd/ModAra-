import { Suspense, lazy, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Truck, Shield, Sparkles, RefreshCw, Shirt, Glasses, Watch, ShoppingBag, Gem, Package, X } from 'lucide-react';
import type { Product, Category } from '../lib/supabase';
import {
  getCategories,
  getCategoryProducts,
  getTopRatedProducts,
} from '../lib/catalog';
import { imageSrcSet, optimizedAsset } from '../lib/format';
import ProductCard from '../components/ProductCard';
import BrandSignature from '../components/BrandSignature';
import RackHero from '../components/RackHero';
import PromoSections from '../components/home/PromoSections';
import DeferredMount from '../components/DeferredMount';
import { Reveal } from '../components/home/SectionHeading';

const EditorialCollections = lazy(() => import('../components/home/EditorialCollections'));
const NewArrivals = lazy(() => import('../components/home/NewArrivals'));
const BrandStory = lazy(() => import('../components/home/BrandStory'));
const Testimonials = lazy(() => import('../components/home/Testimonials'));
const BlogPreview = lazy(() => import('../components/home/BlogPreview'));
const Lookbook = lazy(() => import('../components/home/Lookbook'));
const Faq = lazy(() => import('../components/home/Faq'));
const Newsletter = lazy(() => import('../components/home/Newsletter'));

function DeferredSection({
  children,
  minHeight,
}: {
  children: ReactNode;
  minHeight: number;
}) {
  return (
    <DeferredMount minHeight={minHeight}>
      <Suspense fallback={<div style={{ minHeight }} aria-hidden="true" />}>{children}</Suspense>
    </DeferredMount>
  );
}


type HomeProps = {
  onNavigate: (view: string, param?: string) => void;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  shirt: Shirt,
  pants: Package,
  glasses: Glasses,
  watch: Watch,
  bag: ShoppingBag,
  gem: Gem,
};

const categoryImages: Record<string, string> = {
  clothing: '/images/categories/category-clothing.jpg',
  pants: '/images/categories/category-pants.jpg',
  glasses: '/images/categories/category-glasses.jpg',
  watch: '/images/categories/category-watch.jpg',
  bag: '/images/categories/category-bag.jpg',
  accessory: '/images/categories/category-accessory.jpg',
};

const fallbackCategories: Category[] = [
  { id: 'cat-clothing', name: 'لباس', slug: 'clothing', icon: 'shirt', created_at: '' },
  { id: 'cat-pants', name: 'شلوار', slug: 'pants', icon: 'pants', created_at: '' },
  { id: 'cat-glasses', name: 'عینک', slug: 'glasses', icon: 'glasses', created_at: '' },
  { id: 'cat-watch', name: 'ساعت', slug: 'watch', icon: 'watch', created_at: '' },
  { id: 'cat-bag', name: 'کیف', slug: 'bag', icon: 'bag', created_at: '' },
  { id: 'cat-accessory', name: 'اکسسوری', slug: 'accessory', icon: 'gem', created_at: '' },
];

export default function Home({ onNavigate }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [featuredBatch, setFeaturedBatch] = useState(0);
  const [featuredAutoPlay, setFeaturedAutoPlay] = useState(true);
  const [featuredIsInteracting, setFeaturedIsInteracting] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isFeaturedVisible, setIsFeaturedVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>('clothing');
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const categoryRequestRef = useRef(0);
  const featuredSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategories().then((liveCategories) => {
      if (!cancelled && liveCategories.length) setCategories(liveCategories);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchCategoryProducts = useCallback(async (slug: string) => {
    const requestId = ++categoryRequestRef.current;
    setCategoryLoading(true);
    try {
      const data = await getCategoryProducts(slug);
      if (categoryRequestRef.current !== requestId) return;
      setCategoryProducts(data);
    } catch {
      if (categoryRequestRef.current === requestId) setCategoryProducts([]);
    } finally {
      if (categoryRequestRef.current === requestId) setCategoryLoading(false);
    }
  }, []);

  // Start the default category query shortly before its section is reached.
  useEffect(() => {
    const node = categorySectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      void fetchCategoryProducts('clothing');
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        void fetchCategoryProducts('clothing');
        observer.disconnect();
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchCategoryProducts]);

  // Featured products sit several sections down, so keep them out of LCP work.
  useEffect(() => {
    let cancelled = false;
    const loadFeatured = () => {
      getTopRatedProducts(8).then((featured) => {
        if (cancelled) return;
        setProducts(featured);
        setLoading(false);
      });
    };
    const node = featuredSectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      loadFeatured();
      return () => {
        cancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        loadFeatured();
        observer.disconnect();
      },
      { rootMargin: '900px 0px' },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const node = featuredSectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsFeaturedVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsFeaturedVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncVisibility = () => setIsDocumentVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  const featuredBatchCount = Math.ceil(products.length / 3);
  const visibleFeaturedProducts = products.length
    ? Array.from({ length: Math.min(3, products.length) }, (_, offset) =>
        products[(featuredBatch * 3 + offset) % products.length],
      )
    : [];
  const moveFeaturedBatch = (step: number) => {
    if (featuredBatchCount < 2) return;
    setFeaturedBatch((batch) => (batch + step + featuredBatchCount) % featuredBatchCount);
  };

  useEffect(() => {
    if (loading || featuredBatchCount < 2 || !featuredAutoPlay || featuredIsInteracting || !isDocumentVisible || !isFeaturedVisible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setFeaturedBatch((batch) => (batch + 1) % featuredBatchCount);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [featuredAutoPlay, featuredBatch, featuredBatchCount, featuredIsInteracting, isDocumentVisible, isFeaturedVisible, loading]);

  const handleCategoryClick = (slug: string) => {
    if (activeCategory === slug) return;
    setActiveCategory(slug);
    fetchCategoryProducts(slug);
    setTimeout(() => {
      categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const activeCat = categories.find((c) => c.slug === activeCategory);

  return (
    <div>
      {/* Rack hero: the whole catalogue, edge-on, with a full stage on hover */}
      <RackHero onNavigate={onNavigate} />

      {/* Features bar */}
      <section className="relative z-20 mx-auto mt-10 max-w-7xl px-4 sm:mt-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[
            { icon: Truck, title: 'ارسال رایگان', desc: 'برای سفارش‌های بالای ۵۰۰ هزار تومان' },
            { icon: Shield, title: 'ضمانت اصالت', desc: 'تمام محصولات اصل و تضمین‌شده' },
            { icon: RefreshCw, title: 'بازگشت کالا', desc: 'تا ۷ روز پس از تحویل' },
            { icon: Sparkles, title: 'تخفیف اعضا', desc: 'تخفیف ویژه برای کاربران عضو' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05} className="h-full">
              <div className="group relative flex h-full items-center gap-2.5 overflow-hidden rounded-2xl border border-dark-100 bg-white p-3 shadow-[0_8px_26px_-22px_rgba(46,34,19,0.32)] transition-all duration-500 hover:-translate-y-1 hover:border-gold-500/25 hover:shadow-[0_20px_42px_-28px_rgba(127,91,39,0.32)] sm:gap-3 sm:p-4">
                <span aria-hidden="true" className="absolute inset-x-5 top-0 h-px origin-right scale-x-0 bg-gradient-to-l from-gold-500/70 to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-all duration-500 group-hover:scale-105 group-hover:bg-gold-100 group-hover:text-gold-700 sm:h-12 sm:w-12">
                  <f.icon className="h-6 w-6 transition-transform duration-500 group-hover:-rotate-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-dark-900 sm:text-sm">{f.title}</p>
                  <p className="text-[11px] leading-4 text-dark-500 sm:text-xs">{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <PromoSections onNavigate={onNavigate} />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <BrandSignature inline label="THE COLLECTIONS" text="کالکشن‌های مُدارا" highlight="" tone="dark" size="compact" className="mx-auto mb-3" />
          <h2 className="mb-2 text-2xl font-bold text-dark-900 sm:text-3xl">دسته‌بندی محصولات</h2>
          <p className="text-sm text-dark-500 sm:text-base">روی هر دسته‌بندی کلیک کنید تا محصولات آن را ببینید</p>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon || ''] || Shirt;
            const isActive = activeCategory === cat.slug;
            return (
              <Reveal key={cat.id} delay={i * 0.035} className="h-full">
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`group relative h-full w-full min-w-[42vw] snap-start overflow-hidden rounded-2xl border transition-all duration-500 sm:min-w-0 hover:-translate-y-1 hover:shadow-[0_24px_44px_-24px_rgba(130,91,36,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-xl shadow-amber-500/10'
                      : 'border-dark-100 bg-white'
                  }`}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-dark-50">
                    <img
                      src={optimizedAsset(categoryImages[cat.slug], 480)}
                      srcSet={imageSrcSet(categoryImages[cat.slug], [480, 720])}
                      sizes="(min-width: 1024px) 190px, (min-width: 640px) 33vw, 50vw"
                      alt={cat.name}
                      width={480}
                      height={640}
                      loading="lazy"
                      decoding="async"
                      className={`h-full w-full object-cover transition-transform duration-700 ease-out ${isActive ? 'scale-[1.045]' : 'group-hover:scale-[1.045]'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950/75 via-dark-950/5 to-transparent" />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[0.9rem] border border-white/0 transition-colors duration-500 group-hover:border-white/35 group-focus-visible:border-white/50" />
                    <span
                      aria-hidden="true"
                      className="absolute left-3 top-3 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full border border-white/25 bg-[#171208]/30 text-gold-100 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </span>
                    {isActive && (
                      <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg">
                        <X className="h-4 w-4" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 left-0 p-3 text-center">
                      <div className="mb-1.5 flex justify-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition-all duration-500 group-hover:scale-105 group-hover:bg-gold-500/80 group-hover:text-[#211a12] group-hover:shadow-[0_8px_22px_-10px_rgba(226,181,92,0.8)]">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <span className="font-semibold text-white text-sm">{cat.name}</span>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Selected category products; clothing is the sample category shown by default */}
      {activeCategory && (
        <section ref={categorySectionRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 scroll-mt-20">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <BrandSignature
                inline
                label="THE COLLECTION"
                text="از کالکشن‌های مُدارا،"
                highlight={activeCat?.name || 'لباس'}
                tone="dark"
                size="compact"
                className="mb-2"
              />
              <h2 className="mb-1 text-2xl font-bold text-dark-900 sm:text-3xl">
                محصولات {activeCat?.name || 'لباس'}
              </h2>
              <p className="text-dark-500">
                {categoryLoading
                  ? 'در حال بارگذاری...'
                  : `${categoryProducts.length} محصول در این دسته‌بندی`}
              </p>
            </div>
            {activeCategory !== 'clothing' && (
              <button
                onClick={() => {
                  setActiveCategory('clothing');
                  fetchCategoryProducts('clothing');
                }}
                className="flex w-fit items-center gap-2 rounded-xl border border-dark-200 bg-white px-4 py-2 text-sm font-medium text-dark-700 transition-all hover:border-amber-300 hover:text-amber-700"
              >
                <Shirt className="h-4 w-4" />
                بازگشت به لباس
              </button>
            )}
          </div>

          {categoryLoading ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex min-h-[76px] items-center gap-2 rounded-xl border border-dark-100 bg-white p-1.5 md:block md:rounded-2xl md:p-4">
                  <div className="h-16 w-14 shrink-0 rounded-lg shimmer-bg md:mb-4 md:h-auto md:w-full md:aspect-square md:rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2 md:block">
                    <div className="h-3 w-4/5 rounded shimmer-bg md:mb-2 md:h-4 md:w-3/4" />
                    <div className="h-3 w-1/2 rounded shimmer-bg md:h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-dark-500">محصولاتی برای این دسته‌بندی یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {categoryProducts.map((p, index) => (
                <Reveal key={p.id} delay={Math.min(index * 0.025, 0.3)} className="min-w-0">
                  <ProductCard product={p} onView={(slug) => onNavigate('product', slug)} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Editorial collections */}
      <DeferredSection minHeight={780}>
        <EditorialCollections onNavigate={onNavigate} />
      </DeferredSection>

      {/* New arrivals */}
      <DeferredSection minHeight={620}>
        <NewArrivals onNavigate={onNavigate} />
      </DeferredSection>

      {/* Featured products */}
      <section ref={featuredSectionRef} className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BrandSignature inline label="CUSTOMER FAVORITES" text="محبوب‌ترین‌های مُدارا" highlight="" tone="dark" size="compact" className="mb-2" />
            <h2 className="mb-1 text-2xl font-bold text-dark-900 sm:text-3xl">پرفروش‌ترین محصولات</h2>
            <p className="text-dark-500">محبوب‌ترین کالاهای مُدارا</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('shop')}
              className="group flex w-fit items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 sm:text-base"
            >
              مشاهده همه
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveFeaturedBatch(-1)}
                disabled={loading || featuredBatchCount < 2}
                aria-label="سه محصول قبلی"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-dark-200 bg-white text-dark-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveFeaturedBatch(1)}
                disabled={loading || featuredBatchCount < 2}
                aria-label="سه محصول بعدی"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-dark-200 bg-white text-dark-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          onMouseEnter={() => setFeaturedIsInteracting(true)}
          onMouseLeave={() => setFeaturedIsInteracting(false)}
          onFocusCapture={() => setFeaturedIsInteracting(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setFeaturedIsInteracting(false);
            }
          }}
          className="rounded-2xl border border-gold-200/70 bg-gradient-to-br from-white via-[#fffdf9] to-[#f5efe3] p-2 shadow-[0_24px_70px_-44px_rgba(66,45,18,0.45)] md:rounded-[2rem] md:p-5"
        >
          {loading ? (
            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-0 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="relative w-full md:aspect-[0.58]">
                  <div className="relative flex min-h-[76px] w-full items-center gap-2 overflow-hidden rounded-xl border border-gold-300/70 bg-white p-1.5 shadow-[0_12px_28px_-20px_rgba(218,175,92,0.3)] md:absolute md:right-0 md:top-0 md:block md:w-[200%] md:origin-top-right md:scale-50 md:rounded-[1.75rem] md:border-2 md:p-3 md:shadow-[0_20px_48px_-30px_rgba(218,175,92,0.35)]">
                    <div className="h-16 w-14 shrink-0 rounded-lg shimmer-bg md:mb-4 md:h-auto md:w-full md:aspect-[3/4] md:rounded-2xl" />
                    <div className="min-w-0 flex-1 space-y-2 md:block">
                      <div className="hidden h-3 w-1/3 rounded shimmer-bg md:mb-3 md:block" />
                      <div className="h-3 w-4/5 rounded shimmer-bg md:mb-2 md:h-4" />
                      <div className="hidden h-3 w-2/3 rounded shimmer-bg md:block" />
                      <div className="flex items-center justify-between md:mt-5">
                        <div className="h-4 w-2/5 rounded shimmer-bg md:h-5" />
                        <div className="h-7 w-7 rounded-full shimmer-bg md:h-10 md:w-10" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={featuredBatch}
                initial={{ opacity: 0, x: 36, scale: 0.97, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -36, scale: 0.97, filter: 'blur(8px)' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-0 lg:grid-cols-3"
              >
                {visibleFeaturedProducts.map((product, index) => (
                  <div
                    key={`${featuredBatch}-${product.id}`}
                    className="relative w-full md:aspect-[0.58]"
                  >
                    <div className="relative w-full md:absolute md:right-0 md:top-0 md:w-[200%] md:origin-top-right md:scale-50">
                      <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -8, scale: 1.06, zIndex: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.08, ease: 'easeOut' }}
                        className="group/card relative rounded-xl border border-gold-400/70 bg-gradient-to-b from-gold-100/70 via-white to-gold-100/40 p-1 shadow-[0_12px_28px_-20px_rgba(174,127,44,0.45)] transition-colors duration-300 hover:border-gold-600 md:rounded-[2rem] md:border-2 md:p-1.5 md:shadow-[0_24px_54px_-30px_rgba(174,127,44,0.55)]"
                      >
                        <div className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] bg-gradient-to-br from-gold-300/65 via-amber-500/20 to-transparent opacity-35 blur-xl transition-opacity duration-500 group-hover/card:opacity-90" />
                        <ProductCard product={product} onView={(slug) => onNavigate('product', slug)} />
                      </motion.div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          ) : null}

          {!loading && products.length > 3 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6">
              <div className="flex items-center gap-2" aria-label="گروه محصولات">
                {Array.from({ length: featuredBatchCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFeaturedBatch(index)}
                    aria-label={`نمایش گروه ${index + 1}`}
                    aria-current={index === featuredBatch ? 'true' : undefined}
                    className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${
                      index === featuredBatch ? 'w-8 bg-gold-600' : 'w-2.5 bg-dark-200 hover:bg-gold-400'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold tabular-nums text-dark-500">
                {new Intl.NumberFormat('fa-IR').format(featuredBatch + 1)} /{' '}
                {new Intl.NumberFormat('fa-IR').format(featuredBatchCount)}
              </span>
              <button
                type="button"
                onClick={() => setFeaturedAutoPlay((enabled) => !enabled)}
                aria-label={featuredAutoPlay ? 'توقف پخش خودکار' : 'شروع پخش خودکار'}
                title={featuredAutoPlay ? 'توقف پخش خودکار' : 'شروع پخش خودکار'}
                className="inline-flex items-center gap-2 rounded-full border border-dark-200 bg-white px-3 py-2 text-xs font-semibold text-dark-700 transition-colors hover:border-gold-500 hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                {featuredAutoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {featuredAutoPlay ? 'توقف خودکار' : 'پخش خودکار'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Campaign banner */}
      <section data-search-hide className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div
          className="group/campaign relative isolate min-h-[360px] overflow-hidden rounded-[2rem] border border-amber-100/15 text-white shadow-[0_34px_90px_-42px_rgba(39,21,9,0.78)] sm:min-h-[390px] sm:rounded-[2.5rem] lg:min-h-[430px]"
          dir="rtl"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[#211710]"
            style={{
              background:
                'radial-gradient(ellipse at 82% 12%, rgba(237, 155, 66, .28), transparent 34%), radial-gradient(ellipse at 12% 88%, rgba(222, 175, 88, .14), transparent 32%), linear-gradient(112deg, #17120e 0%, #302017 47%, #74391c 100%)',
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,12,9,0.24),transparent_48%,rgba(255,180,85,0.08))]" aria-hidden="true" />
          <div className="promo-poster-shine pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/4 bg-gradient-to-r from-transparent via-amber-100/25 to-transparent" aria-hidden="true" />
          <div className="promo-poster-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-amber-100/65 to-transparent" aria-hidden="true" />
          <div className="promo-poster-orbit pointer-events-none absolute -left-24 -top-28 h-[26rem] w-[26rem] rounded-full border border-amber-300/15" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-8 -top-12 h-[19rem] w-[19rem] rounded-full border border-amber-200/10" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-[9px] rounded-[1.55rem] border border-white/10 sm:inset-3 sm:rounded-[2rem]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-1/2 top-16 hidden h-[calc(100%-8rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-200/20 to-transparent md:block" aria-hidden="true" />

          <div className="relative z-20 grid min-h-[360px] items-center gap-8 px-6 py-9 sm:min-h-[390px] sm:px-10 sm:py-11 md:grid-cols-[0.9fr_1.1fr] md:gap-12 lg:min-h-[430px] lg:px-16">
            <div className="order-2 text-center md:order-1 md:text-right">
              <div className="mx-auto mb-5 flex max-w-sm items-center justify-center gap-3 md:mx-0 md:justify-start">
                <span className="h-px w-12 bg-amber-300/65" />
                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-200/85">MODARA PRIVATE EDIT</span>
              </div>
              <div className="relative mx-auto flex max-w-[22rem] flex-col items-center rounded-[1.75rem] border border-amber-100/20 bg-white/[0.045] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_55px_-35px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-all duration-500 group-hover/campaign:border-amber-100/30 md:mx-0 md:py-6">
                <span className="pointer-events-none absolute inset-2 rounded-[1.25rem] border border-white/[0.06]" aria-hidden="true" />
                <span className="promo-poster-float block bg-gradient-to-b from-[#ffe8a7] via-[#f4cb63] to-[#d8932f] bg-clip-text text-[5.5rem] font-black leading-none tracking-[-0.08em] text-transparent drop-shadow-[0_12px_24px_rgba(238,180,70,0.18)] sm:text-8xl lg:text-9xl">۴۰٪</span>
                <span className="mt-2 text-[10px] font-bold tracking-[0.24em] text-white/60 sm:text-xs">SELECTED COLLECTION</span>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-sm">لباس‌های منتخب</span>
                  <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-sm">اکسسوری‌های خاص</span>
                </div>
              </div>
            </div>

            <div className="order-1 text-center md:order-2 md:text-right">
              <BrandSignature
                inline
                label="MODARA PRIVATE EDIT"
                text="گزیده‌های این فصل،"
                highlight="برای شما"
                className="mx-auto mb-5 md:mx-0"
              />
              <h2 className="max-w-2xl text-balance text-3xl font-black leading-[1.25] text-white sm:text-4xl md:text-5xl">
                استایل بهتر،
                <span className="mt-1 block bg-gradient-to-l from-[#fff0b8] via-[#f1cb66] to-[#e2a843] bg-clip-text text-transparent">انتخاب هوشمندانه‌تر</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base sm:leading-8 md:mx-0">
                قطعه‌های منتخب این فصل را با قیمت ویژه کشف کنید؛ از لباس‌های روزمره تا اکسسوری‌هایی که امضای شخصی شما را کامل می‌کنند.
              </p>
              <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start">
                <button
                  onClick={() => onNavigate('shop')}
                  className="group/button inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-amber-100/45 bg-gradient-to-b from-[#ffe08a] to-[#eebd4d] px-6 py-3.5 font-bold text-[#25190d] shadow-[0_14px_34px_-14px_rgba(245,190,77,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-white/70 hover:from-white hover:to-[#fff0c7] hover:shadow-[0_20px_45px_-15px_rgba(255,221,151,0.5)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#30251b] sm:w-auto"
                >
                  مشاهده کالکشن ویژه
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25190d]/10 transition-transform group-hover/button:-translate-x-1">
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                </button>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2 text-[11px] text-white/65 backdrop-blur-sm sm:text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
                  ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand story */}
      <DeferredSection minHeight={720}>
        <BrandStory onNavigate={onNavigate} />
      </DeferredSection>

      {/* Testimonials */}
      <DeferredSection minHeight={760}>
        <Testimonials onNavigate={onNavigate} />
      </DeferredSection>

      {/* Blog preview */}
      <DeferredSection minHeight={560}>
        <BlogPreview onNavigate={onNavigate} />
      </DeferredSection>

      {/* Lookbook */}
      <DeferredSection minHeight={760}>
        <Lookbook onNavigate={onNavigate} />
      </DeferredSection>

      {/* FAQ */}
      <DeferredSection minHeight={620}>
        <Faq />
      </DeferredSection>

      {/* Newsletter / Modara Club */}
      <DeferredSection minHeight={520}>
        <Newsletter />
      </DeferredSection>
    </div>
  );
}
