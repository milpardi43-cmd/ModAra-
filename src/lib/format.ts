/**
 * Constructing an Intl formatter is surprisingly expensive (it compiles ICU
 * data on first use). Pages render dozens of prices per frame while hovering
 * the rack, so every formatter is created once and reused.
 */
const faNumber = new Intl.NumberFormat('fa-IR');
const faDate = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const faDateTime = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Formats a number with Persian digits (no unit). */
export function formatNumber(value: number): string {
  return faNumber.format(value);
}

export function formatPrice(price: number): string {
  return faNumber.format(price) + ' تومان';
}

export function formatDate(date: string): string {
  return faDate.format(new Date(date));
}

export function formatDateTime(date: string): string {
  return faDateTime.format(new Date(date));
}

/**
 * Resolves an app-relative asset path (e.g. "/images/bag/tote.jpg") against the
 * Vite base URL, so the site works both at "/" (dev, custom domain) and under a
 * sub path such as "/ModAra/" on GitHub Pages.
 */
export function asset(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

function optimizedImagePath(path: string | null | undefined, width: number): string | null {
  if (!path || /^(https?:)?\/\//.test(path) || path.startsWith('data:')) return null;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!normalized.startsWith('/images/') || normalized.startsWith('/images/optimized/')) return null;
  if (!/\.(jpe?g|png|webp)$/i.test(normalized)) return null;
  return normalized
    .replace('/images/', '/images/optimized/')
    .replace(/\.(jpe?g|png|webp)$/i, `-${width}.webp`);
}

/**
 * Returns a generated WebP derivative for local catalogue imagery. Remote or
 * unknown image URLs intentionally fall back to the original `asset()` URL.
 * Run `npm run images:optimize` after adding/replacing local source images.
 */
export function optimizedAsset(path: string | null | undefined, width = 720): string {
  const optimized = optimizedImagePath(path, width);
  return optimized ? asset(optimized) : asset(path);
}

export function imageSrcSet(
  path: string | null | undefined,
  widths: readonly number[] = [480, 720],
): string | undefined {
  const entries = widths.flatMap((width) => {
    const optimized = optimizedImagePath(path, width);
    return optimized ? [`${asset(optimized)} ${width}w`] : [];
  });
  return entries.length ? entries.join(', ') : undefined;
}
