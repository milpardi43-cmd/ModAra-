import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import { getAllProducts, getCategories } from '../lib/catalog';
import type { Product } from '../lib/supabase';
import { asset, formatPrice } from '../lib/format';
import { hangerFor, sideFor } from '../lib/hangerGarments';

type RackHeroProps = {
  onNavigate: (view: string, param?: string) => void;
};

type RackItem = {
  id: string;
  /** Product page target. */
  slug: string;
  /** Accessible name. */
  name: string;
  /** Catalog product image used in the horizontal selector. */
  image: string;
  /** Full-body photo of the fixed gender model wearing this look. */
  modelPreview: string;
  /** Exact catalog product art used if the model preview cannot load. */
  outfitPreview: string;
  /** Final image fallback if both the model and main product preview fail. */
  previewFallback: string;
  /** Average fabric colour, used for the product swatch. */
  hex: string;
  /** width / height of the side-profile rack image. */
  aspect: number;
  /** Full catalogue record: what the product card reads out. */
  product: Product;
  /** Category slug used by the rack filters. */
  categorySlug: string;
  /** The same fixed human model is reused for every matching product. */
  modelGender: 'women' | 'men';
  /** Exact catalog photo for an accessory selected separately from the model look. */
  accessoryPreview?: string;
  /** Department label, e.g. «لباس». */
  categoryName: string;
};

type RackFilter = { id: string; label: string };

const RACK_FILTERS: RackFilter[] = [
  { id: 'clothing', label: 'لباس' },
  { id: 'bag', label: 'کیف' },
  { id: 'glasses', label: 'عینک' },
  { id: 'watch', label: 'ساعت' },
  { id: 'accessory', label: 'اکسسوری' },
];

const SUPPORTED_RACK_CATEGORIES = new Set(RACK_FILTERS.map((filter) => filter.id));

