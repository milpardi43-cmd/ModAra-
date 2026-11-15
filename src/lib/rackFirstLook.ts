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
