/**
 * The look the rack opens with, derived the same way the rack is ordered.
 *
 * RackHero sorts its pieces by the side profile's aspect and shows the slimmest
 * one first, and that ordering only depends on artwork already in the bundle — not
 * on the Supabase round-trip. Exporting the answer lets Vite preload the hero's
 * largest paint from index.html and lets the component paint the stage before the
 * catalogue resolves, instead of after it.
 */
import { hangerGarments, sideGarments } from './hangerGarments';

/** Pieces with transparent cut-out artwork are the clothing rack. */
const CLOTHING_SLUGS = Object.keys(hangerGarments);

function rackAspect(slug: string): number {
  const profile = sideGarments[slug] ?? hangerGarments[slug];
  return profile ? profile.aspect : 0.75;
}

/** Slimmest profile first, matching RackHero's `a.aspect - b.aspect` sort. */
const ordered = CLOTHING_SLUGS.slice().sort((a, b) => rackAspect(a) - rackAspect(b));

/** Slug of the piece the rack opens on. */
export const rackFirstLookSlug = ordered[0] ?? 'classic-white-shirt';

/**
 * Cache stamp for the hero artwork. Netlify keeps /images/* for 30 days, so this
 * has to move whenever the try-on photos are re-cut — and it has to live here,
 * because index.html preloads the same URL (see vite.config.ts) and the stage
 * requests it through rackOutfitAsset().
 */
export const RACK_OUTFIT_REVISION = 'smiling-pair-accessories-v3';

/** App-relative full-body photo for that look; resolve it with `asset()`. */
export const rackFirstLookImage = `/images/hero/try-on/${rackFirstLookSlug}.webp`;

/** That photo with its cache stamp — still app-relative, no base yet. */
export const rackFirstLookUrl = `${rackFirstLookImage}?v=${RACK_OUTFIT_REVISION}`;

/**
 * The wardrobe the stage is actually painting.
 *
 * The hero shows one full-body try-on per look, and every look is now shot as a matched
 * male/female pair — so the artwork has to answer a question the catalogue never had to:
 * which of the two people is wearing THIS piece.
 *
 * The catalogue already answers it, in the product's own name: every piece is named
 * «... مردانه» or «... زنانه». Reading that is better than a hand-kept list of slugs,
 * because it is the same field the card and the product page show — a new piece cannot
 * be added to the rack with the wrong mannequin. The slug is the fallback for names that
 * ever stop carrying the word, and the male panel is the last resort.
 */
const WOMEN_PATTERN = /زنانه/;
const MEN_PATTERN = /مردانه/;

/** Which person in a look's pair is wearing the piece. */
export function tryOnPanelFor(name: string, slug: string): 'male' | 'female' {
  if (WOMEN_PATTERN.test(name)) return 'female';
  if (MEN_PATTERN.test(name)) return 'male';
  if (slug.endsWith('-women')) return 'female';
  return 'male';
}

const PANEL_SUFFIX = { male: '-male', female: '-female' } as const;

/**
 * The try-on photo for a look, still app-relative and still unstamped.
 *
 * Both panels live in the same folder and differ only by that suffix, so this is the one
 * place that decides which person the stage shows. Callers add the cache stamp with
 * rackOutfitAsset — the URL shape must not drift from index.html's preload, which is
 * built from rackFirstLookUrl.
 */
export function tryOnImageFor(name: string, slug: string): string {
  return `/images/hero/try-on/${slug}${PANEL_SUFFIX[tryOnPanelFor(name, slug)]}.webp`;
}
