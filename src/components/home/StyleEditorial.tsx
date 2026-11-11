import { ArrowLeft } from 'lucide-react';
import { asset } from '../../lib/format';
import SectionHeading, { Reveal } from './SectionHeading';

type StyleEditorialProps = {
  onNavigate: (view: string, param?: string) => void;
};

const looks = [
  {
    title: 'استایل مردانه',
    palette: 'سرمه‌ای و شتری',
    image: '/images/lookbook/concept-mens-marino-tostado-posed.jpg',
    alt: 'ایده استایل مردانه با پیراهن سرمه‌ای و شلوار شتری، با ژستی راحت و طبیعی',
    number: '01',
    audience: 'men',
  },
  {
    title: 'استایل زنانه',
    palette: 'کرم و رز',
    image: '/images/lookbook/concept-womens-cream-rose-posed.jpg',
    alt: 'ایده استایل زنانه با بلوز کرم و دامن رز، با ژستی راحت و طبیعی',
    number: '02',
    audience: 'women',
  },
];

/** Editorial outfit inspiration: a shared visual system for men's and women's collections. */
export default function StyleEditorial({ onNavigate }: StyleEditorialProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" dir="rtl">
      <SectionHeading
        eyebrow="استایل مُدارا"
        eyebrowEn="THE EDIT"
        title="از ترکیب‌ها الهام بگیر"
        description="دو نگاه به استایل این فصل؛ ترکیب رنگ و فرم را ببین و بعد از میان محصولات فروشگاه انتخاب کن."
      />

      <div className="grid gap-5 sm:gap-7 md:grid-cols-2">
        {looks.map((look, index) => (
          <Reveal key={look.number} delay={index * 0.08}>
            <article className="group overflow-hidden rounded-[2rem] border border-[#8b6a3f]/20 bg-[#fbf7ef] shadow-[0_18px_48px_-32px_rgba(58,39,18,0.38)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_56px_-34px_rgba(58,39,18,0.48)]">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#efe2cc] sm:aspect-[5/4] md:aspect-[4/5] lg:aspect-[5/4]">
                <img
                  src={asset(look.image)}
                  alt={look.alt}
                  width={1200}
                  height={1500}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#1a120a]/75 via-[#1a120a]/5 to-transparent" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-[1.5rem] border border-white/40 sm:inset-4" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-gold-200">ترکیب پیشنهادی · {look.palette}</p>
                    <h3 className="mt-1 text-2xl font-extrabold sm:text-3xl">{look.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('shop', look.audience)}
                    className="group/button inline-flex shrink-0 items-center gap-2 rounded-full border border-white/45 bg-white/15 px-4 py-2.5 text-xs font-bold backdrop-blur-md transition-colors hover:bg-white hover:text-[#211a12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:text-sm"
                  >
                    دیدن لباس‌ها
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover/button:-translate-x-0.5" />
                  </button>
                </div>
              </div>
              <p className="px-5 py-3 text-xs leading-6 text-dark-500 sm:px-7 sm:text-sm">
                تصویر برای الهام از ترکیب استایل است؛ عکس و مشخصات دقیق هر کالا را در صفحه‌ی محصول ببینید.
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
