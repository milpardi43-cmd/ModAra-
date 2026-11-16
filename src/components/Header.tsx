import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

type HeaderProps = {
  onNavigate: (route: string, slug?: string) => void;
};

const faNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);

export default function Header({ onNavigate }: HeaderProps) {
  const [onDark, setOnDark] = useState(false);
  const { totalItems } = useCart();

  // The rack hero sits underneath this transparent bar, so the logo swaps to its
  // warm-paper tone whenever a light slide is showing and back to white over the
  // dark hero. Nothing is hidden — only the ink follows the background.
  useEffect(() => {
    const onTheme = (event: Event) => {
      setOnDark((event as CustomEvent<{ dark: boolean }>).detail.dark);
    };
    window.addEventListener('modara:hero-theme', onTheme);
    return () => window.removeEventListener('modara:hero-theme', onTheme);
  }, []);

  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-16 sm:h-[4.5rem]"
      style={{ containerType: 'inline-size' }}
    >
      <div className="relative h-full">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-label="برگشت به صفحهٔ اصلی مُدارا"
          className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[1.25rem] px-2 py-1 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c69f]/60"
        >
          <img
            src={onDark ? '/logo-on-dark.png' : '/logo.png'}
            alt=""
            width={1700}
            height={460}
            className={
              // Shrink to fit the bar on narrow screens (the container is the header
              // width) instead of being clipped at the screen edges.
              'h-auto w-[min(clamp(8rem,34cqw,20rem),88%)] max-w-[32rem] object-contain transition-opacity duration-300 ' +
              (onDark ? 'opacity-95' : 'opacity-90')
            }
          />
        </button>

        {/* The hero used to leave no way into the store: you could read a look, but
            not buy it — Header.tsx is `fixed`, so it owns this corner on every page,
            and the rack sits 9.4px below it on mobile. The bag therefore lives here.
            It is pinned to the same physical edge CartDrawer.tsx hinges from (left-0),
            so the control and the panel it opens share an edge, and it stays clear of
            the product facts, which sit on the right at lg. Opening goes through the
            same `modara:open-cart` event ProductCard.tsx already emits: App.tsx stays
            the only owner of the drawer's state. */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('modara:open-cart'))}
          aria-label={totalItems > 0 ? `سبد خرید، ${faNumber(totalItems)} کالا` : 'سبد خرید'}
          className={`pointer-events-auto absolute left-1 top-1/2 flex h-10 -translate-y-1/2 items-center gap-1.5 rounded-full border px-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 ${
            onDark
              ? 'border-white/25 bg-white/10 text-[#f7f1e4] focus-visible:ring-white/50'
              : 'border-[#cdbb99] bg-[#fdfaf4]/80 text-[#3f3527] backdrop-blur-[2px] focus-visible:ring-[#a98b4f]/50'
          }`}
        >
          <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
          <span
            aria-hidden="true"
            className={`min-w-[1.125rem] rounded-full px-1 text-center text-[11px] font-bold tabular-nums leading-[1.125rem] ${
              onDark ? 'bg-[#f7f1e4] text-[#241d14]' : 'bg-[#241d14] text-[#f7f1e4]'
            } ${totalItems > 0 ? '' : 'opacity-55'}`}
          >
            {faNumber(totalItems)}
          </span>
        </button>
      </div>
    </header>
  );
}
