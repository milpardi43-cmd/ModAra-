import { Check, Eye, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../lib/supabase';
import { imageSrcSet, optimizedAsset } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

type ProductCardProps = {
  product: Product;
  onView: (slug: string) => void;
};

export default function ProductCard({ product, onView }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [added, setAdded] = useState(false);

  const handleAdd = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!user) return;
    await addToCart(product.id);
    window.dispatchEvent(new CustomEvent('modara:open-cart'));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const imageUrl = optimizedAsset(product.image_url, 480);
  const imageSet = imageSrcSet(product.image_url, [480, 720]);
  const faNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);

  return (
    <article
      onClick={() => onView(product.slug)}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] bg-[#fffdf9] shadow-[0_2px_14px_rgba(33,26,18,0.05)] ring-1 ring-[#211a12]/[0.07] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_32px_64px_-24px_rgba(94,65,35,0.38)] hover:ring-gold-500/40"
    >
      {/* Golden line that draws itself across the top on hover */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-20 h-[3px] origin-right scale-x-0 bg-gradient-to-l from-gold-300 via-gold-500 to-gold-700 transition-transform duration-700 ease-out group-hover:scale-x-100"
      />

      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f3ede0]">
        <img
          src={imageUrl}
          srcSet={imageSet}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
          alt={product.name}
          width={480}
          height={640}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
        />

        {/* Soft cinematic shade on hover */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#120d08]/50 via-[#120d08]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        {/* Light sweep */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[190%] -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[430%]"
        />

        {/* Rating */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#120d08]/45 px-2.5 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md">
          <Star className="h-3.5 w-3.5 fill-gold-300 text-gold-300" />
          {faNumber(product.rating)}
        </div>

        {/* Low stock */}
        {product.stock < 20 && product.stock > 0 && (
          <div className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-[#3b0d0c]/70 px-2.5 py-1 text-[11px] font-bold text-red-100 shadow-lg backdrop-blur-md">
            تنها {faNumber(product.stock)} عدد
          </div>
        )}

        {/* Quick view pill */}
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 translate-y-3 items-center gap-2 whitespace-nowrap rounded-full border border-white/50 bg-white/90 px-4 py-2 text-xs font-extrabold text-[#211a12] opacity-0 shadow-xl transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Eye className="h-4 w-4 text-gold-700" />
          مشاهده سریع
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-gold-700">کالکشن مُدارا</span>
          <span
            dir="ltr"
            aria-hidden="true"
            className="font-display text-[8px] font-semibold tracking-[0.34em] text-[#211a12]/35"
          >
            MODARA
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[3.25rem] text-[15px] font-extrabold leading-[1.7] text-[#211a12] transition-colors duration-300 group-hover:text-gold-700 sm:text-base">
          {product.name}
        </h3>
        <p className="mt-1.5 line-clamp-1 text-[13px] leading-6 text-dark-400">
          {product.description}
        </p>

        <div className="mt-auto">
          {/* Ornament divider */}
          <div aria-hidden="true" className="mb-4 mt-5 flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-l from-gold-500/50 to-transparent" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold-500" />
            <span className="h-px w-5 bg-gold-500/30" />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="block text-[10px] font-semibold text-dark-400">قیمت</span>
              <p className="mt-1 flex items-baseline gap-1.5 leading-none">
                <span className="text-lg font-black tracking-tight text-[#211a12] sm:text-xl">
                  {faNumber(product.price)}
                </span>
                <span className="text-[11px] font-bold text-gold-700">تومان</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!user}
              aria-label={added ? 'به سبد خرید اضافه شد' : `افزودن ${product.name} به سبد خرید`}
              title={added ? 'به سبد خرید اضافه شد' : 'افزودن به سبد خرید'}
              className={`group/cart relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-90 sm:h-12 sm:w-12 ${
                added
                  ? 'bg-[#166534] text-white shadow-[0_14px_28px_-10px_rgba(22,101,52,0.65)]'
                  : 'bg-[#171208] text-gold-200 shadow-[0_14px_28px_-10px_rgba(23,18,8,0.55)] hover:bg-gold-500 hover:text-[#171208] hover:shadow-[0_16px_32px_-10px_rgba(192,145,63,0.75)]'
              } ${!user ? 'cursor-not-allowed opacity-40 hover:translate-y-0' : ''}`}
            >
              {added ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : (
                <ShoppingBag className="h-5 w-5 transition-transform duration-300 group-hover/cart:-rotate-6 group-hover/cart:scale-110" />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
