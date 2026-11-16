import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from 'framer-motion';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pause, Play, ShoppingBag, Star } from 'lucide-react';
import { getAllProducts, getCategories } from '../lib/catalog';
import type { Product } from '../lib/supabase';
import { asset, formatPrice, imageSrcSet, optimizedAsset } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { rackOutfitLayerInfo } from '../lib/rackOutfitLayerInfo';
import { fabricToneName, glowTint } from '../lib/fabricTone';
import { productPalette } from '../lib/productPalette';
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
  /**
   * Final URL the stage paints, and only this one. Clothes paint the try-on
   * composite (cache-keyed by RACK_OUTFIT_REVISION so the preload in index.html
   * matches); every other category paints its own catalogue photo through the
   * generated WebP derivatives, because hero/model-pair was two files shared by
   * 15 products — the same bare body for every watch, bag and pair of glasses.
   */
  stageSrc: string;
  /** Density candidates for the catalogue photo; absent for the try-on art. */
  stageSrcSet?: string;
  /** Exact catalog product art used if the model preview cannot load. */
  outfitPreview: string;
  /** Final image fallback if both the model and main product preview fail. */
  previewFallback: string;
  /** Average fabric colour, used for the product swatch and the glow behind the rail. */
  hex: string;
  /**
   * The measured average colour of the cut-out, or null when no art was
   * analysed. `hex` carries a studio fallback because a glow can be generic;
   * a colour *name* in the copy cannot be, so the look sheet only speaks when
   * this holds a real measurement.
   */
  fabricHex: string | null;
  /** width / height of the side-profile rack image. */
  aspect: number;
  /** Full catalogue record: what the product card reads out. */
  product: Product;
  /** Category slug used by the rack filters. */
  categorySlug: string;
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

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** The other half of a cut: things leave faster than they arrive, and they
 *  accelerate out. Equal in/equal out is what makes a UI fade read as software. */
const CUT_EASE: [number, number, number, number] = [0.4, 0, 1, 1];
/** How long a look holds the stage before the rack advances. */
const RACK_ADVANCE_MS = 6000;
/** A flick past the edge of the stage is a request to change the look. */
const CUT_FLICK_PX = 38;
const CUT_FLICK_VEL = 480;
/**
 * How far the stage turns — measured, not guessed.
 *
 * The artwork is a photograph of a person, so a large rotation does not read as a
 * turn: it reads as a cardboard cut-out, and the face compresses first because it
 * is the narrowest thing in frame. Rendering this exact composite at a range of
 * angles (perspective 1200px, the real 380x507 stage) put the ceiling at ~26°:
 * 12-26° reads as a garment swinging on its hook, 34° starts to squeeze the face,
 * and 45°+ is unmistakably a card. The turn is therefore small and the motion is
 * carried by the timing, the seam and the depth — not by the angle.
 */
