import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { supabase, type Product, type Category } from '../lib/supabase';
import { PRODUCT_CARD_COLUMNS, getCategories } from '../lib/catalog';
import ProductCard from '../components/ProductCard';
import BrandSignature from '../components/BrandSignature';
import Breadcrumbs from '../components/Breadcrumbs';
import { formatPrice } from '../lib/format';

type ShopProps = {
  onNavigate: (view: string, param?: string) => void;
  initialCategory?: string;
};

type PriceInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
};

export default function Shop({ onNavigate, initialCategory }: ShopProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory ?? null);
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'price-asc' | 'price-desc' | 'newest'>('relevance');
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setActiveCategory(initialCategory ?? null);
  }, [initialCategory]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: productData }, categoryData] = await Promise.all([
        supabase.from('products').select(PRODUCT_CARD_COLUMNS),
        getCategories(true),
      ]);
      if (cancelled) return;
      setProducts((productData as Product[]) ?? []);
      setCategories(categoryData);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!showFilters || !window.matchMedia('(max-width: 767px)').matches) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowFilters(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showFilters]);

  const maxCatalogPrice = useMemo(() => Math.max(...products.map((product) => product.price), 0), [products]);
  const activeCategoryId = categories.find((category) => category.slug === activeCategory)?.id;

  const visibleProducts = useMemo(() => {
    const needle = search.toLocaleLowerCase('fa-IR');
    const filtered = products.filter((product) => {
      const searchableText = `${product.name} ${product.description || ''}`.toLocaleLowerCase('fa-IR');
      const matchesSearch = !needle || searchableText.includes(needle);
      const matchesCategory = !activeCategory || product.category_id === activeCategoryId || product.category_id === `cat-${activeCategory}`;
      const matchesMinPrice = priceMin === null || product.price >= priceMin;
      const matchesMaxPrice = priceMax === null || product.price <= priceMax;
      const matchesRating = product.rating >= minRating;
      const matchesStock = !inStockOnly || product.stock > 0;
      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesRating && matchesStock;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'relevance' && needle) {
        const score = (product: Product) => {
          const name = product.name.toLocaleLowerCase('fa-IR');
          const description = (product.description || '').toLocaleLowerCase('fa-IR');
          return (name === needle ? 10 : 0) + (name.startsWith(needle) ? 5 : 0) + (name.includes(needle) ? 3 : 0) + (description.includes(needle) ? 1 : 0);
        };
        return score(b) - score(a) || b.rating - a.rating;
      }
      return b.rating - a.rating;
    });
  }, [activeCategory, activeCategoryId, inStockOnly, minRating, priceMax, priceMin, products, search, sortBy]);

  const activeFilterCount = [activeCategory, priceMin !== null, priceMax !== null, minRating > 0, inStockOnly].filter(Boolean).length;

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setActiveCategory(null);
    setPriceMin(null);
    setPriceMax(null);
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('relevance');
  };

  return (
    <div className="min-h-screen bg-dark-50 pt-20" dir="rtl">
      <section className="group relative isolate overflow-hidden bg-[#211a15]" aria-label="معرفی فروشگاه مُدارا">
        <img
          src="/images/hero-atelier/look-noir.jpg"
          alt="استایل مشکی از مجموعهٔ مُدارا"
          width={1360}
          height={768}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[38%_center] transition-transform duration-[1400ms] ease-out group-hover:scale-[1.025]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-l from-[#17120e]/95 via-[#17120e]/65 to-[#17120e]/5" />
        <div aria-hidden="true" className="promo-poster-shine pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/4 bg-gradient-to-r from-transparent via-amber-100/20 to-transparent" />
        <div className="relative z-10 mx-auto flex min-h-[320px] max-w-7xl items-center px-4 py-12 sm:min-h-[360px] sm:px-6 sm:py-16 lg:min-h-[400px] lg:px-8">
          <div className="max-w-2xl text-right text-white">
            <BrandSignature
              inline
              label="DISCOVER MODARA"
              text="انتخابی هماهنگ،"
              highlight="با سلیقهٔ شما"
              className="mb-5"
            />
            <h1 className="text-balance text-4xl font-black leading-[1.2] sm:text-5xl lg:text-6xl">
              فروشگاه مُدارا
              <span className="mt-2 block text-[#e8c987]">استایل دلخواهتان را کشف کنید</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base sm:leading-8">
              از پوشاک و کیف تا ساعت و اکسسوری؛ مجموعه‌ها را مرور کنید، گزینه‌ها را با فیلترهای هوشمند پیدا کنید و انتخابی هماهنگ با سلیقهٔ خودتان داشته باشید.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['پوشاک', 'کیف و چرم', 'ساعت', 'اکسسوری'].map((item) => (
                <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                  {item}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('shop-filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="group/button mt-6 inline-flex items-center gap-3 rounded-full bg-[#f0d59b] px-6 py-3 text-sm font-bold text-[#2b2116] shadow-[0_12px_32px_-16px_rgba(240,213,155,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#211a15]"
            >
              جستجو در محصولات
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover/button:-translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-white/15 sm:inset-5 sm:rounded-[1.75rem]" />
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Breadcrumbs items={[{ label: activeCategory ? categories.find((category) => category.slug === activeCategory)?.name || 'فروشگاه' : 'فروشگاه' }]} onNavigate={onNavigate} />
        <div id="shop-filters" className="mb-6 flex scroll-mt-24 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="جستجوی نام محصول، جنس یا ویژگی..."
              aria-label="جستجوی محصولات"
              autoComplete="off"
              className="input-field pr-11"
            />
            {searchInput && <button aria-label="پاک کردن جستجو" onClick={() => setSearchInput('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"><X className="h-5 w-5" /></button>}
          </div>
          <div className="flex gap-2">
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="input-field min-w-0 flex-1 cursor-pointer sm:w-auto sm:min-w-36">
              <option value="relevance">مرتبط‌ترین</option>
              <option value="rating">محبوب‌ترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
              <option value="newest">جدیدترین</option>
            </select>
            <button onClick={() => setShowFilters((visible) => !visible)} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dark-200 bg-white text-dark-700 md:hidden" aria-label="نمایش فیلترها">
              <SlidersHorizontal className="h-5 w-5" />
              {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4 sm:gap-6">
          <aside
            onClick={() => setShowFilters(false)}
            className={`${showFilters ? 'fixed inset-0 z-[70] flex items-end bg-dark-950/45 md:static md:block md:bg-transparent' : 'hidden md:block'} w-full shrink-0 md:w-64`}
          >
            <div onClick={(event) => event.stopPropagation()} role={showFilters ? 'dialog' : undefined} aria-modal={showFilters ? true : undefined} aria-labelledby={showFilters ? 'shop-filter-title' : undefined} className="max-h-[86dvh] w-full space-y-4 overflow-y-auto rounded-t-[1.75rem] bg-[#faf8f5] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-24px_70px_rgba(20,15,8,0.2)] md:sticky md:top-24 md:max-h-none md:overflow-visible md:rounded-none md:bg-transparent md:p-0 md:pb-0 md:shadow-none">
              <div className="flex items-center justify-between px-1 md:hidden">
                <h2 id="shop-filter-title" className="font-bold text-dark-900">فیلترها</h2>
                <button type="button" onClick={() => setShowFilters(false)} aria-label="بستن فیلترها" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-dark-600 shadow-sm"><X className="h-5 w-5" /></button>
              </div>
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold text-dark-900">فیلترهای پیشرفته</h2>
                  <button onClick={clearFilters} className="text-xs font-medium text-amber-700 hover:text-amber-800">حذف همه</button>
                </div>
                <div className="space-y-1">
                  <FilterCategoryButton active={!activeCategory} onClick={() => { setActiveCategory(null); setShowFilters(false); }}>همه محصولات</FilterCategoryButton>
                  {categories.map((category) => <FilterCategoryButton key={category.id} active={activeCategory === category.slug} onClick={() => { setActiveCategory(category.slug); setShowFilters(false); }}>{category.name}</FilterCategoryButton>)}
                </div>
              </div>

              <div className="card space-y-4 p-4">
                <h3 className="font-bold text-dark-900">محدوده قیمت</h3>
                <div className="grid grid-cols-2 gap-2">
                  <PriceInput value={priceMin} onChange={setPriceMin} placeholder="از" />
                  <PriceInput value={priceMax} onChange={setPriceMax} placeholder="تا" />
                </div>
                <p className="text-[11px] leading-5 text-dark-400">قیمت‌ها به تومان هستند{maxCatalogPrice > 0 ? ` · حداکثر ${formatPrice(maxCatalogPrice)}` : ''}</p>
              </div>

              <div className="card space-y-3 p-4">
                <h3 className="font-bold text-dark-900">حداقل امتیاز</h3>
                {[0, 4, 4.5].map((rating) => <button key={rating} onClick={() => setMinRating(rating)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${minRating === rating ? 'bg-amber-50 text-amber-700' : 'text-dark-600 hover:bg-dark-50'}`}><Star className={`h-4 w-4 ${rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-dark-300'}`} />{rating === 0 ? 'همه امتیازها' : `${rating}+`}</button>)}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-dark-600 hover:bg-dark-50">
                  <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="h-4 w-4 accent-amber-600" />
                  فقط کالاهای موجود
                </label>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-dark-500">{loading ? 'در حال بارگذاری...' : `${new Intl.NumberFormat('fa-IR').format(visibleProducts.length)} محصول یافت شد`}</p>
              {search && <p className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">نتایج برای «{search}»</p>}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="flex min-h-[76px] items-center gap-2 rounded-xl border border-dark-100 bg-white p-1.5 md:block md:rounded-2xl md:p-4"><div className="h-16 w-14 shrink-0 rounded-lg shimmer-bg md:mb-4 md:h-auto md:w-full md:aspect-square md:rounded-xl" /><div className="min-w-0 flex-1 space-y-2 md:block"><div className="h-3 w-4/5 rounded shimmer-bg md:mb-2 md:h-4 md:w-3/4" /><div className="h-3 w-1/2 rounded shimmer-bg md:h-4" /></div></div>)}</div>
            ) : visibleProducts.length === 0 ? (
              <div className="card flex flex-col items-center justify-center p-10 text-center sm:p-16"><Search className="mb-4 h-16 w-16 text-dark-300" /><p className="mb-2 text-lg font-medium text-dark-700">محصولی با این مشخصات یافت نشد</p><p className="mb-5 text-sm text-dark-400">عبارت جستجو یا فیلترها را تغییر دهید</p><button onClick={clearFilters} className="btn-primary">پاک کردن فیلترها</button></div>
            ) : (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onView={(slug) => onNavigate('product', slug)} />)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterCategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm font-medium transition-all ${active ? 'bg-amber-50 text-amber-700' : 'text-dark-600 hover:bg-dark-50'}`}>{children}{active && <Check className="h-4 w-4" />}</button>;
}

function PriceInput({ value, onChange, placeholder }: PriceInputProps) {
  return <input type="number" min="0" step="100000" value={value ?? ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} placeholder={placeholder} aria-label={`حداقل یا حداکثر قیمت ${placeholder}`} className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />;
}
