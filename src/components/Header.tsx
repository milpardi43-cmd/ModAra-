import { useEffect, useState } from 'react';
import ModaraLogo from './ModaraLogo';

type HeaderProps = {
  onNavigate: (view: string, param?: string) => void;
};

const HERO_THEME_EVENT = 'modara:hero-theme';

export default function Header({ onNavigate }: HeaderProps) {
  const [heroTheme, setHeroTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const onHeroTheme = (event: Event) => {
      const theme = (event as CustomEvent<string>).detail;
      setHeroTheme(theme === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener(HERO_THEME_EVENT, onHeroTheme);
    return () => window.removeEventListener(HERO_THEME_EVENT, onHeroTheme);
  }, []);

  const onDark = heroTheme === 'dark';

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-transparent">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-center sm:h-[4.5rem]">
          <button
            type="button"
            aria-label="بازگشت به صفحه اصلی مُدارا"
            onClick={() => onNavigate('home')}
            className="pointer-events-auto group absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full p-1 transition-transform duration-500 hover:scale-[1.03]"
          >
            <ModaraLogo tone={onDark ? 'dark' : 'light'} />
          </button>
        </div>
      </div>
    </header>
  );
}
