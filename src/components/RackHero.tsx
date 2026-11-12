import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import { getCategories, getClothingProducts } from '../lib/catalog';
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
  /** Side-profile image used in the compact style selector. */
  image: string;
  /** Intact transparent full-look composite; avoids seams from split garment masks. */
  outfitPreview: string;
  /** Local hanger cut-out used only if the full-look preview cannot load. */
  previewFallback: string;
  /** Average fabric colour, used for the product swatch. */
  hex: string;
  /** width / height of the side-profile rack image. */
  aspect: number;
  /** Full catalogue record: what the product card reads out. */
  product: Product;
  /** Department label, e.g. «لباس». */
  categoryName: string;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const HERO_BACKGROUND_IMAGES = [
  '/images/hero/backgrounds/classic-tailoring.jpg',
  '/images/hero/backgrounds/soft-neutral-look.jpg',
  '/images/hero/backgrounds/navy-editorial-look.jpg',
] as const;
// Netlify caches /images/* for 30 days; this revision switches to intact composite previews.
const RACK_OUTFIT_REVISION = 'intact-composite-v1';
const warmedOutfitSources = new Set<string>();

function rackOutfitAsset(path: string): string {
  const src = asset(path);
  return `${src}${src.includes('?') ? '&' : '?'}v=${RACK_OUTFIT_REVISION}`;
}

