import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import { getAllProducts, getCategories } from '../lib/catalog';
import type { Product } from '../lib/supabase';
import { asset, formatPrice } from '../lib/format';
import { hangerFor, sideFor } from '../lib/hangerGarments';
import { RACK_OUTFIT_REVISION, rackFirstLookImage } from '../lib/rackFirstLook';

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
/** How long a look holds the stage before the rack advances. */
const RACK_ADVANCE_MS = 6000;
const faNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
const warmedOutfitSources = new Set<string>();

/**
 * The one place a try-on URL is built. index.html preloads the opening look through
 * the same RACK_OUTFIT_REVISION, so the warm request and the preloaded one match.
 */
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
  const [isInView, setIsInView] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const sectionRef = useRef<HTMLElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const suppressClick = useRef(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'light' }));
  }, []);

  /* Nobody is watching the stage once it scrolls away, and an off-screen tick
     still pays for a 74-113 kB artwork. Pause the carousel on the way out. */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry ? entry.isIntersecting : true),
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
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

  /**
   * `origin: 'user'` is what gets announced. A live region that also fires on the
   * interval would read the entire product card aloud twice a minute.
   */
  const selectRackItem = useCallback(
    (id: string, origin: 'user' | 'auto' = 'auto') => {
      const selected = items.find((item) => item.id === id);
      if (selected) warmOutfitPreview(selected);
      /* Both the 6s tick and the arrows land here, so fetch the neighbours now:
         by the time they are wanted they are already in the cache. */
      const at = visibleItems.findIndex((item) => item.id === id);
      if (selected && at >= 0 && visibleItems.length > 2) {
        for (const offset of [1, -1]) {
          const neighbour = visibleItems[(at + offset + visibleItems.length) % visibleItems.length];
          if (neighbour) warmOutfitPreview(neighbour);
        }
      }
      if (origin === 'user' && selected) {
        setAnnouncement(`${selected.name} — ${formatPrice(selected.product.price)}`);
      }
      setActiveId(id);
      window.requestAnimationFrame(() => revealPiece(id));
    },
    [items, revealPiece, visibleItems],
  );

  const autoplayRunning = isAutoPlaying && !reduceMotion && isInView && !isSelectorHovered;

  useEffect(() => {
    if (!autoplayRunning || visibleItems.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const current = visibleItems.findIndex((item) => item.id === activeId);
      const next = visibleItems[(current + 1 + visibleItems.length) % visibleItems.length];
      if (next) selectRackItem(next.id);
    }, RACK_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [activeId, autoplayRunning, selectRackItem, visibleItems]);

  const moveActive = (step: 1 | -1) => {
    if (visibleItems.length < 2) return;
    const from = activeIndex < 0 ? 0 : activeIndex;
    const next = visibleItems[(from + step + visibleItems.length) % visibleItems.length];
    if (next) selectRackItem(next.id, 'user');
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
      ref={sectionRef}
      aria-label="استایل‌های مُدارا"
      aria-roledescription="carousel"
      className="relative isolate overflow-hidden bg-[#f3efe8] pb-5 pt-[4.75rem] sm:pb-6 sm:pt-20 lg:pt-7"
    >
      {/* One stable h1 for the home page. The product name below it rotates with the
          rack, which makes a poor headline for assistive tech and for crawlers. */}
      <h1 className="sr-only">استایل‌های مُدارا</h1>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-4 sm:px-8">
        {/* Borderless try-on portrait on a deliberately off-centre axis. The stage's column is
            fed by a wider start track than end track (1.38fr vs 0.62fr in RTL, so the model moves
            ~106px left at lg and ~136px at the 1120px cap) — enough to keep the face clear of the
            fixed, page-centred wordmark in Header.tsx. Below lg there is no horizontal room to
            borrow, so the section clears the header with top padding instead. Product facts stay
            sourced from the catalogue. */}
        <div className="mx-auto w-full max-w-[1120px] px-1 sm:px-0">
          {!activeItem && (
            /* The opening look is decided by build-time data (src/lib/rackFirstLook.ts),
               so the stage and its photo exist on the very first paint: the 380×507 box
               never shifts the strip below it, and the download does not wait on the
               catalogue request. Real data replaces this frame-for-frame. */
            <div
              className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,380px)_minmax(0,0.62fr)] lg:items-center"
              aria-hidden="true"
            >
              <div className="rack-outfit-stage lg:col-start-2 lg:row-start-1">
                <img
                  src={rackOutfitAsset(rackFirstLookImage)}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="rack-outfit-composite select-none"
                />
              </div>
              <div className="w-full max-w-[440px] lg:col-start-1 lg:row-start-1">
                <div className="mb-2.5 h-5 w-28 animate-pulse rounded-full bg-[#e6e0d6]" />
                <div className="mb-2 h-6 w-3/4 animate-pulse rounded-lg bg-[#e6e0d6]" />
                <div className="mb-2 h-3.5 w-full animate-pulse rounded-lg bg-[#e6e0d6]" />
                <div className="h-3.5 w-2/3 animate-pulse rounded-lg bg-[#e6e0d6]" />
              </div>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            {activeItem && (
              <motion.div
                key={activeItem.id}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE }}
                className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-3 text-right lg:grid-cols-[minmax(0,1.38fr)_minmax(0,380px)_minmax(0,0.62fr)] lg:items-center"
                role="group"
                aria-roledescription="slide"
                aria-label={`استایل ${faNumber((activeIndex >= 0 ? activeIndex : 0) + 1)} از ${faNumber(visibleItems.length)}`}
              >
                <div className="rack-outfit-stage lg:col-start-2 lg:row-start-1">
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
                <div className="w-full max-w-[440px] min-w-0 justify-self-start text-right lg:col-start-1 lg:row-start-1">
                  <div className="mb-2 flex flex-wrap items-center justify-start gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cdbb99] bg-[#fdfaf4]/70 px-3 py-1 text-[10px] font-bold text-[#7d6636]">
                      <span
                        className="h-1.5 w-1.5 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: activeItem.hex }}
                        aria-hidden="true"
                      />
                      {activeItem.categoryName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-[#7d6636]">
                      <Star className="h-3.5 w-3.5 fill-[#e6b95e] text-[#c49639]" aria-hidden="true" />
                      {new Intl.NumberFormat('fa-IR').format(Number(activeItem.product.rating.toFixed(1)))}
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums text-[#9a8f7c]">
                      {new Intl.NumberFormat('fa-IR').format(activeIndex + 1)} /{' '}
                      {new Intl.NumberFormat('fa-IR').format(visibleItems.length)}
                    </span>
                  </div>

                  {activeItem.accessoryPreview && (
                    <div className="mb-3 inline-flex max-w-full items-center gap-3 rounded-xl border border-[#ded8ce] bg-white/55 p-2">
                      <img
                        src={asset(activeItem.accessoryPreview)}
                        alt={activeItem.name}
                        loading="eager"
                        decoding="async"
                        className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain"
                      />
                      <span className="text-[11px] font-medium text-[#7a6c58]">عکس مستقل کالای انتخاب‌شده</span>
                    </div>
                  )}

                  <h1 className="text-balance text-[clamp(1.2rem,2vw,1.75rem)] font-extrabold leading-[1.35] text-[#241d14]">
                    {activeItem.product.name}
                  </h1>
                  {activeItem.product.description && (
                    <p className="mt-2 max-w-[30rem] text-xs leading-[1.75] text-[#6b6152] sm:text-[13px]">
                      {activeItem.product.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${activeItem.product.stock > 0 ? 'bg-[#edf3e9] text-[#45603a]' : 'bg-[#f7ece8] text-[#985c4b]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${activeItem.product.stock > 0 ? 'bg-[#668b55]' : 'bg-[#b87561]'}`} aria-hidden="true" />
                      {activeItem.product.stock > 0
                        ? `${new Intl.NumberFormat('fa-IR').format(activeItem.product.stock)} عدد موجود`
                        : 'ناموجود'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-start gap-x-4 gap-y-2 border-t border-[#cdbb99]/60 pt-3">
                    <span className="whitespace-nowrap text-base font-extrabold text-[#3f3527] sm:text-lg">
                      {formatPrice(activeItem.product.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('product', activeItem.slug)}
                      className="group inline-flex items-center justify-center gap-1.5 rounded-full bg-[#241d14] px-4 py-2.5 text-[11px] font-semibold text-[#f7f1e4] shadow-[0_8px_20px_-10px_rgba(36,29,20,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3a2f20] active:translate-y-0"
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

        {/* Compact editorial selector: the real garment profiles remain the navigation.
            The gap above it is capped by the artwork itself — the model's feet end ~15px
            above the bottom of .rack-outfit-stage — so this block hugs that slack instead
            of re-spaces it. Keep the total above the rule under ~24px. */}
        <div
          className="relative mx-auto mt-2.5 w-full max-w-[1040px] border-t border-[#ded8ce]/80 pt-3"
          onMouseEnter={() => setIsSelectorHovered(true)}
          onMouseLeave={() => setIsSelectorHovered(false)}
          onFocusCapture={() => setIsSelectorHovered(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsSelectorHovered(false);
            }
          }}
        >
          {/* What the interval looks like: the rule fills over RACK_ADVANCE_MS and
              freezes with hover, pause, reduced motion or scroll-away, so it can
              never disagree with the stage. Costs no layout — it sits on the hairline. */}
          {activeItem && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-px block h-px overflow-hidden"
            >
              <span
                key={activeItem.id}
                className="hero-progress-fill block h-full w-full bg-gradient-to-l from-[#c9a15a] to-[#8a5a1d]"
                style={{
                  animationDuration: `${RACK_ADVANCE_MS}ms`,
                  animationPlayState: autoplayRunning ? 'running' : 'paused',
                }}
              />
            </span>
          )}
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-[11px] font-bold tracking-[0.14em] text-[#9a835f]">MODARA · LOOKBOOK</p>
              <h2 className="text-lg font-bold text-[#342d24] sm:text-xl">انتخاب استایل</h2>
              <p className="mt-1 text-xs text-[#8b8275] sm:text-[13px]">لباس را روی مدل ببینید یا کیف، عینک، ساعت و اکسسوری را انتخاب کنید</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums text-[#8b8275]">
                {new Intl.NumberFormat('fa-IR').format(Math.max(activeIndex + 1, 1))} / {new Intl.NumberFormat('fa-IR').format(visibleItems.length)}
              </span>
              <button
                type="button"
                onClick={() => setIsAutoPlaying((playing) => !playing)}
                aria-pressed={isAutoPlaying}
                aria-label={isAutoPlaying ? 'توقف نمایش خودکار' : 'شروع نمایش خودکار'}
                title={
                  reduceMotion
                    ? 'نمایش خودکار به‌دلیل تنظیم کاهش حرکت سیستم متوقف است'
                    : isAutoPlaying
                      ? 'توقف نمایش خودکار'
                      : 'شروع نمایش خودکار'
                }
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

          <div className="mb-2 flex flex-wrap items-center justify-start gap-2" role="group" aria-label="فیلتر دسته‌بندی محصولات">
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
            className="scrollbar-hide -mx-4 flex items-stretch gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-2 sm:mx-0 sm:justify-start sm:gap-2.5 sm:px-0"
          >
            {loading &&
              Array.from({ length: 8 }).map((_, index) => (
                <li key={`skeleton-${index}`} aria-hidden="true" className="h-[130px] w-[90px] shrink-0 animate-pulse rounded-xl bg-[#e9e5de]" />
              ))}

            {!loading &&
              visibleItems.map((item) => {
                const isActive = item.id === activeItem?.id;
                return (
                  <li
                    key={item.id}
                    data-piece={item.id}
                    className={`rack-style-item h-[130px] w-[90px] shrink-0 ${isActive ? 'rack-style-item--active' : ''}`}
                  >
                    <button
                      type="button"
                      aria-pressed={isActive}
                      aria-label={isActive ? `${item.name}، محصول انتخاب‌شده` : `${item.name}، نمایش محصول`}
                      onFocus={() => selectRackItem(item.id, 'user')}
                      onClick={() => selectRackItem(item.id, 'user')}
                      className={`group relative flex h-full w-full flex-col items-center justify-between rounded-xl px-1 pb-1 pt-1 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#a3783a] ${isActive ? 'bg-white/80 shadow-[0_4px_18px_-12px_rgba(54,43,27,0.45)] ring-1 ring-[#e3d7c3]' : 'hover:bg-white/55'}`}
                    >
                      <img
                        src={asset(item.image)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className={`h-[94px] w-[72px] object-contain object-center transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04] ${isActive ? 'scale-[1.04]' : ''}`}
                      />
                      <span className={`w-full truncate text-center text-[11px] text-[#6f6659] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                      {isActive && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#9b7948]" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </section>
  );
}