function modelGenderFor(product: Product, categorySlug: string): 'women' | 'men' {
  const searchable = `${product.slug} ${product.name} ${product.description ?? ''}`.toLowerCase();
  if (/(women|woman|womens|female|زنانه|خانم|دختر)/i.test(searchable)) return 'women';
  if (/(men|man|mens|male|مردانه|آقایان|مرد)/i.test(searchable)) return 'men';

  if (categorySlug === 'bag') {
    return /(handbag|crossbody|mini-shoulder|bucket|tote|straw|clutch|quilted|beach)/i.test(product.slug)
      ? 'women'
      : 'men';
  }
  if (categorySlug === 'glasses') {
    return /(cat-eye|oversized|round-tortoise|vintage)/i.test(product.slug) ? 'women' : 'men';
  }
  if (categorySlug === 'watch') return 'men';
  if (categorySlug === 'accessory') {
    return /(pearl|jewelry|earring|necklace|womens)/i.test(product.slug) ? 'women' : 'men';
  }
  return 'women';
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
// Netlify caches /images/* for 30 days; bump when the hero's try-on artwork changes.
const RACK_OUTFIT_REVISION = 'smiling-pair-accessories-v3';
const warmedOutfitSources = new Set<string>();

function rackOutfitAsset(path: string): string {
  const src = asset(path);
  return `${src}${src.includes('?') ? '&' : '?'}v=${RACK_OUTFIT_REVISION}`;
}

function warmOutfitPreview(item: RackItem) {
  const src = rackOutfitAsset(item.modelPreview);
  if (warmedOutfitSources.has(src)) return;
  warmedOutfitSources.add(src);
  const image = new Image();
  image.fetchPriority = 'high';
  image.decoding = 'async';
  image.src = src;
}

export default function RackHero({ onNavigate }: RackHeroProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLUListElement>(null);
  const [items, setItems] = useState<RackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('clothing');
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isSelectorHovered, setIsSelectorHovered] = useState(false);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const suppressClick = useRef(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'light' }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllProducts(), getCategories()])
      .then(([products, categories]) => {
        if (cancelled) return;
        const categoriesById = new Map(categories.map((category) => [category.id, category] as const));
        const rackItems = products
          .map((product) => {
            const category = categoriesById.get(product.category_id ?? '');
            if (!category || !SUPPORTED_RACK_CATEGORIES.has(category.slug) || !product.image_url) return null;
            const categorySlug = category.slug;

            const garment = hangerFor(product.slug);
            if (categorySlug === 'clothing' && !garment) return null;
            const profile = sideFor(product.slug) ?? garment;
            const modelGender = modelGenderFor(product, categorySlug);
            const productRackImage = `/images/rack/${categorySlug}/${product.slug}.webp`;
            const isClothing = categorySlug === 'clothing';
            const rackItem: RackItem = {
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: profile?.image ?? productRackImage,
              modelPreview: isClothing
                ? `/images/hero/try-on/${product.slug}.webp`
                : `/images/hero/model-pair/${modelGender}.webp`,
              outfitPreview: isClothing
                ? `/images/rack/outfits-cleaned/${product.slug}.webp`
                : product.image_url,
              previewFallback: garment?.image ?? product.image_url,
              hex: profile?.hex ?? '#b9a783',
              aspect: profile?.aspect ?? 0.75,
              product,
              categorySlug,
              modelGender,
              accessoryPreview: isClothing ? undefined : product.image_url,
              categoryName: category.name,
            };
            return rackItem;
          })
          .filter((item): item is RackItem => item !== null)
          /* Keep the existing rail rhythm while adding catalog accessory categories. */
          .sort((a, b) => a.aspect - b.aspect);
        const firstClothing = rackItems.find((item) => item.categorySlug === 'clothing');
        if (firstClothing) warmOutfitPreview(firstClothing);
        setItems(rackItems);
        setActiveId((current) => current ?? firstClothing?.id ?? rackItems[0]?.id ?? null);
      })
      .catch(() => {
        /* the rack simply stays empty instead of breaking the page */
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
    if (first) {
      warmOutfitPreview(first);
      setActiveId(first.id);
    }
  }, [activeId, visibleItems]);

  /** Keep the selected look visible in the horizontal style selector. */
  const revealPiece = useCallback(
    (id: string) => {
      const track = trackRef.current;
      if (!track) return;
      const piece = track.querySelector<HTMLElement>(`[data-piece="${id}"]`);
      if (!piece) return;
      const pieceRect = piece.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      if (pieceRect.right > trackRect.right || pieceRect.left < trackRect.left) {
        piece.scrollIntoView({
          inline: 'center',
          block: 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      }
    },
    [reduceMotion],
  );

  /** The cinematic beat: the chosen garment lifts off the rack rail and
   *  flies onto the mannequin while the new look settles in beneath it. */
  const stageRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<null | {
    src: string;
    key: number;
    from: { top: number; left: number; width: number; height: number };
    to: { top: number; left: number; width: number; height: number };
  }>(null);
  const finePointer = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches,
    [],
  );

  const startFlight = useCallback(
    (item: RackItem, source?: HTMLElement | null) => {
      if (reduceMotion) return;
      const stage = stageRef.current;
      const fromEl =
        source?.querySelector('img') ??
        trackRef.current?.querySelector<HTMLElement>(`[data-piece="${item.id}"] img`);
      if (!stage || !fromEl) return;
      const from = fromEl.getBoundingClientRect();
      const to = stage.getBoundingClientRect();
      setFlight({
        src: asset(item.image),
        key: Date.now(),
        from: { top: from.top, left: from.left, width: from.width, height: from.height },
        to: {
          top: to.top + to.height * 0.16,
          left: to.left + to.width * 0.22,
          width: to.width * 0.56,
          height: to.height * 0.46,
        },
      });
    },
    [reduceMotion],
  );

  const selectRackItem = useCallback((id: string, source?: HTMLElement | null) => {
    const selected = items.find((item) => item.id === id);
    if (selected) {
      warmOutfitPreview(selected);
      startFlight(selected, source);
    }
    setActiveId(id);
    window.requestAnimationFrame(() => revealPiece(id));
  }, [items, revealPiece, startFlight]);

  useEffect(() => {
    if (!isAutoPlaying || isSelectorHovered || visibleItems.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const current = visibleItems.findIndex((item) => item.id === activeId);
      const next = visibleItems[(current + 1 + visibleItems.length) % visibleItems.length];
      if (next) selectRackItem(next.id);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeId, isAutoPlaying, isSelectorHovered, selectRackItem, visibleItems]);

  const moveActive = (step: 1 | -1) => {
    if (visibleItems.length < 2) return;
    const from = activeIndex < 0 ? 0 : activeIndex;
    const next = visibleItems[(from + step + visibleItems.length) % visibleItems.length];
    if (next) selectRackItem(next.id);
  };

  /** In RTL the next piece sits to the left, so the arrows and keys invert. */
  const nudgeTrack = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.max(220, track.clientWidth * 0.7),
      behavior: 'smooth',
    });
  };

  const onRackKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Home' && visibleItems[0]) {
      event.preventDefault();
      selectRackItem(visibleItems[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = visibleItems[visibleItems.length - 1];
      if (last) {
        selectRackItem(last.id);
      }
    }
  };

  /* Allow direct horizontal browsing on pointer devices. */
  const onPointerDown = (event: React.PointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== 'mouse') return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startLeft: track.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    if (!track || !drag.current.active) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    track.scrollLeft = drag.current.startLeft - delta;
  };

  const onPointerUp = () => {
    if (!drag.current.active) return;
    suppressClick.current = drag.current.moved;
    drag.current.active = false;
  };

  return (
    <section
      aria-label="استایل‌های مُدارا"
      className="relative isolate overflow-hidden bg-[#f3efe8] pb-4 pt-20 sm:pb-5 lg:pt-6"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1024px] px-4 sm:px-8">
        {/* Compact editorial band: text and portrait sit close together in two columns. */}
        <div className="w-full px-1 sm:px-0">
          <AnimatePresence mode="wait" initial={false}>
            {activeItem && (
              <motion.div
                key={activeItem.id}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE }}
                className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-3 text-right lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)_minmax(0,1fr)] lg:items-center"
                aria-live="polite"
                onPointerMove={(event) => {
                  if (!finePointer || reduceMotion) return;
                  const stage = stageRef.current;
                  if (!stage) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = (event.clientX - rect.left) / rect.width - 0.5;
                  const y = (event.clientY - rect.top) / rect.height - 0.5;
                  stage.style.transform = `perspective(900px) rotateY(${(x * 3).toFixed(2)}deg) rotateX(${(-y * 2.5).toFixed(2)}deg)`;
                }}
                onPointerLeave={() => {
                  const stage = stageRef.current;
                  if (stage) stage.style.transform = '';
                }}
              >
                <div ref={stageRef} className="rack-outfit-stage lg:col-start-2 lg:row-start-1">
                  <span className="rack-spotlight" aria-hidden="true" />
                  <div
                    role="img"
                    aria-label={`${activeItem.product.name}، نمای کامل ست`}
                    className="absolute inset-0 z-10"
                  >
                    <img
                      key={activeItem.slug}
                      src={rackOutfitAsset(activeItem.modelPreview)}
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
                          image.src = rackOutfitAsset(activeItem.outfitPreview);
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
                </div>
                <div className="w-full min-w-0 text-right lg:col-start-1 lg:row-start-1">
                  {/* Brand line first: the hero is Modara's window, then the product. */}
                  <p className="mb-2.5 text-[11px] font-bold tracking-[0.22em] text-[#9a835f]">
                    مُدارا <span className="text-[#c8b795]" aria-hidden="true">·</span> MODARA
                  </p>

                  <h1 className="text-balance text-[clamp(1.2rem,2vw,1.75rem)] font-extrabold leading-[1.35] text-[#241d14]">
                    {activeItem.product.name}
                  </h1>

                  {/* One meta row: department, rating, and the exact product shot for accessories. */}
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
                      {new Intl.NumberFormat('fa-IR').format(Number(activeItem.product.rating.toFixed(1)))}
                    </span>
                    {activeItem.accessoryPreview && (
                      <img
                        src={asset(activeItem.accessoryPreview)}
                        alt={activeItem.name}
                        title={activeItem.name}
                        loading="eager"
                        decoding="async"
                        className="h-11 w-11 rounded-lg border border-[#e6dfd2] bg-white object-contain p-1"
                      />
                    )}
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
                      <ArrowLeft
                        className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Compact editorial selector: one control row (title, filters, buttons) above the rail. */}
        <div
          className="mx-auto mt-4 w-full max-w-[960px] border-t border-[#ded8ce]/80 pt-3.5 sm:mt-5 sm:pt-4"
          onMouseEnter={() => setIsSelectorHovered(true)}
          onMouseLeave={() => setIsSelectorHovered(false)}
          onFocusCapture={() => setIsSelectorHovered(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsSelectorHovered(false);
            }
          }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-base font-bold text-[#342d24] sm:text-lg">انتخاب استایل</h2>
              <span className="text-[11px] tabular-nums text-[#9a835f]">
                {new Intl.NumberFormat('fa-IR').format(Math.max(activeIndex + 1, 1))} /{' '}
                {new Intl.NumberFormat('fa-IR').format(visibleItems.length)}
              </span>
              <p className="sr-only">لباس را روی مدل ببینید یا کیف، عینک، ساعت و اکسسوری را انتخاب کنید.</p>
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
                onClick={() => nudgeTrack(1)}
                aria-label="استایل‌های قبلی"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6ca] text-[#665b4b] transition-colors hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => nudgeTrack(-1)}
                aria-label="استایل‌های بعدی"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6ca] text-[#665b4b] transition-colors hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Autoplay countdown hairline: grows right-to-left with the 6s cycle. */}
          <div className="relative mb-2 h-px overflow-hidden rounded-full bg-[#e6ddc9]/80" aria-hidden="true">
            {isAutoPlaying && !isSelectorHovered && visibleItems.length > 1 && !reduceMotion && (
              <motion.span
                key={`${activeId}-${selectedCategory}`}
                className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#9b7948] to-[#d3ab63]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 6, ease: 'linear' }}
              />
            )}
          </div>

          <ul
            ref={trackRef}
            aria-label={`انتخاب محصول از دستهٔ ${RACK_FILTERS.find((filter) => filter.id === selectedCategory)?.label ?? 'لباس'}`}
            onKeyDown={onRackKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
            onClickCapture={(event) => {
              if (!suppressClick.current) return;
              suppressClick.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
            className="scrollbar-hide -mx-4 flex items-stretch gap-2 overflow-x-auto px-4 pb-1 pt-2 sm:mx-0 sm:justify-start sm:gap-2.5 sm:px-0"
          >
            {loading &&
              Array.from({ length: 8 }).map((_, index) => (
                <li key={`skeleton-${index}`} aria-hidden="true" className="h-[104px] w-[76px] shrink-0 animate-pulse rounded-xl bg-[#e9e5de]" />
              ))}

            {!loading &&
              visibleItems.map((item) => {
                const isActive = item.id === activeItem?.id;
                return (
                  <li
                    key={item.id}
                    data-piece={item.id}
                    className={`rack-style-item h-[104px] w-[76px] shrink-0 ${isActive ? 'rack-style-item--active' : ''}`}
                  >
                    <button
                      type="button"
                      aria-pressed={isActive}
                      aria-label={isActive ? `${item.name}، محصول انتخاب‌شده` : `${item.name}، نمایش محصول`}
                      onFocus={(event) => selectRackItem(item.id, event.currentTarget)}
                      onClick={(event) => selectRackItem(item.id, event.currentTarget)}
                      className={`group relative flex h-full w-full flex-col items-center justify-between rounded-xl px-1 pb-1 pt-1 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#a3783a] ${isActive ? 'bg-white/80 shadow-[0_4px_18px_-12px_rgba(54,43,27,0.45)] ring-1 ring-[#e3d7c3]' : 'hover:bg-white/55'}`}
                    >
                      <img
                        src={asset(item.image)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className={`h-[72px] w-[58px] object-contain object-center transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04] ${isActive ? 'scale-[1.04]' : ''}`}
                      />
                      <span className={`w-full truncate text-center text-[10px] text-[#6f6659] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                      {isActive && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#9b7948]" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      {/* The garment in flight: rack thumbnail silhouette -> mannequin. */}
      {flight && (
        <motion.img
          key={flight.key}
          src={flight.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none fixed z-40 object-contain drop-shadow-[0_18px_30px_rgba(36,29,20,0.35)]"
          initial={{
            top: flight.from.top,
            left: flight.from.left,
            width: flight.from.width,
            height: flight.from.height,
            opacity: 0.95,
            rotate: -7,
            filter: 'blur(0px)',
          }}
          animate={{
            top: flight.to.top,
            left: flight.to.left,
            width: flight.to.width,
            height: flight.to.height,
            opacity: 0,
            rotate: 9,
            filter: 'blur(3px)',
          }}
          transition={{ duration: 0.7, ease: EASE }}
          onAnimationComplete={() => setFlight(null)}
        />
      )}
    </section>
  );
}