function warmOutfitPreview(item: RackItem) {
  const src = rackOutfitAsset(item.outfitPreview);
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
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isSelectorHovered, setIsSelectorHovered] = useState(false);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const suppressClick = useRef(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'light' }));
  }, []);

  useEffect(() => {
    HERO_BACKGROUND_IMAGES.forEach((path) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = asset(path);
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setBackgroundIndex((index) => (index + 1) % HERO_BACKGROUND_IMAGES.length);
      }
    }, 9000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getClothingProducts(), getCategories()])
      .then(([products, categories]) => {
        if (cancelled) return;
        const categoryNames = new Map<string, string>();
        for (const category of categories) categoryNames.set(category.id, category.name);
        /* Keep the original full-look artwork intact to avoid split-mask seams. */
        const hanging = products
          .map((product) => {
            const garment = hangerFor(product.slug);
            if (!garment) return null;
            const profile = sideFor(product.slug) ?? garment;
            return {
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: profile.image,
              outfitPreview: `/images/rack/outfits-cleaned/${product.slug}.webp`,
              previewFallback: garment.image,
              hex: garment.hex,
              aspect: profile.aspect,
              product,
              categoryName: categoryNames.get(product.category_id ?? '') ?? 'کالکشن',
            } satisfies RackItem;
          })
          .filter((item): item is RackItem => item !== null)
          /* keep a natural rhythm, from narrower to wider side-profile silhouettes */
          .sort((a, b) => a.aspect - b.aspect);
        if (hanging[0]) warmOutfitPreview(hanging[0]);
        setItems(hanging);
        setActiveId((current) => current ?? hanging[0]?.id ?? null);
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

  const activeIndex = items.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : (items[0] ?? null);

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

  const selectRackItem = useCallback((id: string) => {
    const selected = items.find((item) => item.id === id);
    if (selected) warmOutfitPreview(selected);
    setActiveId(id);
    window.requestAnimationFrame(() => revealPiece(id));
  }, [items, revealPiece]);

  useEffect(() => {
    if (!isAutoPlaying || isSelectorHovered || items.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const current = items.findIndex((item) => item.id === activeId);
      const next = items[(current + 1 + items.length) % items.length];
      if (next) selectRackItem(next.id);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeId, isAutoPlaying, isSelectorHovered, items, selectRackItem]);

  const moveActive = (step: 1 | -1) => {
    if (items.length < 2) return;
    const from = activeIndex < 0 ? 0 : activeIndex;
    const next = items[(from + step + items.length) % items.length];
    selectRackItem(next.id);
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
    } else if (event.key === 'Home' && items[0]) {
      event.preventDefault();
      selectRackItem(items[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = items[items.length - 1];
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
      className="relative isolate overflow-hidden bg-[#f3efe8] pb-2 pt-4 sm:pb-2 sm:pt-6"
    >
      <div className="hero-background-slider" aria-hidden="true">
        {HERO_BACKGROUND_IMAGES.map((path, index) => (
          <div
            key={path}
            className={`hero-background-slide ${index === backgroundIndex ? 'hero-background-slide--active' : ''}`}
            style={{ backgroundImage: `url("${asset(path)}")` }}
          />
        ))}
        <div className="hero-background-veil" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-4 sm:px-8">
        {/* Compact editorial product display; product facts remain sourced from the catalogue. */}
        <div className="mx-auto w-full max-w-[1120px] px-1 sm:px-0">
          <AnimatePresence mode="wait" initial={false}>
            {activeItem && (
              <motion.div
                key={activeItem.id}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE }}
                className="mx-auto grid w-full max-w-[1040px] grid-cols-1 gap-3 text-right sm:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)] sm:items-center sm:gap-8"
                aria-live="polite"
              >
                <div className="rack-outfit-stage order-1 sm:order-2">
                  <div
                    role="img"
                    aria-label={`${activeItem.product.name}، نمای کامل ست`}
                    className="absolute inset-0 z-10"
                  >
                    <img
                      key={activeItem.slug}
                      src={rackOutfitAsset(activeItem.outfitPreview)}
                      alt=""
                      aria-hidden="true"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      draggable={false}
                      onError={(event) => {
                        const image = event.currentTarget;
                        if (image.dataset.fallback) {
                          image.style.visibility = 'hidden';
                          return;
                        }
                        image.dataset.fallback = 'true';
                        image.src = asset(activeItem.previewFallback);
                      }}
                      className="rack-outfit-composite pointer-events-none select-none"
                    />
                  </div>
                </div>
                <div className="min-w-0 order-2 sm:order-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
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
                      {new Intl.NumberFormat('fa-IR').format(items.length)}
                    </span>
                  </div>

                  <h1 className="text-balance text-[clamp(1.5rem,2.7vw,2.25rem)] font-extrabold leading-[1.3] text-[#241d14]">
                    {activeItem.product.name}
                  </h1>
                  {activeItem.product.description && (
                    <p className="mt-3 max-w-[46rem] text-[13px] leading-[1.85] text-[#6b6152] sm:text-sm">
                      {activeItem.product.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${activeItem.product.stock > 0 ? 'bg-[#edf3e9] text-[#45603a]' : 'bg-[#f7ece8] text-[#985c4b]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${activeItem.product.stock > 0 ? 'bg-[#668b55]' : 'bg-[#b87561]'}`} aria-hidden="true" />
                      {activeItem.product.stock > 0
                        ? `${new Intl.NumberFormat('fa-IR').format(activeItem.product.stock)} عدد موجود`
                        : 'ناموجود'}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#cdbb99]/60 pt-4">
                    <span className="whitespace-nowrap text-lg font-extrabold text-[#3f3527] sm:text-xl">
                      {formatPrice(activeItem.product.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('product', activeItem.slug)}
                      className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#241d14] px-5 py-3 text-xs font-semibold text-[#f7f1e4] shadow-[0_8px_20px_-10px_rgba(36,29,20,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3a2f20] active:translate-y-0"
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

        {/* Compact editorial selector: the real garment profiles remain the navigation. */}
        <div
          className="mx-auto mt-4 w-full max-w-[1040px] border-t border-[#ded8ce]/80 pt-3 sm:mt-5 sm:pt-4"
          onMouseEnter={() => setIsSelectorHovered(true)}
          onMouseLeave={() => setIsSelectorHovered(false)}
          onFocusCapture={() => setIsSelectorHovered(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsSelectorHovered(false);
            }
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-[#9a835f]">MODARA · LOOKBOOK</p>
              <h2 className="text-base font-bold text-[#342d24] sm:text-lg">انتخاب استایل</h2>
              <p className="mt-1 text-[11px] text-[#8b8275] sm:text-xs">یک آیتم را انتخاب کنید تا ست کامل آن نمایش داده شود</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums text-[#8b8275]">
                {new Intl.NumberFormat('fa-IR').format(Math.max(activeIndex + 1, 1))} / {new Intl.NumberFormat('fa-IR').format(items.length)}
              </span>
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

          <ul
            ref={trackRef}
            aria-label="انتخاب از میان استایل‌های زنانه و مردانه"
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
                <li key={`skeleton-${index}`} aria-hidden="true" className="h-[116px] w-[78px] shrink-0 animate-pulse rounded-xl bg-[#e9e5de]" />
              ))}

            {!loading &&
              items.map((item) => {
                const isActive = item.id === activeItem?.id;
                return (
                  <li
                    key={item.id}
                    data-piece={item.id}
                    className={`rack-style-item h-[116px] w-[78px] shrink-0 ${isActive ? 'rack-style-item--active' : ''}`}
                  >
                    <button
                      type="button"
                      aria-pressed={isActive}
                      aria-label={isActive ? `${item.name}، ست انتخاب‌شده` : `${item.name}، نمایش ست`}
                      onFocus={() => selectRackItem(item.id)}
                      onClick={() => selectRackItem(item.id)}
                      className={`group relative flex h-full w-full flex-col items-center justify-between rounded-xl px-1 pb-1 pt-1 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#a3783a] ${isActive ? 'bg-white/80 shadow-[0_4px_18px_-12px_rgba(54,43,27,0.45)] ring-1 ring-[#e3d7c3]' : 'hover:bg-white/55'}`}
                    >
                      <img
                        src={asset(item.image)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className={`h-[82px] w-[62px] object-contain object-center transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04] ${isActive ? 'scale-[1.04]' : ''}`}
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
    </section>
  );
}
