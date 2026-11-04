import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';

type HeaderProps = {
  onNavigate: (view: string, param?: string) => void;
};

const HERO_THEME_EVENT = 'modara:hero-theme';

export default function Header({ onNavigate }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [heroTheme, setHeroTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 24);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const onHeroTheme = (event: Event) => {
      const theme = (event as CustomEvent<string>).detail;
      setHeroTheme(theme === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener(HERO_THEME_EVENT, onHeroTheme);
    return () => window.removeEventListener(HERO_THEME_EVENT, onHeroTheme);
  }, []);

  const showPill = scrolled;
  const onDark = heroTheme === 'dark' && !showPill;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-transparent">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-center sm:h-[4.5rem]">
          <button
            type="button"
            aria-label="بازگشت به صفحه اصلی مُدارا"
            onClick={() => onNavigate('home')}
            className={`pointer-events-auto group absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full px-5 py-2 transition-all duration-500 hover:scale-[1.03] ${
              showPill
                ? 'bg-white/80 shadow-[0_10px_36px_-12px_rgba(28,21,10,0.28)] ring-1 ring-black/[0.06] backdrop-blur-xl'
                : ''
            } ${onDark ? 'text-white' : 'text-[#211a12]'}`}
          >
            <span className="flex h-9 w-9 items-center justify-center transition-transform duration-300 group-hover:rotate-3 sm:h-10 sm:w-10">
              <Store
                className={`h-7 w-7 transition-colors duration-500 sm:h-8 sm:w-8 ${
                  onDark ? 'text-gold-300' : 'text-gold-600'
                }`}
                strokeWidth={2.2}
              />
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="text-xl font-black tracking-tight transition-colors duration-500 sm:text-2xl">
                مُدا
                <span
                  className={`bg-gradient-to-l bg-clip-text text-transparent ${
                    onDark ? 'from-gold-200 to-gold-500' : 'from-gold-500 to-gold-700'
                  }`}
                >
                  را
                </span>
              </span>
              <span
                dir="ltr"
                className={`mt-1 font-display text-[8px] font-semibold uppercase tracking-[0.42em] transition-colors duration-500 ${
                  onDark ? 'text-white/60' : 'text-[#211a12]/45'
                }`}
              >
                MODARA
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
