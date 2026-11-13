import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import { ArrowLeft, ChevronDown, Star } from 'lucide-react';
import { getAllProducts, getCategories } from '../lib/catalog';
import { buildRackItems, type RackItem } from '../lib/rackItems';
import { asset, formatPrice } from '../lib/format';

type ScrollHeroProps = {
  onNavigate: (view: string, param?: string) => void;
};

/** One chapter per department: the scroll itself stages the try-on. */
const STEP_CATEGORIES = ['clothing', 'bag', 'glasses', 'watch', 'accessory'];

const faNum = (value: number) => new Intl.NumberFormat('fa-IR').format(value);

export default function ScrollHero({ onNavigate }: ScrollHeroProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<RackItem[]>([]);
  const [step, setStep] = useState(0);
  const [hintSeen, setHintSeen] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modara:hero-theme', { detail: 'light' }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllProducts(), getCategories()])
      .then(([products, categories]) => {
        if (!cancelled) setItems(buildRackItems(products, categories));
      })
      .catch(() => {
        /* the cinema simply stays empty instead of breaking the page */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = useMemo(() => {
    const picked = STEP_CATEGORIES.map((slug) => items.find((item) => item.categorySlug === slug)).filter(
      (item): item is RackItem => Boolean(item),
    );
    return picked.length >= 3 ? picked : items.slice(0, 5);
  }, [items]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (!steps.length) return;
    setStep(Math.min(steps.length - 1, Math.max(0, Math.floor(value * steps.length))));
    if (value > 0.02) setHintSeen(true);
  });

  const active = steps[step] ?? null;

  const goToStep = (index: number) => {
    const section = sectionRef.current;
    if (!section || !steps.length) return;
    const top = section.offsetTop + ((index + 0.5) / steps.length) * section.offsetHeight;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      aria-label="سینمای اسکرول مُدارا"
      className="relative bg-[#f3efe8]"
      style={{ height: `${Math.max(steps.length, 1) * 100}vh` }}
    >
      <div className="sticky top-0 flex h-svh items-center overflow-hidden pt-16">
        {/* Oversized chapter numeral, editorial style. */}
        <span
          className="pointer-events-none absolute -left-4 top-1/2 -translate-y-1/2 select-none text-[26vw] font-black leading-none text-[#241d14]/[0.05]"
          aria-hidden="true"
        >
          {faNum(step + 1)}
        </span>

        <div className="mx-auto grid w-full max-w-[1024px] grid-cols-1 items-center gap-x-10 gap-y-6 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          {active ? (
            <>
              <div className="w-full min-w-0 text-right lg:col-start-1 lg:row-start-1">
                <p className="mb-2.5 text-[11px] font-bold tracking-[0.22em] text-[#9a835f]">
                  مُدارا <span className="text-[#c8b795]" aria-hidden="true">·</span> MODARA — فصل{' '}
                  {faNum(step + 1)} / {faNum(steps.length)}
                </p>
                <h1
                  key={active.id}
                  className="look-title text-balance text-[clamp(1.35rem,2.6vw,2.1rem)] font-extrabold leading-[1.3] text-[#241d14]"
                >
                  {active.product.name}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ded3ba] bg-[#fdfaf4]/70 px-3 py-1 text-[11px] font-bold text-[#7d6636]">
                    <span
                      className="h-1.5 w-1.5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: active.hex }}
                      aria-hidden="true"
                    />
                    {active.categoryName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-[#6b6152]">
                    <Star className="h-3.5 w-3.5 fill-[#e6b95e] text-[#c49639]" aria-hidden="true" />
                    {faNum(Number(active.product.rating.toFixed(1)))}
                  </span>
                </div>
                {active.product.description && (
                  <p className="mt-2.5 line-clamp-3 max-w-[30rem] text-[13px] leading-[1.8] text-[#6b6152]">
                    {active.product.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-start gap-x-4 gap-y-2">
                  <span className="whitespace-nowrap text-base font-extrabold text-[#3f3527] sm:text-lg">
                    {formatPrice(active.product.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('product', active.slug)}
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

              <div className="rack-outfit-stage lg:col-start-2 lg:row-start-1">
                <span className="rack-spotlight" aria-hidden="true" />
                <div
                  role="img"
                  aria-label={`${active.product.name}، نمای کامل ست`}
                  className="absolute inset-0 z-10"
                >
                  <img
                    key={active.slug}
                    src={asset(active.modelPreview)}
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
                        image.src = asset(active.outfitPreview);
                      } else if (image.dataset.fallback === 'outfit') {
                        image.dataset.fallback = 'hanger';
                        image.src = asset(active.previewFallback);
                      } else {
                        image.style.visibility = 'hidden';
                      }
                    }}
                    className="rack-outfit-composite pointer-events-none select-none"
                  />
                </div>
                <div className="rack-reflection" aria-hidden="true">
                  <img
                    src={asset(active.modelPreview)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="col-span-full py-24 text-center text-sm text-[#8b8275]">در حال بارگذاریٔ سینما…</p>
          )}
        </div>

        {/* Chapter rail: clickable dots, the active one stretches. */}
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 sm:right-8">
          {steps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToStep(index)}
              aria-label={`فصل ${faNum(index + 1)}: ${item.categoryName}`}
              aria-current={index === step}
              className={`rounded-full transition-all duration-500 ${
                index === step ? 'h-8 w-1.5 bg-[#9b7948]' : 'h-2 w-2 bg-[#c9bda6] hover:bg-[#9b7948]/60'
              }`}
            />
          ))}
        </div>

        {!hintSeen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <motion.span
              className="flex flex-col items-center gap-1 text-[11px] font-semibold text-[#9a835f]"
              animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              اسکرول کنید تا پرو شوید
              <ChevronDown className="h-4 w-4" aria-hidden="true"
              />
            </motion.span>
          </div>
        )}
      </div>
    </section>
  );
}
