import { Heart, Home, LayoutGrid, ShoppingBag, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { tapFeedback } from '../native/feedback';

type BottomNavigationProps = {
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
};

const items = [
  { key: 'home', label: 'خانه', Icon: Home },
  { key: 'shop', label: 'دسته‌بندی', Icon: LayoutGrid },
  { key: 'favorites', label: 'علاقه‌مندی', Icon: Heart },
  { key: 'cart', label: 'سبد خرید', Icon: ShoppingBag },
  { key: 'account', label: 'حساب', Icon: UserRound },
] as const;

export default function BottomNavigation({ activeView, onNavigate, onOpenCart, onOpenAuth }: BottomNavigationProps) {
  const { totalItems } = useCart();
  const { user } = useAuth();

  const activate = (key: (typeof items)[number]['key']) => {
    void tapFeedback();
    if (key === 'cart') {
      onOpenCart();
    } else if (key === 'account') {
      onNavigate('account');
      if (!user) onOpenAuth();
    } else {
      onNavigate(key);
    }
  };

  return (
    <nav
      aria-label="ناوبری اصلی موبایل"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#211a12]/10 bg-[#fffdf9]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(36,27,16,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1" dir="rtl">
        {items.map(({ key, label, Icon }) => {
          const active = key === 'cart' ? false : key === 'shop' ? activeView === 'shop' || activeView === 'product' : activeView === key;
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => activate(key)}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors active:scale-95 ${active ? 'text-[#91651e]' : 'text-dark-400 hover:text-dark-800'}`}
            >
              <span className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-all duration-300 ${active ? 'bg-[#e2c279]/25' : ''}`}>
                <Icon className={`h-[19px] w-[19px] transition-transform duration-300 ${active ? 'scale-105' : ''}`} strokeWidth={active ? 2.4 : 1.9} />
                {key === 'cart' && totalItems > 0 && (
                  <span className="absolute -right-0.5 -top-1 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#8a5a1d] px-1 text-[9px] font-bold leading-none text-white">
                    {new Intl.NumberFormat('fa-IR').format(totalItems)}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{label}</span>
              {active && <span aria-hidden="true" className="absolute bottom-0 h-0.5 w-7 rounded-full bg-gold-600" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
