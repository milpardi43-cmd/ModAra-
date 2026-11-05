import { useEffect, useMemo, useState } from 'react';
import { Heart, RefreshCw, ShoppingBag } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { getAllProducts } from '../lib/catalog';
import type { Product } from '../lib/supabase';
import ProductCard from '../components/ProductCard';

type FavoritesProps = {
  onNavigate: (view: string, param?: string) => void;
};

export default function Favorites({ onNavigate }: FavoritesProps) {
  const { favoriteIds } = useFavorites();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(favoriteIds.length > 0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!favoriteIds.length) {
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    getAllProducts()
      .then((products) => {
        if (!cancelled) setCatalog(products);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [favoriteIds, reloadVersion]);

  const products = useMemo(() => {
    const byId = new Map(catalog.map((product) => [product.id, product]));
    return favoriteIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
  }, [catalog, favoriteIds]);

  return (
    <section className="min-h-[70svh] bg-[#faf8f5] px-4 pb-12 pt-24 sm:px-6 sm:pt-28 lg:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.22em] text-gold-700">انتخاب‌های شخصی</p>
            <h1 className="text-2xl font-extrabold text-dark-900 sm:text-3xl">علاقه‌مندی‌های من</h1>
            <p className="mt-2 text-sm text-dark-500">این فهرست روی همین دستگاه ذخیره می‌شود.</p>
          </div>
          <Heart className="mb-1 h-7 w-7 shrink-0 text-gold-600" aria-hidden="true" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-2xl border border-dark-100 bg-white p-4">
                <div className="mb-4 aspect-square animate-pulse rounded-xl bg-dark-100" />
                <div className="hidden" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-dark-100" />
              </div>
            ))}
          </div>
        ) : loadFailed ? (
          <div className="rounded-3xl border border-dark-100 bg-white p-8 text-center">
            <p className="font-semibold text-dark-800">بارگیری کالاها ممکن نشد.</p>
            <p className="mt-2 text-sm text-dark-500">اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.</p>
            <button type="button" onClick={() => setReloadVersion((value) => value + 1)} className="btn-ghost mt-5">
              <RefreshCw className="h-4 w-4" /> تلاش دوباره
            </button>
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onView={(slug) => onNavigate('product', slug)} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dark-100 bg-white px-6 py-14 text-center shadow-sm">
            <Heart className="mx-auto h-12 w-12 text-dark-200" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold text-dark-800">هنوز انتخابی ذخیره نکرده‌اید</h2>
            <p className="mt-2 text-sm leading-6 text-dark-500">با لمس قلب روی کالاها، آن‌ها را برای بعد نگه دارید.</p>
            <button type="button" onClick={() => onNavigate('shop')} className="btn-primary mt-6">
              <ShoppingBag className="h-4 w-4" /> دیدن فروشگاه
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
