import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import { getAllProducts, getCategories } from '../lib/catalog';
import { buildRackItems, type RackItem } from '../lib/rackItems';
import { asset, formatPrice } from '../lib/format';

type CinemaHeroProps = {
  onNavigate: (view: string, param?: string) => void;
};

/** One scene of the film per department. */
const SCENE_CATEGORIES = ['clothing', 'bag', 'glasses', 'watch', 'accessory'];
const SCENE_SECONDS = 7;

const tc = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function CinemaHero({ onNavigate }: CinemaHeroProps) {
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<RackItem[]>([]);
  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'dark' }));
    return () => {
      window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'light' }));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllProducts(), getCategories()])
      .then(([products, categories]) => {
        if (!cancelled) setItems(buildRackItems(products, categories));
      })
      .catch(() => {
        /* the show simply stays dark instead of breaking the page */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scenes = useMemo(() => {
    const picked = SCENE_CATEGORIES.map((slug) => items.find((item) => item.categorySlug === slug)).filter(
      (item): item is RackItem => Boolean(item),
    );
    return picked.length >= 3 ? picked : items.slice(0, 5);
  }, [items]);

  const goTo = useCallback((index: number) => {
    setScene(index);
    setElapsed(0);
  }, []);

  const step = useCallback(
    (delta: 1 | -1) => {
      if (!scenes.length) return;
      goTo((scene + delta + scenes.length) % scenes.length);
    },
    [goTo, scene, scenes.length],
  );

  useEffect(() => {
    if (!playing || !scenes.length) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setElapsed((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, scenes.length]);

  useEffect(() => {
    if (elapsed < SCENE_SECONDS || !scenes.length) return;
    goTo((scene + 1) % scenes.length);
  }, [elapsed, goTo, scene, scenes.length]);

  const active = scenes[scene] ?? null;
  const totalSeconds = scenes.length * SCENE_SECONDS;
  const nowSeconds = scene * SCENE_SECONDS + Math.min(elapsed, SCENE_SECONDS);

  return (
    <section
      aria-label="شوِ سینمایی مُدارا"
      className="relative isolate flex h-[92svh] min-h-[540px] items-end overflow-hidden bg-[#0d0a06]"
    >
      {active && (
        <>
          {/* Ambient wash: the look itself, blown up and drowned in dark. */}
          <img
            key={`bg-${active.slug}`}
            src={asset(active.modelPreview)}
            alt=""
            aria-hidden="true"
            className="cinema-bg absolute inset-0 h-full w-full object-cover object-top"
          />

          {/* Volumetric beam from the rig above. */}
          <span className="cinema-beam" aria-hidden="true" />

          {/* The model walks out of the light. */}
          <img
            key={`model-${active.slug}`}
            src={asset(active.modelPreview)}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="cinema-model pointer-events-none absolute bottom-[7%] left-1/2 h-[76%] -translate-x-1/2 object-contain object-bottom"
            onError={(event) => {
              const image = event.currentTarget;
              if (!image.dataset.fallback) {
                image.dataset.fallback = 'outfit';
                image.src = asset(active.outfitPreview);
              } else if (image.dataset.fallback === 'outfit') {
                image.dataset.fallback = 'hanger';
                image.src = asset(active.previewFallback);
              } else {
                image.style.visibility = 'hidden';
              }
            }}
          />

          {/* Light pool on the runway floor. */}
          <span className="cinema-pool" aria-hidden="true" />

          {/* Warm leak flash on every cut. */}
          <span key={`leak-${active.slug}`} className="cinema-leak" aria-hidden="true" />
        </>
      )}

      {/* Film grain + vignette. */}
      <span className="cinema-grain" aria-hidden="true" />
      <span className="cinema-vignette" aria-hidden="true" />

      {/* HUD: brand slate, scene counter and timecode. */}
      <div className="absolute inset-x-5 top-4 flex items-center justify-between text-[10px] font-semibold tracking-[0.3em] text-[#d8c39a]/85 sm:inset-x-8">
        <span dir="ltr">MODARA FILM</span>
        <span dir="ltr" className="tabular-nums">
          SCENE {String(scene + 1).padStart(2, '0')}/{String(scenes.length).padStart(2, '0')} · {tc(nowSeconds)} / {tc(totalSeconds)}
        </span>
      </div>

      {/* Title card over the fade. */}
      <div className="relative z-10 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-6 pt-28 text-center sm:px-8">
        {active ? (
          <div key={active.id} className="mx-auto max-w-[720px]">
            <p className="mb-2 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.28em] text-[#d8c39a]">
              <span
                className="h-1.5 w-1.5 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: active.hex }}
                aria-hidden="true"
              />
              {active.categoryName}
              <span className="inline-flex items-center gap-1 text-[#e6c98d]">
                <Star className="h-3 w-3 fill-[#e6b95e] text-[#e6b95e]" aria-hidden="true" />
                {new Intl.NumberFormat('fa-IR').format(Number(active.product.rating.toFixed(1)))}
              </span>
            </p>
            <span className="title-line mx-auto block max-w-[36rem]">
              <h1 className="text-balance text-2xl font-black leading-[1.3] text-[#f5ead2] sm:text-4xl">
                {active.product.name}
              </h1>
            </span>
            {active.product.description && (
              <p className="mx-auto mt-2 line-clamp-1 max-w-[34rem] text-xs leading-6 text-[#c9b795]/90 sm:text-[13px]">
                {active.product.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <span className="whitespace-nowrap text-lg font-extrabold text-[#f0dcb0] sm:text-xl">
                {formatPrice(active.product.price)}
              </span>
              <button
                type="button"
                onClick={() => onNavigate('product', active.slug)}
                className="rounded-full border border-[#d8c39a]/60 px-5 py-2 text-xs font-semibold text-[#f0dcb0] transition-colors hover:bg-[#d8c39a]/15"
              >
                مشاهدهٔ محصول
              </button>
              <span className="flex items-center gap-1.5" dir="ltr">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="صحنهٔ قبلی"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[#e8d7ae] transition-colors hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((value) => !value)}
                  aria-pressed={playing}
                  aria-label={playing ? 'توقف شو' : 'ادامهٔ شو'}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[#e8d7ae] transition-colors hover:bg-white/10"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="صحنهٔ بعدی"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[#e8d7ae] transition-colors hover:bg-white/10"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </div>
          </div>
        ) : (
          <p className="py-16 text-sm text-[#c9b795]/70">در حال نورپردازی صحنه…</p>
        )}
      </div>

      {/* Upcoming scenes, like a film strip. */}
      <div className="absolute bottom-5 left-5 z-10 hidden gap-2 sm:flex" dir="ltr">
        {scenes.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`پرش به صحنهٔ ${index + 1}: ${item.categoryName}`}
            aria-current={index === scene}
            className={`h-14 w-10 overflow-hidden rounded-md border transition-all duration-300 ${
              index === scene
                ? 'border-[#e6c98d] opacity-100 shadow-[0_0_18px_rgba(230,201,141,0.35)]'
                : 'border-white/15 opacity-45 hover:opacity-80'
            }`}
          >
            <img src={asset(item.image)} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-full w-full object-contain" />
          </button>
        ))}
      </div>

      {/* Scene progress hairline along the very bottom. */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-white/10" aria-hidden="true">
        {active && (
          <motion.span
            key={`${active.id}-${playing}`}
            className="block h-full bg-gradient-to-l from-[#e6c98d] to-[#b98a3e]"
            initial={{ width: playing ? '0%' : `${(elapsed / SCENE_SECONDS) * 100}%` }}
            animate={{ width: playing ? '100%' : `${(elapsed / SCENE_SECONDS) * 100}%` }}
            transition={playing && !reduceMotion ? { duration: SCENE_SECONDS, ease: 'linear' } : { duration: 0 }}
          />
        )}
      </div>
    </section>
  );
}
