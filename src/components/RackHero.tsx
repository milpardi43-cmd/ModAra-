import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getCategories, getClothingProducts } from '../lib/catalog';
import type { Product } from '../lib/supabase';
import { asset, formatPrice } from '../lib/format';
import { hangerFor, sideFor } from '../lib/hangerGarments';
import { rackOutfitLayerInfo } from '../lib/rackOutfitLayerInfo';

type RackHeroProps = {
  onNavigate: (view: string, param?: string) => void;
};

type RackOutfitLayer = {
  id: 'top' | 'trousers' | 'shoes' | 'full';
  src: string;
  pivotX: number;
  pivotY: number;
  delay: number;
};

type RackItem = {
  id: string;
  /** Product page target. */
  slug: string;
  /** Accessible name. */
  name: string;
  /** Photoreal side profile used on the shared rack while idle. */
  image: string;
  /** Pixel-accurate transparent top, trousers and shoe layers for the selected look. */
  outfitLayers: RackOutfitLayer[];
  /** Average fabric colour — used only for the glow behind the rack. */
  hex: string;
  /** width / height of the side-profile rack image. */
  aspect: number;
  /** Full catalogue record: what the product card reads out. */
  product: Product;
  /** Department label, e.g. «لباس». */
  categoryName: string;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Air between two hangers. */
const PIECE_GAP = 6;
/** Give side-profile silhouettes enough height to read clearly. */
const MIN_PIECE_HEIGHT = 240;
const MAX_PIECE_HEIGHT = 300;

export default function RackHero({ onNavigate }: RackHeroProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLUListElement>(null);
  const [items, setItems] = useState<RackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const shellRef = useRef<HTMLDivElement>(null);
  /** Piece height that makes the whole line fit the row exactly. */
  const [rackSize, setRackSize] = useState({ height: 240, fits: true });
  const suppressClick = useRef(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'light' }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getClothingProducts(), getCategories()])
      .then(([products, categories]) => {
        if (cancelled) return;
        const categoryNames = new Map<string, string>();
        for (const category of categories) categoryNames.set(category.id, category.name);
        /* Hang each product in profile; its complete cut-out is shown when selected. */
        const hanging = products
          .map((product) => {
            const garment = hangerFor(product.slug);
            if (!garment) return null;
            const profile = sideFor(product.slug) ?? garment;
            const layerInfo = rackOutfitLayerInfo[product.slug];
            const outfitLayers: RackOutfitLayer[] = layerInfo
              ? [
                  ...(layerInfo.hasTrousers && layerInfo.trousersPivotX !== null
                    ? [
                        {
                          id: 'trousers' as const,
                          src: `/images/rack/outfit-layers/${product.slug}-trousers.webp`,
                          pivotX: layerInfo.trousersPivotX,
                          pivotY: 0.045,
                          delay: 0.045,
                        },
                      ]
                    : []),
                  {
                    id: 'top',
                    src: `/images/rack/outfit-layers/${product.slug}-top.webp`,
                    pivotX: layerInfo.topPivotX,
                    pivotY: 0.045,
                    delay: 0,
                  },
                  {
                    id: 'shoes',
                    src: `/images/rack/outfit-layers/${product.slug}-shoes.webp`,
                    pivotX: 0.5,
                    pivotY: 0.82,
                    delay: 0.09,
                  },
                ]
              : [
                  {
                    id: 'full',
                    src: `/images/rack/outfits-cleaned/${product.slug}.webp`,
                    pivotX: 0.5,
                    pivotY: 0.045,
                    delay: 0,
                  },
                ];
            return {
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: profile.image,
              outfitLayers,
              hex: garment.hex,
              aspect: profile.aspect,
              product,
              categoryName: categoryNames.get(product.category_id ?? '') ?? 'کالکشن',
            } satisfies RackItem;
          })
          .filter((item): item is RackItem => item !== null)
          /* keep a natural rhythm, from narrower to wider side-profile silhouettes */
          .sort((a, b) => a.aspect - b.aspect);
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

  /**
   * Fit the line to the row: the sum of every garment's aspect ratio decides
   * the height, so 17 different silhouettes share the width perfectly and
   * nothing is cropped or scrolled on a normal screen.
   */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !items.length) return;

    const measure = () => {
      const width = shell.clientWidth;
      const gaps = PIECE_GAP * Math.max(0, items.length - 1);
      const totalAspect = items.reduce((sum, item) => sum + item.aspect, 0);
      if (!width || !totalAspect) return;
      const ideal = (width - gaps) / totalAspect;
      const height = Math.min(MAX_PIECE_HEIGHT, Math.max(MIN_PIECE_HEIGHT, ideal));
      setRackSize({ height, fits: ideal >= MIN_PIECE_HEIGHT });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [items]);

  const activeIndex = items.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : (items[0] ?? null);

  const updateScrollHints = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    // In RTL the scroll origin sits at the right edge, so progress is negative.
    const offset = Math.abs(track.scrollLeft);
    setHasScrolled(offset > 8);
    setCanScrollMore(offset < max - 8);
  }, []);

  useEffect(() => {
    updateScrollHints();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', updateScrollHints, { passive: true });
    window.addEventListener('resize', updateScrollHints);
    return () => {
      track.removeEventListener('scroll', updateScrollHints);
      window.removeEventListener('resize', updateScrollHints);
    };
  }, [updateScrollHints, items.length]);

  /** Keep the active piece inside the visible part of the rail. */
  const revealPiece = useCallback(
    (id: string) => {
      const track = trackRef.current;
      if (!track) return;
      const piece = track.querySelector<HTMLElement>(`[data-piece="${id}"]`);
      if (!piece) return;
      const pieceRect = piece.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      if (
        !rackSize.fits &&
        (pieceRect.right > trackRect.right || pieceRect.left < trackRect.left)
      ) {
        piece.scrollIntoView({
          inline: 'center',
          block: 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      }
    },
    [rackSize.fits, reduceMotion],
  );

  const selectRackItem = (id: string) => {
    setActiveId(id);
    window.requestAnimationFrame(() => revealPiece(id));
  };

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

  /* Dragging the rail: pieces lean like real hangers being pushed, then settle. */
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
      aria-label="رگال لباس مُدارا"
      className="relative isolate overflow-hidden bg-[#efeae1] pb-8 pt-16 sm:pb-10 sm:pt-20"
    >
      {/* Studio light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 92% at 50% -12%, #fdfaf5 0%, #f5f0e7 42%, #ece6db 74%, #e3dccd 100%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        animate={{ backgroundColor: activeItem ? `${activeItem.hex}42` : 'rgba(176,132,64,0.2)' }}
        transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
        className="pointer-events-none absolute left-1/2 top-32 -z-10 h-[420px] w-[760px] -translate-x-1/2 rounded-full blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-16 -z-10 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.92),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />

      <div ref={shellRef} className="mx-auto w-full max-w-[1440px] px-4 sm:px-8">
        {/* Product information follows the selected garment; intentionally no card frame. */}
        <div className="mx-auto mt-4 w-full max-w-[1100px] px-2 sm:px-0">
          <AnimatePresence mode="wait" initial={false}>
            {activeItem && (
              <motion.div
                key={activeItem.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.72, ease: EASE }}
                className="mx-auto grid w-full max-w-[1000px] grid-cols-1 gap-5 text-right sm:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-8"
                aria-live="polite"
              >
                <div className="relative mx-auto aspect-[8/11] w-full max-w-[280px]">
                  <div
                    role="img"
                    aria-label={`${activeItem.product.name}، نمای شفاف ست انتخاب‌شده`}
                    className="absolute inset-0 drop-shadow-[0_18px_18px_rgba(56,42,22,0.18)]"
                  >
                    {activeItem.outfitLayers.map((layer) => (
                      <motion.img
                        key={`${activeItem.slug}-${layer.id}`}
                        src={asset(layer.src)}
                        alt=""
                        aria-hidden="true"
                        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.5,
                          delay: reduceMotion ? 0 : layer.delay,
                          ease: EASE,
                        }}
                        loading="eager"
                        fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
                        decoding="async"
                        draggable={false}
                        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                      />
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
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

        {/* The rail, and the garments on it */}
        <div className="relative mt-3 sm:mt-4">
          <div
            className="pointer-events-none absolute inset-x-0 top-[6px] z-20 h-[16px]"
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 top-[6px] h-[3px] rounded-full bg-[linear-gradient(90deg,#cdb68c_0%,#b1946a_16%,#e7d5b0_38%,#9d8050_60%,#dcc7a0_82%,#c3aa7c_100%)] shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_2px_4px_rgba(72,52,26,0.22)]" />
            <div className="absolute inset-x-0 top-[9px] h-[6px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(84,62,32,0.18),transparent_72%)] blur-[2px]" />
            <span className="absolute -top-[3px] left-[1.5%] h-[22px] w-[5px] rounded-full bg-[linear-gradient(180deg,#f6ecd6,#a98c5c)] shadow-[0_2px_6px_rgba(72,52,26,0.2)]" />
            <span className="absolute -top-[3px] right-[1.5%] h-[22px] w-[5px] rounded-full bg-[linear-gradient(180deg,#f6ecd6,#a98c5c)] shadow-[0_2px_6px_rgba(72,52,26,0.2)]" />
            <span className="rack-rail-glint absolute left-0 top-[3px] z-30 h-[8px] w-[14%] rounded-full" />
          </div>

          <ul
            ref={trackRef}
            aria-label="لباس‌های مُدارا روی رگال"
            onKeyDown={onRackKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
            onClickCapture={(event) => {
              /* a drag should not select a garment accidentally */
              if (!suppressClick.current) return;
              suppressClick.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
            className={`scrollbar-hide -mx-4 flex select-none items-start px-4 pb-3 pt-0 sm:mx-0 sm:px-0 ${
              rackSize.fits
                ? 'justify-center overflow-x-visible'
                : 'cursor-grab overflow-x-auto active:cursor-grabbing'
            }`}
            style={{ '--piece-h': `${rackSize.height}px` } as CSSProperties}
          >
            {loading &&
              Array.from({ length: 17 }).map((_, index) => (
                <li
                  key={`skeleton-${index}`}
                  aria-hidden="true"
                  className="shrink-0 animate-pulse rounded-[10px] bg-[#ded6c8]"
                  style={{
                    width: `calc(var(--piece-h) * 0.27)`,
                    height: 'var(--piece-h)',
                    marginInlineStart: index === 0 ? 0 : PIECE_GAP,
                  }}
                />
              ))}

            {!loading &&
              items.map((item, index) => {
                const isActive = item.id === activeItem?.id;
                const slotWidth = `calc(var(--piece-h) * ${item.aspect})`;

                return (
                  <li
                    key={item.id}
                    data-piece={item.id}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== 'touch') selectRackItem(item.id);
                    }}
                    className="rack-drop relative shrink-0"
                    style={{
                      width: slotWidth,
                      height: 'var(--piece-h)',
                      marginInlineStart: index === 0 ? 0 : PIECE_GAP,
                      animationDelay: `${index * 65}ms`,
                      zIndex: isActive ? 30 : 1,
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={isActive}
                      aria-label={
                        isActive
                          ? `${item.name}، نمایش ست بالا`
                          : `${item.name}، انتخاب برای نمایش ست بالا`
                      }
                      onFocus={() => selectRackItem(item.id)}
                      onClick={() => selectRackItem(item.id)}
                      className="group/piece absolute inset-0 block cursor-pointer outline-none focus-visible:z-40 focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a3783a]"
                    >
                      {/* soft glow of the garment's own colour */}
                      <span
                        aria-hidden="true"
                        style={
                          isActive
                            ? {
                                left: '50%',
                                right: 'auto',
                                width: rackSize.height * item.aspect,
                                marginLeft: -(rackSize.height * item.aspect) / 2,
                                transform: 'none',
                              }
                            : undefined
                        }
                        className={`pointer-events-none absolute -inset-x-6 -top-3 bottom-0 -z-10 rounded-[999px] bg-[radial-gradient(ellipse_at_50%_32%,rgba(255,250,238,0.98),rgba(255,240,212,0.4)_56%,transparent_74%)] blur-md transition-opacity duration-500 ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                      />

                      {/* The rail always stays a side-profile rack; selection updates the hero above. */}
                      <motion.img
                        src={asset(item.image)}
                        alt=""
                        aria-hidden="true"
                        initial={false}
                        animate={{ opacity: 1 }}
                        loading={index < 2 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                        decoding="async"
                        draggable={false}
                        style={
                          {
                            '--rack-sway-delay': `${(index % 7) * 0.55}s`,
                            '--rack-sway-duration': `${6.4 + (index % 5) * 0.85}s`,
                          } as CSSProperties
                        }
                        className={`rack-sway absolute inset-0 h-full w-full select-none object-contain object-top transition-[filter] duration-500 ${
                          isActive
                            ? 'brightness-[1.04] drop-shadow-[0_18px_20px_rgba(56,42,22,0.26)]'
                            : 'drop-shadow-[0_16px_18px_rgba(56,42,22,0.2)]'
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
          </ul>

          {/* edge fades keep the rail reading as a long rack */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-[linear-gradient(270deg,#efeae1,rgba(239,234,225,0))] transition-opacity duration-300 ${
              hasScrolled ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-[linear-gradient(90deg,#efeae1,rgba(239,234,225,0))] transition-opacity duration-300 ${
              canScrollMore && !rackSize.fits ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* the rail\'s meter: one quiet, symmetric line under the pieces */}
          <div className="mx-auto mt-2.5 flex w-full max-w-3xl items-center gap-3 sm:mt-3">
            <span
              aria-hidden="true"
              className="w-5 shrink-0 text-center text-[9.5px] font-bold tabular-nums text-[#a99c86]"
            >
              {new Intl.NumberFormat('fa-IR').format(1)}
            </span>
            <span
              role="progressbar"
              aria-label="جای قطعهٔ فعال روی رگال"
              aria-valuemin={1}
              aria-valuemax={Math.max(items.length, 1)}
              aria-valuenow={Math.max(activeIndex, 0) + 1}
              className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[#dccfb6]"
            >
              <span
                className="absolute inset-y-0 right-0 rounded-full bg-[linear-gradient(90deg,#c69a5b,#a3783a)] transition-[width] duration-500"
                style={{
                  width: `${
                    items.length > 1
                      ? Math.max(4, ((Math.max(activeIndex, 0) + 1) / items.length) * 100)
                      : 100
                  }%`,
                }}
              />
            </span>
            <span
              aria-hidden="true"
              className="w-5 shrink-0 text-center text-[9.5px] font-bold tabular-nums text-[#a99c86]"
            >
              {new Intl.NumberFormat('fa-IR').format(items.length)}
            </span>
          </div>

          <p className="mx-auto mt-2 flex max-w-md items-center justify-center gap-2 text-center text-[11px] font-medium text-[#87785f]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b08440]" aria-hidden="true" />
            <span className="hidden sm:inline">برای دیدن ست کامل، روی لباس بروید یا آن را انتخاب کنید</span>
            <span className="sm:hidden">برای دیدن ست کامل، روی لباس بزنید</span>
          </p>

          {/* phones only: the line really does not fit, so it can be pushed */}
          {!rackSize.fits && (
            <div className="mt-3 flex items-center justify-center gap-3 sm:hidden">
              <button
                type="button"
                onClick={() => nudgeTrack(1)}
                aria-label="قطعه‌های قبلی"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6c9ae] bg-[#fdfaf2]/85 text-[#6b5d45] active:scale-95"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="text-[9.5px] text-[#a99c86]">برای مرور، رگال را بکشید</span>
              <button
                type="button"
                onClick={() => nudgeTrack(-1)}
                aria-label="قطعه‌های بعدی"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6c9ae] bg-[#fdfaf2]/85 text-[#6b5d45] active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
