import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import { getAllProducts, getCategories } from '../lib/catalog';
import { buildRackItems, RACK_FILTERS, type RackItem } from '../lib/rackItems';
import { asset, formatPrice } from '../lib/format';

type DeckHeroProps = {
  onNavigate: (view: string, param?: string) => void;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const faNum = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
/** How many cards stay visible on each side of the front card. */
const DECK_WINDOW = 3;

export default function DeckHero({ onNavigate }: DeckHeroProps) {
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<RackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('clothing');
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isDeckHovered, setIsDeckHovered] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'light' }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllProducts(), getCategories()])
      .then(([products, categories]) => {
        if (cancelled) return;
        const rackItems = buildRackItems(products, categories);
        setItems(rackItems);
        setActiveId((current) => current ?? rackItems.find((item) => item.categorySlug === 'clothing')?.id ?? rackItems[0]?.id ?? null);
      })
      .catch(() => {
        /* deck stays empty instead of breaking the page */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => item.categorySlug === selectedCategory),
    [items, selectedCategory],
  );
  const activeIndex = visibleItems.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? visibleItems[activeIndex] : (visibleItems[0] ?? null);

  useEffect(() => {
    if (!visibleItems.length || visibleItems.some((item) => item.id === activeId)) return;
    const first = visibleItems[0];
    if (first) setActiveId(first.id);
  }, [activeId, visibleItems]);

  const selectItem = useCallback((id: string) => setActiveId(id), []);

  useEffect(() => {
    if (!isAutoPlaying || isDeckHovered || visibleItems.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const current = visibleItems.findIndex((item) => item.id === activeId);
      const next = visibleItems[(current + 1 + visibleItems.length) % visibleItems.length];
      if (next) selectItem(next.id);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeId, isAutoPlaying, isDeckHovered, selectItem, visibleItems]);

  const moveActive = (step: 1 | -1) => {
    if (visibleItems.length < 2) return;
    const from = activeIndex < 0 ? 0 : activeIndex;
    const next = visibleItems[(from + step + visibleItems.length) % visibleItems.length];
    if (next) selectItem(next.id);
  };

  const onDeckKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveActive(-1);
    }
  };

  return (
    <section
      aria-label="دک سه‌بعدی استایل‌های مُدارا"
      className="relative isolate overflow-hidden bg-[#f3efe8] pb-4 pt-20 sm:pb-5 lg:pt-6"
    >
      <div className="hero-aurora" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-[1024px] px-4 sm:px-8">
        <div className="w-full px-1 sm:px-0">
          <AnimatePresence mode="wait" initial={false}>
            {activeItem && (
              <motion.div
                key={activeItem.id}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE }}
                className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-x-10 gap-y-5 text-right lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-center"
                aria-live="polite"
              >
                <div className="rack-outfit-stage lg:col-start-2 lg:row-start-1">
                  <span className="rack-spotlight" aria-hidden="true" />
                  <div role="img" aria-label={`${activeItem.product.name}، نمای کامل ست`} className="absolute inset-0 z-10">
                    <img
                      key={activeItem.slug}
                      src={asset(activeItem.modelPreview)}
                      alt=""
                      aria-hidden="true"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      draggable={false}
                      onError={(event) => {
                        const image = event.currentTarget;
                        if (!image.dataset.fallback) {
                          image.dataset.fallback = 'outfit';
                          image.src = asset(activeItem.outfitPreview);
                        } else if (image.dataset.fallback === 'outfit') {
                          image.dataset.fallback = 'hanger';
                          image.src = asset(activeItem.previewFallback);
                        } else {
                          image.style.visibility = 'hidden';
                        }
                      }}
                      className="rack-outfit-composite pointer-events-none select-none"
                    />
                  </div>
                  <div className="rack-reflection" aria-hidden="true">
                    <img
                      src={asset(activeItem.modelPreview)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  </div>
                </div>

                <div className="w-full min-w-0 text-right lg:col-start-1 lg:row-start-1">
                  <p className="mb-2.5 text-[11px] font-bold tracking-[0.22em] text-[#9a835f]">
                    مُدارا <span className="text-[#c8b795]" aria-hidden="true">·</span> MODARA
                  </p>
                  <h1
                    key={activeItem.id}
                    className="look-title text-balance text-[clamp(1.2rem,2vw,1.75rem)] font-extrabold leading-[1.35] text-[#241d14]"
                  >
                    {activeItem.product.name}
                  </h1>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ded3ba] bg-[#fdfaf4]/70 px-3 py-1 text-[11px] font-bold text-[#7d6636]">
                      <span
                        className="h-1.5 w-1.5 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: activeItem.hex }}
                        aria-hidden="true"
                      />
                      {activeItem.categoryName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-[#6b6152]">
                      <Star className="h-3.5 w-3.5 fill-[#e6b95e] text-[#c49639]" aria-hidden="true" />
                      {faNum(Number(activeItem.product.rating.toFixed(1)))}
                    </span>
                  </div>
                  {activeItem.product.description && (
                    <p className="mt-2.5 line-clamp-3 max-w-[30rem] text-[13px] leading-[1.8] text-[#6b6152]">
                      {activeItem.product.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-start gap-x-4 gap-y-2">
                    <span className="whitespace-nowrap text-base font-extrabold text-[#3f3527] sm:text-lg">
                      {formatPrice(activeItem.product.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('product', activeItem.slug)}
                      className="group inline-flex items-center justify-center gap-1.5 rounded-full bg-[#241d14] px-4 py-2.5 text-xs font-semibold text-[#f7f1e4] shadow-[0_8px_20px_-10px_rgba(36,29,20,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3a2f20] active:translate-y-0"
                    >
                      مشاهدهٔ محصول
                      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The deck: coverflow cards; the front card flips to reveal the try-on. */}
        <div
          className="relative z-10 mx-auto mt-4 w-full max-w-[960px] border-t border-[#ded8ce]/80 pt-3.5 sm:mt-5 sm:pt-4"
          onMouseEnter={() => setIsDeckHovered(true)}
          onMouseLeave={() => setIsDeckHovered(false)}
          onFocusCapture={() => setIsDeckHovered(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDeckHovered(false);
          }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-base font-bold text-[#342d24] sm:text-lg">دک سه‌بعدی</h2>
              <span className="text-[11px] tabular-nums text-[#9a835f]">
                {faNum(Math.max(activeIndex + 1, 1))} / {faNum(visibleItems.length)}
              </span>
              <p className="sr-only">کارت روبه‌رو با چرخش، ست را روی تن مانکن نشان می‌دهد.</p>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2" role="group" aria-label="فیلتر دسته‌بندی محصولات">
              {RACK_FILTERS.map((filter) => {
                const isSelected = selectedCategory === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(filter.id)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${isSelected ? 'border-[#927444] bg-[#241d14] text-[#f7f1e4]' : 'border-[#ddd6ca] bg-white/50 text-[#665b4b] hover:bg-white'}`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAutoPlaying((playing) => !playing)}
                aria-pressed={isAutoPlaying}
                aria-label={isAutoPlaying ? 'توقف نمایش خودکار' : 'شروع نمایش خودکار'}
                title={isAutoPlaying ? 'توقف نمایش خودکار' : 'شروع نمایش خودکار'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6ca] text-[#665b4b] transition-colors hover:bg-white"
              >
                {isAutoPlaying ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => moveActive(1)}
                aria-label="استایل‌های قبلی"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6ca] text-[#665b4b] transition-colors hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveActive(-1)}
                aria-label="استایل‌های بعدی"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6ca] text-[#665b4b] transition-colors hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="relative mb-2 h-px overflow-hidden rounded-full bg-[#e6ddc9]/80" aria-hidden="true">
            {isAutoPlaying && !isDeckHovered && visibleItems.length > 1 && !reduceMotion && (
              <motion.span
                key={`${activeId}-${selectedCategory}`}
                className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#9b7948] to-[#d3ab63]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 6, ease: 'linear' }}
              />
            )}
          </div>

          <div
            ref={deckRef}
            role="group"
            aria-label="دک کارت‌های استایل"
            onKeyDown={onDeckKeyDown}
            tabIndex={0}
            className="deck-viewport relative mx-auto h-[200px] w-full max-w-[720px] outline-none focus-visible:ring-2 focus-visible:ring-[#a3783a] sm:h-[220px] [perspective:1400px]"
          >
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-[150px] w-[112px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-2xl bg-[#e9e5de]"
                  style={{ transform: `translate(-50%, -50%) translateX(${(index - 2) * 70}px)` }}
                />
              ))}

            {!loading &&
              visibleItems.map((item, index) => {
                const offset = index - (activeIndex < 0 ? 0 : activeIndex);
                const distance = Math.abs(offset);
                if (distance > DECK_WINDOW) return null;
                const isActive = offset === 0;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item.id)}
                    aria-pressed={isActive}
                    aria-label={isActive ? `${item.name}، کارت روبه‌رو` : `${item.name}، آوردن به رو`}
                    className="deck-card absolute left-1/2 top-1/2"
                    style={{ zIndex: 20 - distance }}
                    animate={{
                      x: `calc(-50% + ${offset * 84}px)`,
                      y: '-50%',
                      z: -distance * 95,
                      rotateY: isActive ? 0 : offset > 0 ? -38 : 38,
                      scale: 1 - Math.min(distance, DECK_WINDOW) * 0.08,
                      opacity: 1 - distance * 0.17,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
                  >
                    <motion.span
                      className="relative block h-full w-full [transform-style:preserve-3d]"
                      animate={{ rotateY: isActive ? 180 : 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE, delay: isActive ? 0.1 : 0 }}
                    >
                      <span className={`deck-face flex flex-col items-center justify-between bg-white/85 px-1 pb-1.5 pt-2 ${isActive ? 'ring-1 ring-[#e3d7c3]' : ''}`}>
                        <img src={asset(item.image)} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className="h-[104px] w-[76px] object-contain" />
                        <span className="w-full truncate text-center text-[10px] font-medium text-[#6f6659]">{item.name}</span>
                      </span>
                      <span className="deck-face deck-face--back bg-[#fdfaf4]">
                        <img src={asset(item.modelPreview)} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain object-bottom" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#241d14]/70 to-transparent px-1.5 pb-1.5 pt-4 text-center text-[10px] font-bold text-[#f7f1e4]">
                          روی تن مانکن
                        </span>
                      </span>
                    </motion.span>
                  </motion.button>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
}
