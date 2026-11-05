import { Check, Eye, Heart, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../lib/supabase';
import { imageSrcSet, optimizedAsset } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { successFeedback, tapFeedback } from '../native/feedback';

type ProductCardProps = {
  product: Product;
  onView: (slug: string) => void;
};

export default function ProductCard({ product, onView }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  const [added, setAdded] = useState(false);

  const handleAdd = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!user) return;
    await addToCart(product.id);
    void successFeedback();
    window.dispatchEvent(new CustomEvent('modara:open-cart'));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleFavorite = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    toggleFavorite(product.id);
    void tapFeedback();
  };

  const imageUrl = optimizedAsset(product.image_url, 128);
  const imageSet = imageSrcSet(product.image_url, [128, 256, 480, 720]);
  const faNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);

  return (
    <article
      onClick={() => onView(product.slug)}
      className="group relative flex h-full min-h-[76px] cursor-pointer flex-row overflow-hidden rounded-xl bg-[#fffdf9] shadow-[0_2px_14px_rgba(33,26,18,0.05)] ring-1 ring-[#211a12]/[0.07] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_22px_42px_-28px_rgba(94,65,35,0.3)] hover:ring-gold-500/35 md:min-h-0 md:flex-col md:rounded-[1.75rem]"
    >
      {/* Golden line that draws itself across the top on hover */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-20 h-[3px] origin-right scale-x-0 bg-gradient-to-l from-gold-300 via-gold-500 to-gold-700 transition-transform duration-700 ease-out group-hover:scale-x-100"
      />

      {/* Image */}
      <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-[#f3ede0] md:h-auto md:w-full md:aspect-[3/4]">
        <img
          src={imageUrl}
          srcSet={imageSet}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 56px"
          alt={product.name}
          width={120}
          height={160}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.04]"
        />

        {/* Soft cinematic shade on hover */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 hidden h-1/2 bg-gradient-to-t from-[#120d08]/40 via-[#120d08]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-80 md:block"
        />

        {/* Light sweep */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 -translate-x-[190%] -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[430%] md:block"
        />

        <button
          type="button"
          onClick={handleFavorite}
          aria-label={favorite ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
          aria-pressed={favorite}
          className={`absolute left-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 shadow-md backdrop-blur-md transition-all active:scale-90 md:left-3 md:top-3 md:h-10 md:w-10 md:shadow-lg ${favorite ? 'bg-[#9b3b37] text-white' : 'bg-[#120d08]/50 text-white hover:bg-[#120d08]/80'}`}
        >
          <Heart className={`h-3.5 w-3.5 md:h-5 md:w-5 ${favorite ? 'fill-current' : ''}`} />
        </button>

        {/* Rating */}
        <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded-full border border-white/20 bg-[#120d08]/55 px-1 py-0.5 text-[8px] font-bold text-white shadow-md backdrop-blur-md md:right-3 md:top-3 md:gap-1.5 md:px-2.5 md:py-1 md:text-xs md:shadow-lg">
          <Star className="h-2.5 w-2.5 fill-gold-300 text-gold-300 md:h-3.5 md:w-3.5" />
          {faNumber(product.rating)}
        </div>

        {/* Low stock */}
        {product.stock < 20 && product.stock > 0 && (
          <div className="absolute left-3 top-14 z-10 hidden rounded-full border border-white/15 bg-[#3b0d0c]/70 px-2.5 py-1 text-[11px] font-bold text-red-100 shadow-lg backdrop-blur-md md:block">
            تنها {faNumber(product.stock)} عدد
          </div>
        )}

        {/* Quick view pill */}
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 translate-y-3 items-center gap-2 whitespace-nowrap rounded-full border border-white/50 bg-white/90 px-4 py-2 text-xs font-extrabold text-[#211a12] opacity-0 shadow-xl transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 md:flex"
        >
          <Eye className="h-4 w-4 text-gold-700" />
          مشاهده سریع
        </span>
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-center p-1.5 sm:p-3">
        <div className="mb-0 flex min-w-0 items-center justify-between gap-1">
          <span className="truncate text-[9px] font-bold text-gold-700 sm:text-[10px]">کالکشن مُدارا</span>
          <span
            dir="ltr"
            aria-hidden="true"
            className="hidden font-display text-[8px] font-semibold tracking-[0.34em] text-[#211a12]/35 sm:block"
          >
            MODARA
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[2rem] text-[13px] font-extrabold leading-4 text-[#211a12] transition-colors duration-300 group-hover:text-gold-700 sm:min-h-[2.7rem] sm:text-[15px] sm:leading-5">
          {product.name}
        </h3>
        <p className="mt-0.5 hidden line-clamp-1 text-xs leading-5 text-dark-400 sm:block">
          {product.description}
        </p>

        <div className="mt-auto">
          {/* Ornament divider */}
          <div aria-hidden="true" className="mb-2 mt-2 hidden items-center gap-2 sm:flex">
            <span className="h-px flex-1 bg-gradient-to-l from-gold-500/50 to-transparent" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold-500" />
            <span className="h-px w-5 bg-gold-500/30" />
          </div>

          <div className="flex items-end justify-between gap-1 sm:gap-3">
            <div>
              <span className="hidden text-[10px] font-semibold text-dark-400 sm:block">قیمت</span>
              <p className="mt-0 flex flex-col items-start gap-0.5 leading-none sm:mt-1 sm:flex-row sm:items-baseline sm:gap-1.5">
                <span className="text-xs font-black tracking-tight text-[#211a12] sm:text-xl">
                  {faNumber(product.price)}
                </span>
                <span className="text-[9px] font-bold text-gold-700 sm:text-[11px]">تومان</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!user}
              aria-label={added ? 'به سبد خرید اضافه شد' : `افزودن ${product.name} به سبد خرید`}
              title={added ? 'به سبد خرید اضافه شد' : 'افزودن به سبد خرید'}
              className={`group/cart relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-90 sm:h-12 sm:w-12 ${
                added
                  ? 'bg-[#166534] text-white shadow-[0_14px_28px_-10px_rgba(22,101,52,0.65)]'
                  : 'bg-[#171208] text-gold-200 shadow-[0_14px_28px_-10px_rgba(23,18,8,0.55)] hover:bg-gold-500 hover:text-[#171208] hover:shadow-[0_16px_32px_-10px_rgba(192,145,63,0.75)]'
              } ${!user ? 'cursor-not-allowed opacity-40 hover:translate-y-0' : ''}`}
            >
              {added ? (
                <Check className="h-3.5 w-3.5 sm:h-5 sm:w-5" strokeWidth={3} />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cart:-rotate-6 group-hover/cart:scale-110 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
