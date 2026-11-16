/**
 * The colour of a garment, in the words a shopper would use.
 *
 * `hangerGarments`/`sideGarments` carry the average pixel colour of each
 * transparent cut-out (measured by the art pipeline, not hand-typed), and the
 * hero paints that value as the glow behind the rail. That hex is meaningless
 * to read, so this maps it onto a Persian colour name with a plain HSL rule:
 * low saturation reads as neutrals, the warm band splits by lightness (کرم /
 * بژ / شتری / قهوه‌ای), and only saturated hues get chromatic names.
 *
 * Deterministic and offline — no image decoding at runtime.
 */

function channel(value: string): number {
  return parseInt(value, 16) / 255;
}

function toHsl(hex: string): [hue: number, lightness: number, saturation: number] | null {
  const match = /^#?([0-9a-f\d]{2})([0-9a-f\d]{2})([0-9a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  const r = channel(match[1]);
  const g = channel(match[2]);
  const b = channel(match[3]);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, lightness, 0];
  const saturation = delta / (lightness > 0.5 ? 2 - max - min : max + min);
  const hue =
    (max === r ? ((g - b) / delta + (g < b ? 6 : 0)) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
  return [hue, lightness, saturation];
}

/**
 * The same colour as a wash of light on the wall behind a model.
 *
 * A glow is not a swatch: painting a measured `#191919` black T-shirt behind a
 * model would drop a dark blob on paper, while a `#dcdcdc` white one would
 * vanish. Both are the same physical event — light bouncing off fabric — so the
 * hue is kept and the lightness is clamped into the narrow band where a warm
 * paper wall can actually show it. Measured input, derived output, no new data.
 */
export function glowTint(hex: string, minLightness = 0.7, maxLightness = 0.87): string | null {
  const hsl = toHsl(hex);
  if (!hsl) return null;
  const [h, l, s] = hsl;
  const lightness = Math.min(maxLightness, Math.max(minLightness, l));
  // A saturated fabric keeps its character; a neutral one stays a neutral wash.
  const saturation = Math.min(0.34, s * 0.85);
  return `hsl(${h.toFixed(1)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
}

/** Persian name for a measured #rrggbb; `null` when the value is not a hex colour. */
export function fabricToneName(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const hsl = toHsl(hex);
  if (!hsl) return null;
  const [h, l, s] = hsl;

  // Neutrals first: a fabric with almost no chroma is white, cream, grey or
  // black, and calling a shadowed white shirt «خاکستری» reads like an error.
  if (s <= 0.05 && l >= 0.75) return 'سفید استخوانی';
  if (s <= 0.2 && l >= 0.72 && h >= 18 && h <= 60) return 'کرم';
  if (l <= 0.16 && s <= 0.35) return 'مشکی';
  if (s <= 0.12) return l < 0.35 ? 'ذغالی' : l < 0.62 ? 'خاکستری' : 'خاکستری روشن';

  if (h < 15) {
    if (l >= 0.72 && s <= 0.3) return 'صورتی روشن';
    if (l < 0.3) return 'قهوه‌ای تیره';
    return l < 0.55 ? (s < 0.45 ? 'قهوه‌ای' : 'زرشکی') : 'آجری';
  }
  if (h < 36) {
    if (l < 0.35) return 'قهوه‌ای';
    if (s < 0.16) return l > 0.75 ? 'کرم' : 'بژ';
    if (s < 0.35) return l > 0.6 ? 'شتری' : 'قهوه‌ای روشن';
    return s < 0.55 ? 'عسلی' : 'آجری';
  }
  if (h < 52) return s < 0.3 ? 'بژ' : l < 0.6 ? 'خردلی' : 'طلایی';
  if (h < 80) return l < 0.45 ? 'زیتونی' : 'خردلی';
  if (h < 160) return l < 0.4 ? 'سبز تیره' : l > 0.7 ? 'سبز روشن' : 'سبز';
  if (h < 200) return 'فیروزه‌ای';
  if (h < 255) return l < 0.35 ? 'سرمه‌ای' : 'آبی';
  if (h < 290) return 'بنفش';
  if (h < 340) return l > 0.6 || s < 0.25 ? 'صورتی' : 'ارغوانی';
  return l < 0.4 ? 'زرشکی' : 'قرمز';
}
