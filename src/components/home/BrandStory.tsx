import { ArrowLeft, Gem, HeartHandshake, ShieldCheck } from 'lucide-react';
import { imageSrcSet, optimizedAsset } from '../../lib/format';
import BrandSignature from '../BrandSignature';
import SectionHeading, { Reveal } from './SectionHeading';

type BrandStoryProps = {
  onNavigate: (view: string, param?: string) => void;
};

const values = [
  {
    icon: ShieldCheck,
    title: 'اصالت تضمین‌شده',
    desc: 'تمام محصولات مُدارا اصل و دارای ضمانت اصالت هستند.',
  },
  {
    icon: Gem,
    title: 'گزینش وسواس‌گونه',
    desc: 'هر قطعه پیش از ورود به ویترین، از نظر کیفیت و ماندگاری سنجیده می‌شود.',
  },
  {
    icon: HeartHandshake,
    title: 'تجربه‌ای آرام و مطمئن',
    desc: 'ارسال سریع، پرداخت امن و امکان بازگشت کالا تا ۷ روز پس از تحویل.',
  },
];

const facts = [
  { value: '۶', label: 'دسته‌بندی تخصصی' },
  { value: '۱۰۰٪', label: 'اصالت تضمین‌شده' },
  { value: '۷ روز', label: 'ضمانت بازگشت کالا' },
];

/** Editorial brand-story section for Modara. */
export default function BrandStory({ onNavigate }: BrandStoryProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8" dir="rtl">
      <div className="grid overflow-hidden rounded-[2.5rem] border border-gold-900/10 bg-[#f7f2e9] shadow-[0_32px_90px_-54px_rgba(58,39,15,0.38)] lg:grid-cols-2">
        <Reveal className="relative order-1 min-h-[420px] sm:min-h-[520px] lg:min-h-[760px]">
          <img
            src={optimizedAsset('/images/modara-story-4k.jpg', 1080)}
            srcSet={imageSrcSet('/images/modara-story-4k.jpg', [720, 1080])}
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt="استایل لوکس مشکی و طلایی مُدارا"
            width={2560}
            height={3840}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#120d08]/85 via-[#120d08]/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
            <div className="max-w-sm">
              <span dir="ltr" className="mb-3 flex items-center gap-3 text-[10px] font-bold tracking-[0.34em] text-gold-300">
                <span aria-hidden="true" className="brand-signature-rule h-px w-8 bg-gradient-to-r from-gold-300/30 to-gold-300" />
                THE MODARA EDIT
              </span>
              <p className="text-2xl font-extrabold leading-tight sm:text-3xl">امضای مُدارا</p>
              <p className="mt-2 max-w-sm text-sm leading-7 text-white/75">هر قطعه، با وسواس انتخاب می‌شود</p>
            </div>
          </div>
          <BrandSignature
            label="THE MODARA STORY"
            text="ظرافتِ ماندگار،"
            highlight="انتخاب همیشگی"
            className="right-5 top-6 sm:right-10 sm:top-10"
          />
        </Reveal>

        <div className="order-2 flex flex-col justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
          <SectionHeading
            eyebrow="داستان مُدارا"
            eyebrowEn="OUR STORY"
            title="جایی که ظرافت، به عادت تبدیل می‌شود"
          />
          <Reveal delay={0.08}>
            <div className="-mt-2 space-y-4 leading-8 text-dark-500 sm:leading-9">
              <p>
                مُدارا با یک باور ساده شکل گرفت: استایل خوب، حاصل انتخاب‌های درست و ماندگار است؛ نه
                انبوهی از خریدهای گذرا. به همین دلیل ویترین ما کوچک اما دقیق است؛ تازه‌ترین لباس‌ها،
                اکسسوری‌ها و ساعت‌های لوکس، با اصالتی که تضمینش می‌کنیم.
              </p>
              <p>
                ما خودمان را «فروشگاه» نمی‌دانیم؛ مُدارا بوتیکی است که در آن هر قطعه پیش از رسیدن به
                شما، باید از فیلتر سلیقهٔ ما بگذرد تا در کمدتان جایی همیشگی پیدا کند.
              </p>
            </div>
          </Reveal>

          <div className="mt-7 grid gap-3">
            {values.map((value, i) => (
              <Reveal key={value.title} delay={0.06 * i}>
                <div className="group flex items-start gap-4 rounded-2xl border border-[#211a12]/[0.07] bg-white/75 p-4 shadow-[0_10px_30px_-24px_rgba(45,33,18,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/30 hover:bg-white sm:p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-500/12 text-gold-700 ring-1 ring-gold-500/15 transition-colors group-hover:bg-gold-500/20">
                    <value.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold text-dark-900">{value.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-dark-500">{value.desc}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-7 grid grid-cols-3 divide-x divide-x-reverse divide-[#211a12]/10 rounded-2xl border border-[#211a12]/[0.07] bg-white/65 px-2 py-4 sm:px-4">
              {facts.map((fact) => (
                <div key={fact.label} className="px-2 text-center sm:px-3">
                  <p className="text-xl font-extrabold leading-none text-[#211a12] sm:text-2xl">{fact.value}</p>
                  <p className="mt-2 text-[10px] leading-5 text-dark-400 sm:text-xs">{fact.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="group inline-flex items-center gap-3 rounded-full bg-[#171208] py-2 pe-2 ps-6 text-sm font-bold text-[#f7efdc] shadow-[0_18px_40px_-16px_rgba(23,18,11,0.5)] transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-[0.97] sm:ps-7 sm:text-base"
              >
                آشنایی با کالکشن‌ها
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-[#171208] sm:h-10 sm:w-10">
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5 sm:h-5 sm:w-5" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('blog')}
                className="inline-flex items-center justify-center rounded-full border border-[#211a12]/15 bg-white/60 px-6 py-3 text-sm font-bold text-[#211a12] transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-600/70 hover:bg-gold-500/10 hover:text-gold-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-[0.97] sm:px-7 sm:text-base"
              >
                مجلهٔ استایل مُدارا
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
