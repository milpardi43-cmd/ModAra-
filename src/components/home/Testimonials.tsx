import { useEffect, useMemo, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { formatDate } from '../../lib/format';
import {
  getFeaturedReviews,
  getReviewRatings,
  type ReviewPreview,
} from '../../lib/catalog';
import SectionHeading, { Reveal } from './SectionHeading';

type TestimonialsProps = {
  onNavigate: (view: string, param?: string) => void;
};

const faNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

/** Picks a diverse set of the best real customer reviews. */
function pickReviews(reviews: ReviewPreview[]): ReviewPreview[] {
  const usable = reviews.filter((review) => typeof review.comment === 'string' && review.comment.trim().length >= 18);
  const seenProducts = new Set<string>();
  const seenComments = new Set<string>();
  const picked: ReviewPreview[] = [];

  for (const minRating of [5, 4]) {
    for (const review of usable) {
      const normalizedComment = review.comment!.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fa');
      if (
        picked.length >= 6 ||
        review.rating < minRating ||
        seenProducts.has(review.product_id) ||
        seenComments.has(normalizedComment)
      ) continue;
      seenProducts.add(review.product_id);
      seenComments.add(normalizedComment);
      picked.push(review);
    }
  }
  return picked;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`امتیاز ${faNumber(rating)} از ۵`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'fill-gold-400 text-gold-400' : 'text-white/25'}`}
        />
      ))}
    </span>
  );
}

function ReviewContext({ review, onNavigate }: { review: ReviewPreview; onNavigate: TestimonialsProps['onNavigate'] }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="block text-[10px] font-semibold text-white/40">دیدگاه دربارهٔ محصول</span>
        {review.product ? (
          <button
            type="button"
            onClick={() => onNavigate('product', review.product!.slug)}
            className="mt-1 block max-w-full truncate text-sm font-bold text-gold-200 transition-colors hover:text-gold-100"
          >
            {review.product.name}
          </button>
        ) : (
          <span className="mt-1 block text-sm font-bold text-white/75">محصول مُدارا</span>
        )}
      </div>
      <time dateTime={review.created_at} className="shrink-0 text-[10px] text-white/40 sm:text-xs">
        {formatDate(review.created_at)}
      </time>
    </div>
  );
}

function ReviewByline({ review }: { review: ReviewPreview }) {
  return (
    <figcaption className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold-500/15 text-base font-extrabold text-gold-300 ring-1 ring-gold-400/25"
      >
        {review.name?.trim().charAt(0) || 'م'}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{review.name}</span>
    </figcaption>
  );
}

/** Dark editorial testimonials section, powered by real product reviews. */
export default function Testimonials({ onNavigate }: TestimonialsProps) {
  const [reviews, setReviews] = useState<ReviewPreview[]>([]);
  const [ratings, setRatings] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFeaturedReviews(60), getReviewRatings(1000)]).then(
      ([featuredReviews, allRatings]) => {
        if (cancelled) return;
        setReviews(featuredReviews);
        setRatings(allRatings);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const picked = useMemo(() => pickReviews(reviews), [reviews]);
  const average = useMemo(
    () => (ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0),
    [ratings],
  );
  const featured = picked[0];
  const supportingReviews = picked.slice(1);

  return (
    <section className="relative isolate overflow-hidden bg-[#14100c] py-16 sm:py-24" dir="rtl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(192,145,63,0.19),transparent_36%),radial-gradient(circle_at_90%_88%,rgba(192,145,63,0.12),transparent_40%)]"
      />
      <div
        aria-hidden="true"
        dir="ltr"
        className="pointer-events-none absolute -top-8 left-0 select-none font-display text-[16vw] font-semibold leading-none tracking-[0.06em] text-transparent opacity-[0.55]"
        style={{ WebkitTextStroke: '1px rgba(232,201,122,0.10)' }}
      >
        MODARA
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          dark
          eyebrow="حرف‌های مشتریان ما"
          eyebrowEn="TESTIMONIALS"
          title="تجربهٔ خرید را از زبان مشتریان بخوانید"
          description="نظرها دربارهٔ کیفیت کالا، تطابق با تصویر، بسته‌بندی و ارسال؛ هر دیدگاه همراه با امتیاز و محصول مربوط نمایش داده می‌شود."
          action={
            !loading && ratings.length > 0 ? (
              <div className="flex items-center gap-4 rounded-2xl border border-gold-300/20 bg-white/[0.06] px-5 py-3.5 shadow-[0_16px_44px_-30px_rgba(222,174,77,0.45)] backdrop-blur-sm">
                <span className="text-3xl font-black leading-none text-white">
                  {faNumber(Math.round(average * 10) / 10, 1)}
                </span>
                <span>
                  <Stars rating={Math.round(average)} />
                  <span className="mt-1 block text-[11px] text-white/50">
                    میانگین امتیاز از {faNumber(ratings.length)} نظر
                  </span>
                </span>
              </div>
            ) : undefined
          }
        />

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="min-h-72 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.05] lg:col-span-1" />
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="min-h-48 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
              ))}
            </div>
          </div>
        ) : featured ? (
          <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_1.35fr] lg:gap-5">
            <Reveal className="h-full">
              <figure className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[2rem] border border-gold-300/25 bg-gradient-to-br from-[#302316] via-[#211a13] to-[#17120e] p-6 shadow-[0_30px_80px_-48px_rgba(210,158,57,0.5)] sm:min-h-[400px] sm:p-8">
                <Quote aria-hidden="true" className="absolute left-6 top-6 h-16 w-16 text-gold-300/10 sm:left-8 sm:top-8 sm:h-20 sm:w-20" />
                <ReviewContext review={featured} onNavigate={onNavigate} />
                <div className="relative mt-5 flex items-center justify-between gap-4">
                  <Stars rating={featured.rating} />
                  <span className="rounded-full border border-gold-200/15 bg-black/15 px-3 py-1.5 text-[10px] font-bold tracking-wide text-gold-200/80">
                    دیدگاه ثبت‌شده
                  </span>
                </div>
                <blockquote className="relative my-7 flex-1 text-lg font-semibold leading-9 text-white sm:text-xl sm:leading-10">
                  {featured.comment}
                </blockquote>
                <ReviewByline review={featured} />
              </figure>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {supportingReviews.map((review, index) => (
                <Reveal key={review.id} delay={0.06 * index} className="h-full">
                  <figure className="group flex h-full min-h-[250px] flex-col rounded-[1.65rem] border border-white/10 bg-white/[0.045] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-gold-300/35 hover:bg-white/[0.075] hover:shadow-[0_22px_50px_-38px_rgba(218,174,83,0.45)] sm:p-6">
                    <ReviewContext review={review} onNavigate={onNavigate} />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Stars rating={review.rating} />
                      <Quote aria-hidden="true" className="h-5 w-5 text-gold-400/45 transition-colors group-hover:text-gold-300" />
                    </div>
                    <blockquote className="my-4 flex-1 text-sm leading-7 text-white/75">
                      {review.comment}
                    </blockquote>
                    <ReviewByline review={review} />
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-12 text-center text-white/60">
            هنوز دیدگاهی برای نمایش ثبت نشده است.
          </div>
        )}
      </div>
    </section>
  );
}