const CUT_TURN_OUT = 22;
const CUT_TURN_IN = 26;
/** Narrower screens borrow less: the card is nearly the full column there. */
const CUT_TURN_NARROW = 0.78;
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
  const src = item.stageSrc;
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
  /* The bag lives in a context, but the confirmation has to belong to one look:
     the rack is still turning underneath, so the state is keyed by item id and an
     unrelated slide can never inherit someone else's "added" tick. */
  const [addedId, setAddedId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  /* The cut itself: which side the next look enters from, and how fast the
     choreography plays. `user` (tap, key, flick) is deliberately quicker than
     `auto` — an input deserves an answer, an ambient turn can breathe. */
  const [cutDir, setCutDir] = useState<1 | -1>(1);
  const [cutPace, setCutPace] = useState<'user' | 'auto'>('auto');
  const [isStageHovered, setIsStageHovered] = useState(false);
  /* The turn is the only thing in the hero that has to know the viewport, because
   * the angle, not the layout, is what overflows on a phone. */
  const [isNarrow, setIsNarrow] = useState(false);
  /* The id of the look whose artwork has actually decoded. The cut light is only
   * rendered for it, so the sweep can never cross empty paper on a cold cache —
   * a band over nothing is exactly the artefact that gives a swap away. */
  const [artReadyId, setArtReadyId] = useState<string | null>(null);
  /* The opening look is painted by the skeleton and then by the real slide; a light
   * sweep across that first frame would be decoration with nothing to announce. The
   * band appears from the second look onwards. */
  const [hasCut, setHasCut] = useState(false);
  const plateRef = useRef<HTMLImageElement | null>(null);
  const addedTimer = useRef<number | null>(null);
  const { addToCart } = useCart();
  const { user } = useAuth();
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
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry ? entry.isIntersecting : true), {
      rootMargin: '120px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsNarrow(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
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
            const productRackImage = `/images/rack/${categorySlug}/${product.slug}.webp`;
            const isClothing = categorySlug === 'clothing';
            const rackItem: RackItem = {
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: profile?.image ?? productRackImage,
              stageSrc: isClothing
                ? rackOutfitAsset(`/images/hero/try-on/${product.slug}.webp`)
                : optimizedAsset(product.image_url, 720),
              stageSrcSet: isClothing ? undefined : imageSrcSet(product.image_url, [480, 720]),
              outfitPreview: isClothing ? `/images/rack/outfits-cleaned/${product.slug}.webp` : product.image_url,
              previewFallback: garment?.image ?? product.image_url,
              // Clothing paints the colour of the cut-out itself (the transparent
              // art, so the studio background cannot dilute it); everything else
              // falls back to the measured average of its own catalogue photo —
              // scripts/generate-product-palette.mjs covers all 94 of them, which is
              // a fact about this product rather than the studio default.
              hex: profile?.hex ?? productPalette[product.image_url]?.hex ?? '#b9a783',
              fabricHex: profile?.hex ?? null,
              aspect: profile?.aspect ?? 0.75,
              product,
              categorySlug,
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
      /* A category change is a cut too — the stage swaps artwork, so it gets the
         same sweep rather than a bare paint. */
      setHasCut(true);
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
      if (selected && at >= 0) {
        const from = visibleItems.findIndex((item) => item.id === activeId);
        if (from >= 0 && at !== from) {
          /* Shortest way round the ring: the rack wraps, so 16 -> 0 is a step
             forward, not fifteen back. In RTL a forward step is a step left. */
          const n = visibleItems.length;
          let delta = at - from;
          if (n > 1) {
            if (delta > n / 2) delta -= n;
            if (delta < -n / 2) delta += n;
          }
          setCutDir(delta >= 0 ? 1 : -1);
        }
        setCutPace(origin);
      }
      setHasCut(true);
      setActiveId(id);
      window.requestAnimationFrame(() => revealPiece(id));
    },
    [activeId, items, revealPiece, visibleItems],
  );

  useEffect(
    () => () => {
      if (addedTimer.current !== null) window.clearTimeout(addedTimer.current);
    },
    [],
  );

  /* A warm image can finish decoding before React attaches onLoad, and then the
     sweep would never be allowed to play for the most common case of all — the
     look the neighbours preloaded. Ask the element itself as well. */
  const activeItemId = activeItem?.id ?? null;
  useEffect(() => {
    const image = plateRef.current;
    if (image && image.complete && image.naturalWidth > 0) setArtReadyId(activeItemId);
  }, [activeItemId]);

  /**
   * The one click a fashion hero owes a shopper: pick a look, put it in the bag.
   * Sign-in is a precondition of the cart context, and RackHero has no prop for
   * the auth sheet, so it asks through the same window event App listens to for
   * `modara:open-cart` — no new prop threading through Home, and the drawer and
   * the modal keep one owner.
   */
  const addToBag = useCallback(
    async (item: RackItem) => {
      if (!user) {
        setAnnouncement('برای افزودن به سبد وارد شوید');
        window.dispatchEvent(new CustomEvent('modara:open-auth'));
        return;
      }
      if (item.product.stock <= 0 || addingId) return;
      setAddingId(item.id);
      try {
        await addToCart(item.product.id);
        window.dispatchEvent(new CustomEvent('modara:open-cart'));
        setAddedId(item.id);
        setAnnouncement(`${item.name} به سبد اضافه شد`);
        if (addedTimer.current !== null) window.clearTimeout(addedTimer.current);
        addedTimer.current = window.setTimeout(() => setAddedId(null), 2000);
      } catch {
        setAnnouncement('افزودن به سبد انجام نشد؛ دوباره امتحان کنید');
      } finally {
        setAddingId(null);
      }
    },
    [addingId, addToCart, user],
  );

  /* Everything below moves transform and opacity only: no filters, no layout,
     nothing that repaints a 380x507 image per frame. The art leads, the type
     follows, and only the ENTERING look carries a direction — an exit that also
     slid sideways would have to remember which way it was travelling, and the
     value AnimatePresence snapshots is the previous one, so a step back would
     send the old look off the wrong side. Lifting it straight out of frame is both
     correct and what a garment does when it leaves a rail.

     The choreography, in seconds. `user` (tap, key, flick) answers in ~0.34s; an
   * ambient turn may take ~0.46s. The artwork always leads, the type follows one
   * row at a time and the side sheet lands last — the old swap had a single 0.16s
   * beat across the whole slide, which is why it read as a page reload.
   *
   * The exit is one value shared by both paces on purpose: an exiting look must
   * not be able to change speed because a new one was requested mid-flight.
   * Every entry below is a complete `from`/`to`/`out` set, so a child never has to
   * borrow timing from a parent that may already belong to the next look.
   */
  const cutTracks = useMemo(() => {
    /* Short on purpose: `mode="wait"` mounts the next look only after this has
       finished, so every millisecond here is a millisecond of paper. */
    const OUT = 0.13;
    const still = { lead: 0, step: 0, enter: 0, turn: 0, drift: 0, lift: 0, artLift: 0 };
    const paces = reduceMotion
      ? { user: still, auto: still }
      : {
          /* The last slot (`price`, 4) settles at 0.41s on a tap and 0.54s on an
             ambient turn — nothing in the column is unreachable for longer than a
             blink, which is the limit for controls that are painted but invisible. */
          user: { lead: 0.02, step: 0.022, enter: 0.3, turn: 0.52, drift: 18, lift: 6, artLift: 10 },
          auto: { lead: 0.04, step: 0.03, enter: 0.38, turn: 0.62, drift: 24, lift: 8, artLift: 13 },
        };
    /* Direction, as the element will read it: framer hands a resolver the presence
       `custom` when the element is leaving and the element's own `custom` when it is
       entering — and `undefined` on a very first mount, before any presence context
       exists. The closure `cutDir` is the fallback, so the first cut animates too. */
    const turnOf = (custom: number | undefined) => ((custom ?? cutDir) < 0 ? -1 : 1);
    const angleScale = isNarrow ? CUT_TURN_NARROW : 1;
    const build = (pace: 'user' | 'auto') => {
      const t = paces[pace];
      /* Reduced motion keeps one thing only: a 0.16s opacity exchange, so the stage
         never blinks. No travel, no settle, no sweep — those are the parts a
         vestibular-sensitive reader actually feels. */
      const away = reduceMotion ? 0 : 1;
      const beat = (slot: number): Variants => ({
        from: { opacity: 0, y: t.lift },
        to: { opacity: 1, y: 0, transition: { duration: t.enter, ease: EASE, delay: t.lead + slot * t.step } },
        out: { opacity: 0, y: -3 * away, transition: { duration: OUT * 0.8, ease: CUT_EASE } },
      });
      return {
        /* The wrapper owns nothing but the exit clock: a backstop that guarantees the
           pair never overlaps, whatever the children do. */
        root: {
          from: {},
          to: {},
          out: { opacity: 1, transition: { duration: OUT, ease: CUT_EASE } },
        } as Variants,
        /* The look itself: a short sideways carry and a settle, so the garment
           arrives and lands instead of cross-fading. Direction-dependent, so it is
           resolved per label (see the note on `dir` below). */
        cut: {
          from: (custom: number | undefined) => ({
            opacity: reduceMotion ? 0 : 0.25,
            /* Never from zero: the stage must not read as empty between two looks. */
            x: t.drift * (turnOf(custom) < 0 ? 1 : -1),
          }),
          to: { opacity: 1, x: 0, transition: { duration: t.enter + 0.06, ease: EASE } },
          out: { opacity: 0, y: -10 * away, transition: { duration: OUT, ease: CUT_EASE } },
        } as Variants,
        /* The turn, as an open card: in RTL the next garment hangs to the left, so the
           stage swings its left edge INTO the screen. `preserve-3d` is what makes the
           glow and the floor ellipse travel on their own arcs instead of riding along
           flat — that difference is the whole effect. Perspective lives on the wrapper
           (CSS), not here, so these are pure transform properties.

           `from` and `out` are resolver FUNCTIONS, not targets. That is not a style
           choice: framer resolves a variant label by looking it up on `variants` and
           calling it with `custom` if it is a function, and an element that is
           leaving gets `AnimatePresence`'s `custom` — rebuilt the moment it is marked
           as leaving. A plain object captured at render would replay the direction
           from when the card arrived, so every other swap would turn the wrong way.
           (A resolver on the outer object instead of on the label resolves to
           undefined and nothing animates at all — the trap this shape avoids.) */
        turn: {
          from: (custom: number | undefined) => ({
            rotateY: turnOf(custom) * CUT_TURN_IN * angleScale,
            scale: 0.99,
          }),
          to: { rotateY: 0, scale: 1, transition: { duration: t.turn + 0.08, ease: EASE } },
          out: (custom: number | undefined) => ({
            rotateY: -turnOf(custom) * CUT_TURN_OUT * angleScale,
            scale: 1,
            transition: { duration: OUT * 1.5, ease: CUT_EASE },
          }),
        } as Variants,
        /* The artwork, kept to transform only. `opacity` below 1 is a grouping
           property: it forces the subtree flat, and the glow's depth would drop out in
           the middle of the very turn that is showing it off. The fade lives on `cut`,
           one level outside the perspective, where flattening is harmless. */
        art: {
          from: { y: t.artLift, scale: 1 - 0.012 * away },
          to: {
            y: 0,
            scale: 1,
            transition: reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 300, damping: 32, mass: 0.9, delay: t.lead },
          },
          /* The old look keeps its full size while it swings away. Scaling it down at
             the same time turns a turn into a shrink, and the shrink is what people
             read as "a card being put away". */
          out: { y: 0, scale: 1, transition: { duration: OUT, ease: CUT_EASE } },
        } as Variants,
        /* Fixed slots, not DOM order: an accessory carries one more line than a look
           and the schedule must not shift for the reader on a category change. */
        copy: beat(0),
        caption: beat(0.7),
        title: beat(1),
        body: beat(2),
        meta: beat(3),
        price: beat(4),
        aside: beat(6),
      };
    };
    return { user: build('user'), auto: build('auto') };
  }, [cutDir, isNarrow, reduceMotion]);
  const cutTrack = cutTracks[cutPace];

  /**
   * A flick on the stage asks for the next look — the same gesture the rail already
   * answers to, so nobody has to learn two. The direction is RTL: the next garment
   * hangs to the LEFT of this one, so it is brought in by pulling the stage to the
   * right (positive offset), exactly like the stage's own enter direction.
   */
  const onStageDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const passed = Math.abs(info.offset.x) >= CUT_FLICK_PX || Math.abs(info.velocity.x) >= CUT_FLICK_VEL;
    if (!passed) return;
    moveActive(info.offset.x > 0 || info.velocity.x > 0 ? 1 : -1);
  };

  const autoplayRunning = isAutoPlaying && !reduceMotion && isInView && !isSelectorHovered && !isStageHovered;

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

  const moveActive = (step: 1 | -1): void => {
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
      {/* One stable h1 for the home page. The product name inside each slide is an h2:
          it rotates with the rack, and a headline that changes every six seconds is a
          poor landmark for assistive tech and a poor one for crawlers. */}
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
          <AnimatePresence mode="wait" initial={false} custom={cutDir}>
            {activeItem && (
              <motion.div
                /* The key is what makes the cut: a fresh subtree for every look, so
                   the CSS on the stage (glow bloom, floor spread, light sweep) can
                   restart with it while React's DOM work stays exactly as large. */
                key={activeItem.id}
                className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-3 text-right lg:grid-cols-[minmax(0,1.38fr)_minmax(0,380px)_minmax(0,0.62fr)] lg:items-center"
                role="group"
                aria-roledescription="slide"
                aria-label={`استایل ${faNumber((activeIndex >= 0 ? activeIndex : 0) + 1)} از ${faNumber(visibleItems.length)}`}
                variants={cutTrack.root}
                initial="from"
                animate="to"
                exit="out"
              >
                <div className="lg:col-start-2 lg:row-start-1">
                  <motion.div
                    variants={cutTrack.cut}
                    initial="from"
                    animate="to"
                    exit="out"
                    drag={reduceMotion ? false : 'x'}
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.12}
                    onDragEnd={onStageDragEnd}
                    /* Touch action stays on the DOM node framer builds; the pan is
                       horizontal only, so a vertical swipe still scrolls the page. */
                    className="min-w-0 cursor-grab active:cursor-grabbing"
                    onMouseEnter={() => setIsStageHovered(true)}
                    onMouseLeave={() => setIsStageHovered(false)}
                  >
                    {/* The camera. One element, because perspective belongs to the
                        parent: putting it on the node that also rotates would cancel
                        the rotation it is supposed to reveal. */}
                    <div className="rack-perspective min-w-0">
                      <motion.div
                        /* Only cut-out looks turn. A catalogue photograph carries
                         `mix-blend-mode` + `mask-image` together, and rotating that
                         pair is the one combination Safari has broken for years — the
                         accessory slides keep the flat plate that was signed off. */
                        variants={activeItem.categorySlug === 'clothing' ? cutTrack.turn : undefined}
                        custom={cutDir}
                        initial="from"
                        animate="to"
                        exit="out"
                        className={`min-w-0 ${activeItem.categorySlug === 'clothing' ? 'rack-3d' : ''}`}
                      >
                        <motion.div variants={cutTrack.art} className="rack-3d-layer min-w-0">
                          <div
                            data-dir={cutDir > 0 ? 'next' : 'prev'}
                            className={`rack-outfit-stage ${
                              activeItem.categorySlug === 'clothing' ? 'rack-3d' : 'rack-outfit-photo'
                            }`}
                            style={{ ['--fabric-glow' as string]: glowTint(activeItem.hex) ?? activeItem.hex }}
                          >
                            <span className="rack-fabric-glow" aria-hidden="true" />
                            {hasCut && artReadyId === activeItem.id && (
                              <span
                                aria-hidden="true"
                                className="rack-cut-light"
                                /* The band travels with the change, so a step back sweeps
                                 the other way. Direction is an attribute on the stage,
                                 not a per-render style: the sweep stays one composited
                                 translate and the artwork is never re-rendered for it. */
                                data-dir={cutDir > 0 ? 'next' : 'prev'}
                              />
                            )}
                            {activeItem.categorySlug === 'clothing' && artReadyId === activeItem.id && (
                              /* The edge of the door: a lit gold rule on the trailing side
                             of the plate, for as long as the look is turning. It is a
                             sibling of the artwork so it can catch the light without
                             tinting the garment, and it is only ever the trail — the
                             leading edge of a door does not glow. */
                              <span
                                aria-hidden="true"
                                className="rack-cut-seam"
                                style={{ [cutDir > 0 ? 'left' : 'right']: 0 }}
                              />
                            )}
                            <div
                              role="img"
                              aria-label={`${activeItem.product.name}، نمای کامل ست`}
                              className="rack-outfit-plate absolute inset-0 z-10"
                            >
                              <img
                                key={activeItem.slug}
                                ref={plateRef}
                                src={activeItem.stageSrc}
                                srcSet={activeItem.stageSrcSet}
                                sizes="(min-width: 1024px) 380px, 88vw"
                                alt=""
                                aria-hidden="true"
                                loading="eager"
                                fetchPriority="high"
                                decoding="async"
                                draggable={false}
                                onLoad={() => setArtReadyId(activeItem.id)}
                                onError={(event) => {
                                  const image = event.currentTarget;
                                  // Assigning .src does not clear .srcset — the browser
                                  // would keep picking a candidate off the set and never
                                  // reach the fallback URL. Drop the set on the first error.
                                  image.srcset = '';
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
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
                <div className="w-full max-w-[440px] min-w-0 justify-self-start text-right lg:col-start-1 lg:row-start-1">
                  <motion.div
                    variants={cutTrack.copy}
                    initial="from"
                    animate="to"
                    exit="out"
                    className="mb-2 flex flex-wrap items-center justify-start gap-2.5"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cdbb99] bg-[#fdfaf4]/70 px-3 py-1 text-xs font-bold text-[#7d6636]">
                      <span
                        className="h-1.5 w-1.5 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: activeItem.hex }}
                        aria-hidden="true"
                      />
                      {activeItem.categoryName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-[#7d6636]">
                      <Star className="h-3.5 w-3.5 fill-[#e6b95e] text-[#9d7520]" aria-hidden="true" />
                      {new Intl.NumberFormat('fa-IR').format(Number(activeItem.product.rating.toFixed(1)))}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-[#6f6659]">
                      {new Intl.NumberFormat('fa-IR').format(activeIndex + 1)} /{' '}
                      {new Intl.NumberFormat('fa-IR').format(visibleItems.length)}
                    </span>
                  </motion.div>

                  {activeItem.categorySlug !== 'clothing' && (
                    /* The photo used to be a 64px thumbnail next to a bare body, and
                       the caption read like a commit message. Now the catalogue image
                       is the stage itself, so this line only says what you are seeing. */
                    <motion.p
                      variants={cutTrack.caption}
                      initial="from"
                      animate="to"
                      exit="out"
                      className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#ded8ce] bg-white/55 px-3 py-1 text-xs font-medium text-[#6b6152]"
                    >
                      تصویر خودِ کالا از کاتالوگ مُدارا
                    </motion.p>
                  )}

                  {/* The title keeps its own timing rather than a slot: it is the one
                      line that must be readable the instant the look lands. */}
                  <motion.h2
                    variants={cutTrack.title}
                    initial="from"
                    animate="to"
                    exit="out"
                    className="text-balance text-[clamp(1.2rem,2vw,1.75rem)] font-extrabold leading-[1.35] text-[#241d14]"
                  >
                    {activeItem.product.name}
                  </motion.h2>
                  {activeItem.product.description && (
                    <motion.p
                      variants={cutTrack.body}
                      initial="from"
                      animate="to"
                      exit="out"
                      className="mt-2 max-w-[30rem] text-xs leading-[1.75] text-[#6b6152] sm:text-[13px]"
                    >
                      {activeItem.product.description}
                    </motion.p>
                  )}

                  <motion.div
                    variants={cutTrack.meta}
                    initial="from"
                    animate="to"
                    exit="out"
                    className="mt-3 flex flex-wrap items-center justify-start gap-2"
                  >
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${activeItem.product.stock > 0 ? 'bg-[#edf3e9] text-[#45603a]' : 'bg-[#f7ece8] text-[#985c4b]'}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${activeItem.product.stock > 0 ? 'bg-[#668b55]' : 'bg-[#b87561]'}`}
                        aria-hidden="true"
                      />
                      {activeItem.product.stock > 0
                        ? `${new Intl.NumberFormat('fa-IR').format(activeItem.product.stock)} عدد موجود`
                        : 'ناموجود'}
                    </span>
                  </motion.div>

                  <motion.div
                    variants={cutTrack.price}
                    initial="from"
                    animate="to"
                    exit="out"
                    className="mt-4 border-t border-[#cdbb99]/60 pt-3"
                  >
                    <span className="block whitespace-nowrap text-base font-extrabold text-[#3f3527] sm:text-lg">
                      {formatPrice(activeItem.product.price)}
                    </span>
                    {/* Two actions, one row, equal width: `min-w` on each keeps the
                        "added" label from resizing the button, so the rack cannot
                        jitter as the slide swaps or the state flips. Adding to the
                        bag is the primary verb of a fashion hero, so it takes the
                        filled pill and "مشاهدهٔ محصول" becomes the outline. */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => addToBag(activeItem)}
                        disabled={addingId === activeItem.id || activeItem.product.stock <= 0}
                        className={`inline-flex min-h-[2.75rem] min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-300 ${
                          activeItem.product.stock <= 0
                            ? 'cursor-not-allowed bg-[#e7dfd2] text-[#6b6152]'
                            : addedId === activeItem.id
                              ? 'bg-[#45603a] text-[#f7f1e4]'
                              : 'bg-[#241d14] text-[#f7f1e4] shadow-[0_8px_20px_-10px_rgba(36,29,20,0.8)] hover:-translate-y-0.5 hover:bg-[#3a2f20] active:translate-y-0'
                        }`}
                      >
                        {activeItem.product.stock <= 0 ? (
                          'این کالا فعلاً موجود نیست'
                        ) : addedId === activeItem.id ? (
                          <>
                            <Check className="h-4 w-4" aria-hidden="true" />
                            به سبد اضافه شد
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                            {addingId === activeItem.id ? 'در حال افزودن…' : 'افزودن به سبد'}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('product', activeItem.slug)}
                        className="group inline-flex min-h-[2.75rem] min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full border border-[#cdbb99] bg-[#fdfaf4]/70 px-4 py-2.5 text-xs font-semibold text-[#3f3527] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
                      >
                        مشاهدهٔ محصول
                        <ArrowLeft
                          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* The sheet for the look on stage. This end track (172px at lg,
                    222px at the 1120 cap) held nothing at all before, so it now
                    carries the parts the shot is built from — every line read out of
                    data the build already measures: the tone name is derived from the
                    average pixel colour of the cut-out (src/lib/fabricTone.ts) and the
                    trouser row comes from scripts/split-rack-outfits.py classifying
                    the transparent layers of this exact composite. Nothing here is
                    copy the catalogue cannot support. */}
                <motion.aside
                  variants={cutTrack.aside}
                  initial="from"
                  animate="to"
                  exit="out"
                  className="hidden w-full min-w-0 max-w-[220px] justify-self-end lg:col-start-3 lg:row-start-1 lg:block"
                  aria-label="اجزای این نگاه"
                >
                  <p className="text-xs font-bold tracking-[0.16em] text-[#7d6636]">این نگاه</p>
                  <dl className="mt-2 border-t border-[#ded8ce]/70 pt-1.5 text-xs leading-[1.6]">
                    <div className="flex items-baseline justify-between gap-3 border-b border-[#ded8ce]/45 py-1.5">
                      <dt className="shrink-0 text-[#6f6659]">
                        {activeItem.categorySlug === 'clothing' ? 'بالاتنه' : 'کالا'}
                      </dt>
                      <dd className="min-w-0 truncate text-left font-semibold text-[#4a4234]">
                        {activeItem.product.name}
                      </dd>
                    </div>
                    {activeItem.fabricHex && (
                      <div className="flex items-center justify-between gap-3 border-b border-[#ded8ce]/45 py-1.5">
                        <dt className="shrink-0 text-[#6f6659]">رنگ پارچه</dt>
                        <dd className="flex min-w-0 items-center gap-1.5 text-left font-semibold text-[#4a4234]">
                          {fabricToneName(activeItem.fabricHex) ?? 'تک‌رنگ'}
                          <span
                            className="h-3 w-3 shrink-0 rounded-[4px] ring-1 ring-black/10"
                            style={{ backgroundColor: activeItem.fabricHex }}
                            aria-hidden="true"
                          />
                        </dd>
                      </div>
                    )}
                    {activeItem.categorySlug === 'clothing' && (
                      <div className="flex items-baseline justify-between gap-3 border-b border-[#ded8ce]/45 py-1.5">
                        <dt className="shrink-0 text-[#6f6659]">شلوار</dt>
                        <dd className="text-left font-semibold text-[#4a4234]">
                          {rackOutfitLayerInfo[activeItem.slug]?.hasTrousers
                            ? 'هم‌رنگ، در همین نما'
                            : 'ندارد؛ نگاه یک‌تکه'}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <button
                    type="button"
                    onClick={() => onNavigate('shop', activeItem.categorySlug)}
                    className="group mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#4a4234] underline decoration-[#cdbb99] decoration-1 underline-offset-4 transition-colors hover:text-[#7d6636] hover:decoration-[#7d6636]"
                  >
                    دیدن همهٔ {activeItem.categoryName}‌ها
                    <ArrowLeft
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
                      aria-hidden="true"
                    />
                  </button>
                </motion.aside>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Compact editorial selector: the real garment profiles remain the navigation.
            The artwork decides this gap, not us: after floor-anchoring the composite the
            shoes end 15-22px above the bottom of .rack-outfit-stage for every one of the
            17 looks, and the canvas below them is empty. So at lg the block is lifted 4px
            into that empty band (never onto the art) to keep a single 11-18px reading
            distance to the rule; below lg it stays on a positive margin, where the stage is
            narrower and the slack shrinks with it. z-20 keeps the hairline above the image
            layer instead of letting the figure paint over it. */}
        <div
          className="relative z-20 mx-auto mt-1 w-full max-w-[1040px] border-t border-[#ded8ce]/80 pt-3 lg:-mt-1"
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
              <p className="mb-1 text-xs font-bold tracking-[0.14em] text-[#7d6636]">MODARA · LOOKBOOK</p>
              <h2 className="text-lg font-bold text-[#342d24] sm:text-xl">انتخاب استایل</h2>
              <p className="mt-1 text-xs text-[#6b6152] sm:text-[13px]">
                لباس را روی مدل ببینید یا کیف، عینک، ساعت و اکسسوری را انتخاب کنید
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-[#6f6659]">
                {new Intl.NumberFormat('fa-IR').format(Math.max(activeIndex + 1, 1))} /{' '}
                {new Intl.NumberFormat('fa-IR').format(visibleItems.length)}
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
                {isAutoPlaying ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                )}
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

          <div
            className="mb-2 flex flex-wrap items-center justify-start gap-2"
            role="group"
            aria-label="فیلتر دسته‌بندی محصولات"
          >
            {RACK_FILTERS.map((filter) => {
              const isSelected = selectedCategory === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCategory(filter.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected ? 'border-[#927444] bg-[#241d14] text-[#f7f1e4]' : 'border-[#ddd6ca] bg-white/50 text-[#665b4b] hover:bg-white'}`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* The rail is a sibling of the scroll area, never inside it: a bar is
              bolted to the wall and the garments travel along it. The host exists so
              .rack-rail has an edge to measure from that does not scroll or reflow. */}
          <div className="relative">
            <div className="rack-rail" aria-hidden="true">
              <span className="rack-rail__mount rack-rail__mount--start" />
              <span className="rack-rail__mount rack-rail__mount--end" />
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
                  <li
                    key={`skeleton-${index}`}
                    aria-hidden="true"
                    className="relative h-[130px] w-[90px] shrink-0 animate-pulse rounded-xl bg-[#e9e5de]"
                  />
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
                        className="group relative flex h-full w-full flex-col items-center justify-between rounded-xl px-1 pb-1 pt-1 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#a3783a]"
                      >
                        {/* The paper starts 20px down — under the hook and the bar — so the rail
                            passes behind the hangers instead of being washed out by the card. The
                            negative z-index keeps it behind the artwork but inside the card box,
                            which .rack-style-item already isolates with its own z-index. */}
                        <span
                          aria-hidden="true"
                          className={`absolute inset-x-0 top-5 bottom-0 z-[-1] rounded-xl transition-colors ${
                            isActive
                              ? 'bg-white/80 shadow-[0_4px_18px_-12px_rgba(54,43,27,0.45)] ring-1 ring-[#e3d7c3]'
                              : 'bg-transparent group-hover:bg-white/55'
                          }`}
                        />
                        <img
                          src={asset(item.image)}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className={`h-[94px] w-[72px] origin-top object-contain object-center transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04] ${isActive ? 'scale-[1.04]' : ''}`}
                        />
                        <span
                          className={`w-full truncate text-center text-xs text-[#6f6659] ${isActive ? 'font-bold' : 'font-medium'}`}
                        >
                          {item.name}
                        </span>
                        {isActive && (
                          /* The rule under the chosen hanger draws itself instead of
                             appearing: the eye finds the new piece on the rail at the
                             same instant the stage changes, which is what makes the
                             swap feel driven rather than accidental. */
                          <span
                            aria-hidden="true"
                            className="rack-style-rule absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#9b7948]"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
