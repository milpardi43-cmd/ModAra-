import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpLeft, CalendarDays, Clock3 } from 'lucide-react';
import { getLatestBlogPosts, type BlogPreviewPost } from '../../lib/catalog';
import { formatDate, imageSrcSet, optimizedAsset } from '../../lib/format';
import BrandSignature from '../BrandSignature';

type BlogPreviewProps = {
  onNavigate: (view: string, param?: string) => void;
};

/** Latest editorial posts shown near the bottom of the home page. */
export default function BlogPreview({ onNavigate }: BlogPreviewProps) {
  const [posts, setPosts] = useState<BlogPreviewPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getLatestBlogPosts(3).then((data) => {
      if (cancelled) return;
      setPosts(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = posts[0];
  const supporting = posts.slice(1);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BrandSignature inline label="THE MODARA JOURNAL" text="خواندنی‌های مُدارا" highlight="" tone="dark" size="compact" className="mb-2" />
          <h2 className="mb-1 text-2xl font-extrabold text-dark-900 sm:text-3xl">آخرین مقالات</h2>
          <p className="text-dark-500">راهنمای مد و استایل</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('blog')}
          className="group flex w-fit items-center gap-2 rounded-full border border-dark-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 transition-all hover:-translate-y-0.5 hover:border-gold-500 hover:bg-gold-50"
        >
          مشاهده همه
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-h-[400px] animate-pulse rounded-[2rem] bg-dark-100" />
          <div className="grid gap-4">
            {[1, 2].map((item) => (
              <div key={item} className="flex min-h-48 animate-pulse gap-4 rounded-[1.75rem] border border-dark-100 bg-white p-3">
                <div className="w-2/5 shrink-0 rounded-2xl bg-dark-100" />
                <div className="flex flex-1 flex-col justify-center gap-3">
                  <div className="h-3 w-1/2 rounded bg-dark-100" />
                  <div className="h-4 w-4/5 rounded bg-dark-100" />
                  <div className="h-3 w-full rounded bg-dark-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : featured ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-5">
          <button
            type="button"
            onClick={() => onNavigate('blog-post', featured.slug)}
            className="group relative isolate min-h-[400px] overflow-hidden rounded-[2rem] bg-[#201811] text-right shadow-[0_24px_70px_-42px_rgba(42,29,17,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 sm:min-h-[480px]"
          >
            <img
              src={optimizedAsset(featured.image_url, 960)}
              srcSet={imageSrcSet(featured.image_url, [640, 960])}
              sizes="(min-width: 1024px) 60vw, 100vw"
              alt={featured.title}
              width={960}
              height={640}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.045]"
            />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#130f0b]/95 via-[#130f0b]/35 to-transparent" />
            <span aria-hidden="true" className="absolute inset-4 rounded-[1.6rem] border border-white/20 transition-colors group-hover:border-gold-300/60 sm:inset-5" />
            <span className="absolute inset-x-0 bottom-0 block p-6 text-white sm:p-9">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
                <CalendarDays className="h-3.5 w-3.5 text-gold-300" />
                {formatDate(featured.created_at)}
                <span className="text-white/45">·</span>
                {featured.author}
              </span>
              <span className="block max-w-3xl text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
                {featured.title}
              </span>
              <span className="mt-3 block max-w-2xl line-clamp-2 text-sm leading-7 text-white/75 sm:text-base">
                {featured.excerpt}
              </span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-gold-200">
                مطالعهٔ مقاله
                <ArrowUpLeft className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:-translate-x-0.5" />
              </span>
            </span>
          </button>

          <div className="grid gap-4">
            {supporting.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onNavigate('blog-post', post.slug)}
                className="group grid min-h-[190px] grid-cols-[minmax(110px,0.75fr)_1.25fr] overflow-hidden rounded-[1.75rem] border border-dark-100 bg-white p-2 text-right shadow-[0_12px_40px_-32px_rgba(45,33,18,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-gold-500/35 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 sm:min-h-[225px] sm:p-3"
              >
                <span className="relative block overflow-hidden rounded-[1.3rem] bg-dark-50">
                  <img
                    src={optimizedAsset(post.image_url, 640)}
                    srcSet={imageSrcSet(post.image_url, [480, 640])}
                    sizes="(min-width: 1024px) 220px, 40vw"
                    alt={post.title}
                    width={640}
                    height={480}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </span>
                <span className="flex min-w-0 flex-col justify-center px-4 py-3 sm:px-5">
                  <span className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-dark-400 sm:text-xs">
                    <CalendarDays className="h-3.5 w-3.5 text-gold-700" />
                    {formatDate(post.created_at)}
                    <span>·</span>
                    {post.author}
                  </span>
                  <span className="line-clamp-2 text-base font-extrabold leading-7 text-dark-900 transition-colors group-hover:text-gold-800 sm:text-lg">
                    {post.title}
                  </span>
                  <span className="mt-2 line-clamp-2 text-xs leading-6 text-dark-500 sm:text-sm">{post.excerpt}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-700">
                    مطالعهٔ مقاله <Clock3 className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
