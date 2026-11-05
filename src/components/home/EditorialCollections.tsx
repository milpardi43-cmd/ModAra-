import { ArrowLeft } from 'lucide-react';
import { imageSrcSet, optimizedAsset } from '../../lib/format';
import BrandSignature from '../BrandSignature';
import SectionHeading, { Reveal } from './SectionHeading';

type EditorialCollectionsProps = {
  onNavigate: (view: string, param?: string) => void;
};

type Collection = {
  title: string;
  subtitle: string;
  latin: string;
  image: string;
  alt: string;
  category: string;
};

const mainCollection: Collection = {
  title: 'کالکشن پوشاک',
  subtitle: 'پالتوها، بلوزهای ابریشمی و قطعه‌های منتخب این فصل؛ ظرافتی برای هر روز.',
  latin: 'THE CLOTHING EDIT',
  image: '/images/clothing/trench-coat-camel-women.jpg',
  alt: 'پالتوی بلند کرم زنانه از کالکشن پوشاک مُدارا',
  category: 'clothing',
};

const sideCollections: Collection[] = [
  {
    title: 'ساعت‌های لوکس',
    subtitle: 'زمان، به سبک شما',
    latin: 'TIMEPIECES',
    image: '/images/watch/luxury-gold-watch.jpg',
    alt: 'ساعت لوکس طلایی از کالکشن ساعت مُدارا',
    category: 'watch',
  },
  {
    title: 'کیف و چرم',
    subtitle: 'جزئیاتی که دیده می‌شوند',
    latin: 'LEATHER GOODS',
    image: '/images/bag/leather-handbag-women.jpg',
    alt: 'کیف چرمی زنانه از کالکشن کیف مُدارا',
    category: 'bag',
  },
];

function CollectionCard({
  collection,
  large = false,
  onNavigate,
}: {
  collection: Collection;
  large?: boolean;
  onNavigate: EditorialCollectionsProps['onNavigate'];
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate('shop', collection.category)}
      aria-label={`مشاهده ${collection.title}`}
      className={`group relative block w-full overflow-hidden rounded-[1.75rem] bg-[#efe7d8] text-right shadow-sm transition-shadow duration-500 hover:shadow-2xl hover:shadow-gold-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
        large ? 'h-[380px] sm:h-[460px] lg:h-full lg:min-h-[564px]' : 'h-[240px] sm:h-[270px]'
      }`}
    >
      <img
        src={optimizedAsset(collection.image, large ? 720 : 480)}
        srcSet={imageSrcSet(collection.image, [480, 720])}
        sizes={large ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 50vw, 100vw'}
        alt={collection.alt}
        width={720}
        height={960}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#120d08]/85 via-[#120d08]/35 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-white/0 transition-all duration-500 group-hover:border-gold-300/40 sm:inset-4"
      />
      <BrandSignature className="left-5 top-5 sm:left-7 sm:top-7" />
      <span className={`absolute inset-x-0 bottom-0 block ${large ? 'p-6 sm:p-9' : 'p-5 sm:p-6'}`}>
        <span
          dir="ltr"
          className="block text-left font-display text-[9px] font-semibold tracking-[0.38em] text-gold-300"
        >
          {collection.latin}
        </span>
        <span
          className={`mt-2 block font-extrabold leading-tight text-white ${
            large ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {collection.title}
        </span>
        <span
          className={`mt-2 block leading-7 text-white/70 ${
            large ? 'max-w-md text-sm sm:text-base' : 'text-[13px] sm:text-sm'
          }`}
        >
          {collection.subtitle}
        </span>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-[13px] font-bold text-white backdrop-blur-md transition-all duration-300 group-hover:border-gold-500 group-hover:bg-gold-500">
          مشاهده کالکشن
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
        </span>
      </span>
    </button>
  );
}

/** Asymmetric editorial collection banners (clothing / watches / leather). */
export default function EditorialCollections({ onNavigate }: EditorialCollectionsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8" dir="rtl">
      <SectionHeading
        eyebrow="کالکشن‌های منتخب"
        eyebrowEn="THE EDITORIAL EDIT"
        title="سه دنیای مُدارا، یک امضا"
        description="از پوشاک روزمرهٔ لوکس تا ساعت‌ها و چرم‌های ماندگار؛ هر کالکشن با یک وسواس مشترک انتخاب شده است."
      />
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Reveal className="h-full">
          <CollectionCard collection={mainCollection} large onNavigate={onNavigate} />
        </Reveal>
        <div className="grid gap-4 sm:gap-6">
          {sideCollections.map((collection, i) => (
            <Reveal key={collection.category} delay={0.12 * (i + 1)}>
              <CollectionCard collection={collection} onNavigate={onNavigate} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
