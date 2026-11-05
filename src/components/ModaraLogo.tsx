type ModaraLogoProps = {
  tone?: 'light' | 'dark';
  size?: 'header' | 'footer';
};

/** Text-only Modara wordmark, typeset with the site's Beiruti font. */
export default function ModaraLogo({ tone = 'light', size = 'header' }: ModaraLogoProps) {
  const isDark = tone === 'dark';
  const isFooter = size === 'footer';
  const persianColor = isDark
    ? 'bg-gradient-to-l from-[#fff2bd] via-[#e2bd64] to-[#f8e5a7] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(226,194,121,0.25)]'
    : 'bg-gradient-to-l from-[#85551b] via-[#af7c2d] to-[#8a5a1d] bg-clip-text text-transparent';
  const englishColor = isDark ? 'text-[#f3d581]' : 'text-[#91601d]';

  return (
    <span dir="rtl" className="inline-flex flex-col items-center leading-none">
      <span
        className={`whitespace-nowrap font-sans font-black tracking-tight ${
          isFooter ? 'text-5xl' : 'text-4xl sm:text-5xl'
        } ${persianColor}`}
      >
        مُدارا
      </span>
      <span
        dir="ltr"
        className={`mt-1 font-sans font-semibold tracking-[0.35em] ${
          isFooter ? 'text-xs' : 'text-xs sm:text-sm'
        } ${englishColor}`}
      >
        MODARA
      </span>
    </span>
  );
}
