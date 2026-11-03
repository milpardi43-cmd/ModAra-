import { BookOpen, Home, ShoppingBag } from 'lucide-react';

type MobileBottomNavProps = {
  activeView: string;
  onNavigate: (view: string) => void;
};

const items = [
  { label: 'خانه', view: 'home', Icon: Home },
  { label: 'فروشگاه', view: 'shop', Icon: ShoppingBag },
  { label: 'بلاگ', view: 'blog', Icon: BookOpen },
];

export default function MobileBottomNav({ activeView, onNavigate }: MobileBottomNavProps) {
  const activeTab = activeView === 'product'
    ? 'shop'
    : activeView === 'blog-post'
      ? 'blog'
      : activeView;

  return (
    <nav className="mobile-bottom-nav" dir="rtl" aria-label="ناوبری اصلی">
      {items.map(({ label, view, Icon }) => {
        const active = activeTab === view;
        return (
          <button
            key={view}
            type="button"
            className={`mobile-bottom-nav__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(view)}
          >
            <Icon className="mobile-bottom-nav__icon" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
