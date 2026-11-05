import { useEffect, useState } from 'react';
import { Heart, Home, LayoutGrid, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import ModaraLogo from './ModaraLogo';
import PwaInstallAction from './PwaInstallAction';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { tapFeedback } from '../native/feedback';

type HeaderProps = {
  onNavigate: (view: string, param?: string) => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
};

const HERO_THEME_EVENT = 'modara:hero-theme';

export default function Header({ onNavigate, onOpenCart, onOpenAuth }: HeaderProps) {
  const [heroTheme, setHeroTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    const onHeroTheme = (event: Event) => {
      const theme = (event as CustomEvent<string>).detail;
      setHeroTheme(theme === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener(HERO_THEME_EVENT, onHeroTheme);
    return () => window.removeEventListener(HERO_THEME_EVENT, onHeroTheme);
  }, []);

  const onDark = heroTheme === 'dark';
  const navigateAndClose = (view: string) => {
    void tapFeedback();
    onNavigate(view);
    setMenuOpen(false);
  };
  const openSearch = () => {
    void tapFeedback();
    setMenuOpen(false);
    if (!window.location.hash || window.location.hash === '#home') {
      window.dispatchEvent(new CustomEvent('modara:open-search'));
      return;
    }
    onNavigate('shop');
    window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="جستجوی محصولات"]')?.focus(), 500);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="relative mx-auto max-w-7xl px-0 sm:px-6 lg:px-8">
        {/* Keep the established desktop wordmark unchanged. */}
        <div className="relative hidden h-16 items-center justify-center md:flex sm:h-[4.5rem]">
          <button
            type="button"
            aria-label="بازگشت به صفحه اصلی مُدارا"
            onClick={() => onNavigate('home')}
            className="pointer-events-auto group absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full p-1 transition-transform duration-500 hover:scale-[1.03]"
          >
            <ModaraLogo tone={onDark ? 'dark' : 'light'} />
          </button>
        </div>

        {/* Native-feeling phone header. */}
        <div className="pointer-events-auto relative flex h-[3.75rem] items-center justify-between border-b border-[#211a12]/[0.06] bg-[#faf8f5]/95 px-3 shadow-[0_6px_24px_rgba(33,26,18,0.06)] backdrop-blur-xl md:hidden" dir="rtl">
          <button
            type="button"
            aria-label={menuOpen ? 'بستن منو' : 'بازکردن منو'}
            aria-expanded={menuOpen}
            onClick={() => { void tapFeedback(); setMenuOpen((open) => !open); }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dark-800 transition-colors hover:bg-dark-100 active:scale-95"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            aria-label="بازگشت به صفحه اصلی مُدارا"
            onClick={() => navigateAndClose('home')}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <ModaraLogo tone="light" size="header" />
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="جستجو در محصولات"
              onClick={openSearch}
              className="flex h-11 w-11 items-center justify-center rounded-full text-dark-700 transition-colors hover:bg-dark-100 active:scale-95"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="بازکردن سبد خرید"
              onClick={() => { void tapFeedback(); onOpenCart(); }}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-dark-700 transition-colors hover:bg-dark-100 active:scale-95"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && <span className="absolute right-0.5 top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#8a5a1d] px-1 text-[9px] font-bold leading-none text-white">{new Intl.NumberFormat('fa-IR').format(totalItems)}</span>}
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            <button type="button" aria-label="بستن منو" onClick={() => setMenuOpen(false)} className="pointer-events-auto fixed inset-0 top-[calc(3.75rem+env(safe-area-inset-top))] bg-[#211a12]/25 backdrop-blur-[2px] md:hidden" />
            <nav aria-label="منوی موبایل" className="pointer-events-auto absolute inset-x-3 top-[calc(3.75rem+env(safe-area-inset-top))] z-10 rounded-2xl border border-dark-100 bg-[#fffdf9] p-2 shadow-[0_24px_60px_rgba(33,26,18,0.2)] md:hidden" dir="rtl">
              <MobileMenuButton icon={Home} label="خانه" onClick={() => navigateAndClose('home')} />
              <MobileMenuButton icon={LayoutGrid} label="فروشگاه و دسته‌بندی‌ها" onClick={() => navigateAndClose('shop')} />
              <MobileMenuButton icon={Heart} label="علاقه‌مندی‌ها" onClick={() => navigateAndClose('favorites')} />
              <MobileMenuButton icon={UserRound} label={user ? 'حساب کاربری' : 'ورود یا ثبت‌نام'} onClick={() => { setMenuOpen(false); if (user) onNavigate('account'); else onOpenAuth(); }} />
              <div className="my-1 border-t border-dark-100 pt-1">
                <PwaInstallAction />
              </div>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}

function MobileMenuButton({ icon: Icon, label, onClick }: { icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-right text-sm font-semibold text-dark-800 transition-colors hover:bg-amber-50 active:bg-amber-100">
      <Icon className="h-5 w-5 text-gold-700" aria-hidden="true" />
      {label}
    </button>
  );
}
