import type { Category, Product } from './supabase';
import { hangerFor, sideFor } from './hangerGarments';

export type RackItem = {
  id: string;
  /** Product page target. */
  slug: string;
  /** Accessible name. */
  name: string;
  /** Catalog product image used in the horizontal selector. */
  image: string;
  /** Full-body photo of the fixed gender model wearing this look. */
  modelPreview: string;
  /** Exact catalog product art used if the model preview cannot load. */
  outfitPreview: string;
  /** Final image fallback if both the model and main product preview fail. */
  previewFallback: string;
  /** Average fabric colour, used for the product swatch. */
  hex: string;
  /** width / height of the side-profile rack image. */
  aspect: number;
  /** Full catalogue record: what the product card reads out. */
  product: Product;
  /** Category slug used by the rack filters. */
  categorySlug: string;
  /** The same fixed human model is reused for every matching product. */
  modelGender: 'women' | 'men';
  /** Exact catalog photo for an accessory selected separately from the model look. */
  accessoryPreview?: string;
  /** Department label, e.g. «لباس». */
  categoryName: string;
};

export type RackFilter = { id: string; label: string };

export const RACK_FILTERS: RackFilter[] = [
  { id: 'clothing', label: 'لباس' },
  { id: 'bag', label: 'کیف' },
  { id: 'glasses', label: 'عینک' },
  { id: 'watch', label: 'ساعت' },
  { id: 'accessory', label: 'اکسسوری' },
];

const SUPPORTED_RACK_CATEGORIES = new Set(RACK_FILTERS.map((filter) => filter.id));

function modelGenderFor(product: Product, categorySlug: string): 'women' | 'men' {
  const searchable = `${product.slug} ${product.name} ${product.description ?? ''}`.toLowerCase();
  if (/(women|woman|womens|female|زنانه|خانم|دختر)/i.test(searchable)) return 'women';
  if (/(men|man|mens|male|مردانه|آقایان|مرد)/i.test(searchable)) return 'men';

  if (categorySlug === 'bag') {
    return /(handbag|crossbody|mini-shoulder|bucket|tote|straw|clutch|quilted|beach)/i.test(product.slug)
      ? 'women'
      : 'men';
  }
  if (categorySlug === 'glasses') {
    return /(cat-eye|oversized|round-tortoise|vintage)/i.test(product.slug) ? 'women' : 'men';
  }
  if (categorySlug === 'watch') return 'men';
  if (categorySlug === 'accessory') {
    return /(pearl|jewelry|earring|necklace|womens)/i.test(product.slug) ? 'women' : 'men';
  }
  return 'women';
}

/** Shared look builder: every hero experience (band, scroll cinema, …) feeds from here. */
export function buildRackItems(products: Product[], categories: Category[]): RackItem[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category] as const));
  return products
    .map((product) => {
      const category = categoriesById.get(product.category_id ?? '');
      if (!category || !SUPPORTED_RACK_CATEGORIES.has(category.slug) || !product.image_url) return null;
      const categorySlug = category.slug;

      const garment = hangerFor(product.slug);
      if (categorySlug === 'clothing' && !garment) return null;
      const profile = sideFor(product.slug) ?? garment;
      const modelGender = modelGenderFor(product, categorySlug);
      const productRackImage = `/images/rack/${categorySlug}/${product.slug}.webp`;
      const isClothing = categorySlug === 'clothing';
      const rackItem: RackItem = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: profile?.image ?? productRackImage,
        modelPreview: isClothing
          ? `/images/hero/try-on/${product.slug}.webp`
          : `/images/hero/model-pair/${modelGender}.webp`,
        outfitPreview: isClothing
          ? `/images/rack/outfits-cleaned/${product.slug}.webp`
          : product.image_url,
        previewFallback: garment?.image ?? product.image_url,
        hex: profile?.hex ?? '#b9a783',
        aspect: profile?.aspect ?? 0.75,
        product,
        categorySlug,
        modelGender,
        accessoryPreview: isClothing ? undefined : product.image_url,
        categoryName: category.name,
      };
      return rackItem;
    })
    .filter((item): item is RackItem => item !== null)
    /* Keep the existing rail rhythm while adding catalog accessory categories. */
    .sort((a, b) => a.aspect - b.aspect);
}
