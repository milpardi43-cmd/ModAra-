import { useEffect, useState } from 'react';
import ModaraLogo from './ModaraLogo';

type HeaderProps = {
  onNavigate: (view: string, param?: string) => void;
};

const HERO_THEME_EVENT = 'modara:hero-theme';
/**
 * Past this many scrolled pixels the header stops being a transparent brand
 * statement and becomes a legible bar, so page content sliding underneath the
 * centered wordmark never collides with it on any route.
 */
const SCROLL_THRESHOLD = 24;

export default function Header({ onNavigate }: HeaderProps) {
  const [heroTheme, setHeroTheme] = useState<'light' | 'dark'>('light');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onHeroTheme = (event: Event) => {
      const theme = (event as CustomEvent<string>).detail;
      setHeroTheme(theme === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener(HERO_THEME_EVENT, onHeroTheme);
    return () => window.removeEventListener(HERO_THEME_EVENT, onHeroTheme);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onDark = heroTheme === 'dark';

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-[#e3d9c6]/70 bg-[#f8f5ee]/90 shadow-[0_10px_30px_-24px_rgba(46,34,19,0.65)] backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`relative flex items-center justify-center transition-[height] duration-300 ${
            scrolled ? 'h-14' : 'h-16 sm:h-[4.5rem]'
          }`}
        >
          <button
            type="button"
            aria-label="بازگشت به صفحه اصلی مُدارا"
            onClick={() => onNavigate('home')}
            className="pointer-events-auto group absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full p-1 transition-transform duration-500 hover:scale-[1.03]"
          >
            {/* The shrink lives on an inner wrapper so it never fights the hover scale. */}
            <span
              className={`block origin-center transition-transform duration-300 ${
                scrolled ? 'scale-[0.62]' : 'scale-100'
              }`}
            >
              <ModaraLogo tone={scrolled ? 'light' : onDark ? 'dark' : 'light'} />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
