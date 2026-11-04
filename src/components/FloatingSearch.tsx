import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice, optimizedAsset } from '../lib/format';
import { PRODUCT_PREVIEW_COLUMNS, type ProductPreview } from '../lib/catalog';

type FloatingSearchProps = {
  onNavigate: (view: string, param?: string) => void;
};

const quickSearches = ['لباس', 'ساعت', 'کیف', 'اکسسوری'];

export default function FloatingSearch({ onNavigate }: FloatingSearchProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductPreview[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* The dock appears once the reader is past the categories and disappears again
     near the end of the page, where the footer links need the room. It is also
     hidden while the on-screen keyboard is open. */
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const heading = Array.from(document.querySelectorAll('h2')).find((item) =>
      item.textContent?.includes('دسته‌بندی محصولات'),
    );
    if (!heading) return;
    setVisible(heading.getBoundingClientRect().bottom < 0);
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.boundingClientRect.bottom < 0),
      { threshold: 0 },
    );
    observer.observe(heading);

    /* A deferred footer may mount a moment later, so look it up lazily. */
    let footerObserver: IntersectionObserver | undefined;
    const watchFooter = () => {
      const footer = document.querySelector('footer');
      if (!footer || footerObserver) return;
      footerObserver = new IntersectionObserver(
        ([entry]) => setFooterVisible(entry.isIntersecting),
        { rootMargin: '120px 0px' },
      );
      footerObserver.observe(footer);
    };
    watchFooter();
    const retry = window.setTimeout(watchFooter, 1500);

    return () => {
      observer.disconnect();
      footerObserver?.disconnect();
      window.clearTimeout(retry);
    };
  }, []);

  /* Keep the keyboard from being covered by the dock. */
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setKeyboardOpen(viewport.height < window.innerHeight - 120);
    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);

  /**
   * On phones this dock floats over the product grid. Hiding it while the page is
   * scrolling (and while the keyboard is open) keeps product rows readable; it
   * slides back as soon as the reader pauses.
   */
  const [docked, setDocked] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = Math.abs(y - lastY);
      lastY = y;
      if (delta < 6) return;
      setDocked(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setDocked(true), 380);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  /* The sheet is worth showing while typing, while debouncing, or when there is
     something to choose from. */
  const isOpen = showResults && (Boolean(query.trim()) || loading);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select(PRODUCT_PREVIEW_COLUMNS)
        .ilike('name', `%${query.trim()}%`)
        .limit(5);
      setResults((data || []) as unknown as ProductPreview[]);
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleResultClick = (slug: string) => {
    onNavigate('product', slug);
    setQuery('');
    setShowResults(false);
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    setShowResults(true);
  };

  /* A tap anywhere outside the dock closes the sheet, like a native search field.
     This also covers the case where the sheet is painted over the dock. */
  const dockRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showResults) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      /* The sheet is a sibling of the dock, so both must be treated as "inside";
         closing on a result tap would swallow the click before it lands. */
      if (dockRef.current?.contains(target) || sheetRef.current?.contains(target)) return;
      setShowResults(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [showResults]);

  return (
    <>
      {/* The results sheet must hang *above* the dock. It used to live inside the
          dock's own element, which is a `translate-y` stacking context, so on
          phones it was painted underneath the black CTA / product rows. Render it
          as a sibling instead and keep it fixed to the same bottom offset.
          `isOpen` forces it visible from the moment a result exists, even while
          the reader is still scrolling. */}
      {isOpen && (
        <div
          ref={sheetRef}
          className={`search-results-sheet fixed inset-x-4 bottom-[calc(5.05rem+env(safe-area-inset-bottom))] z-[55] max-h-[min(24rem,calc(100svh-9rem))] overflow-y-auto rounded-[1.45rem] border border-dark-200/70 bg-white p-2 shadow-[0_18px_55px_rgba(28,25,20,0.18)] backdrop-blur-xl animate-scale-in sm:inset-x-6 sm:bottom-20 sm:z-40 sm:mb-0 ${isOpen ? 'is-open' : ''}`}
          role="listbox"
          aria-label="نتایج جستجو"
        >
          {query.trim() ? (
            <>
              <div className="flex items-center justify-between px-3 pb-2 pt-1">
                <div className="flex items-center gap-2 text-sm font-bold text-dark-900">
                  <Search className="h-4 w-4 text-amber-600" />
                  نتایج جستجو
                </div>
                <span className="text-[11px] text-dark-400">
                  {loading ? 'در حال بررسی...' : `${results.length} نتیجه`}
                </span>
              </div>
              {loading && results.length === 0 && (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl p-2">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-dark-100" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-dark-100" />
                        <div className="h-2.5 w-1/3 rounded bg-amber-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && results.length === 0 && (
                <div className="px-4 py-7 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-dark-800">نتیجه‌ای یافت نشد</p>
                  <p className="mt-1 text-xs leading-5 text-dark-400">نام، جنس یا ویژگی دیگری را امتحان کنید.</p>
                </div>
              )}
              <div className="space-y-1">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleResultClick(p.slug)}
                    className="group flex w-full items-center gap-3 rounded-xl p-2 text-right transition-colors hover:bg-amber-50 focus:bg-amber-50 focus:outline-none"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-dark-50 ring-1 ring-dark-100">
                      {p.image_url && (
                        <img
                          src={optimizedAsset(p.image_url, 480)}
                          alt={p.name}
                          width={480}
                          height={640}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-dark-900">{p.name}</p>
                      <p className="mt-1 text-xs font-bold text-amber-700">{formatPrice(p.price)}</p>
                    </div>
                    <ArrowLeft className="h-4 w-4 shrink-0 text-dark-300 transition-transform group-hover:-translate-x-1 group-hover:text-amber-600" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 pb-3 pt-1">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-dark-900">جستجوی سریع</p>
                  <p className="text-[11px] text-dark-400">از دسته‌های محبوب شروع کنید</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleQuickSearch(term)}
                    className="rounded-full border border-dark-200 bg-dark-50 px-3 py-2 text-xs font-semibold text-dark-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus:border-amber-400 focus:outline-none"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    <div
      ref={dockRef}
      className={`mobile-search-dock fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-opacity duration-300 sm:bottom-6 sm:w-[92%] ${
        visible && !footerVisible && !keyboardOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      } ${docked ? '' : 'is-idle'}`}
    >
      <div className="relative">
        <div className="flex items-center gap-2 rounded-[1.35rem] border border-white/70 bg-white/95 p-1.5 shadow-[0_12px_35px_rgba(28,25,20,0.16)] backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[1.05rem] bg-dark-50/80 px-3 py-2.5">
            <Search className="h-5 w-5 shrink-0 text-amber-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) handleResultClick(results[0].slug);
              }}
              placeholder="جستجوی لباس، ساعت یا اکسسوری..."
              aria-label="جستجوی محصولات"
              aria-expanded={showResults}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm text-dark-900 outline-none placeholder:text-dark-400"
            />
            {query && (
              <button
                type="button"
                aria-label="پاک کردن جستجو"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dark-400 transition-colors hover:bg-white hover:text-dark-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <span className="hidden shrink-0 px-2 text-[10px] font-bold text-dark-400 sm:inline">جستجو</span>
        </div>
      </div>
    </div>
    </>
  );
}
