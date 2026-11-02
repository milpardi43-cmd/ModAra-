import { ArrowLeft, Sparkles } from 'lucide-react';

type HomeHeroBannerProps = {
  onNavigate: (view: string, param?: string) => void;
};

export default function HomeHeroBanner({ onNavigate }: HomeHeroBannerProps) {
  return (
    <section className="mx-auto w-full max-w-[1600px] px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8" aria-label="معرفی مُدارا">
      <div className="group relative isolate min-h-[430px] overflow-hidden rounded-[1.75rem] bg-[#211a15] shadow-[0_28px_90px_-42px_rgba(35,24,16,0.75)] sm:min-h-[470px] sm:rounded-[2.25rem] lg:min-h-[520px]">
        <img
          src="/images/hero-atelier/look-tailored.jpg"
          alt="استایل رسمی از مجموعهٔ پوشاک مُدارا"
          width={1376}
          height={768}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[35%_center] transition-transform duration-[1600ms] ease-out group-hover:scale-[1.035]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-l from-[#17120e]/95 via-[#17120e]/70 to-[#17120e]/5" />
        <div aria-hidden="true" className="promo-poster-shine pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/4 bg-gradient-to-r from-transparent via-amber-100/20 to-transparent" />
        <div aria-hidden="true" className="promo-poster-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
        <span aria-hidden="true" className="promo-poster-orbit pointer-events-none absolute -left-20 -top-28 z-0 h-80 w-80 rounded-full border border-amber-200/20" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-white/15 sm:inset-5 sm:rounded-[1.75rem]" />

        <div className="relative z-10 flex min-h-[430px] items-center px-6 py-12 sm:min-h-[470px] sm:px-10 lg:min-h-[520px] lg:px-16">
          <div className="max-w-2xl text-right text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-black/20 px-4 py-2 text-xs font-semibold text-amber-100 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
              مُدارا؛ انتخابی برای استایل شخصی
            </div>
            <h1 className="text-balance text-4xl font-black leading-[1.2] sm:text-5xl lg:text-6xl">
              استایل ماندگار،
              <span className="mt-2 block text-[#e8c987]">از انتخاب درست شروع می‌شود</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base sm:leading-8">
              برای روزهای کاری، دورهمی‌های خاص و لحظه‌هایی که می‌خواهید خودتان باشید؛ پوشاک و جزئیات استایل را در یک نگاه کشف کنید.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['پوشاک منتخب', 'اکسسوری‌های هماهنگ', 'انتخاب برای هر روز'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#e8c987]" />
                  {item}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="group/button mt-7 inline-flex items-center gap-3 rounded-full bg-[#f0d59b] px-6 py-3.5 text-sm font-bold text-[#2b2116] shadow-[0_12px_32px_-16px_rgba(240,213,155,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#211a15]"
            >
              کشف مجموعهٔ مُدارا
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover/button:-translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
