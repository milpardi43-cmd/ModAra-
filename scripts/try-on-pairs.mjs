#!/usr/bin/env node
/**
 * The spec for the hero's try-on artwork.
 *
 * One generation per look, always a PAIR: the same male and the same female mannequin,
 * side by side, each wearing that look. Splitting the pair means every one of the 17
 * stage images shows the identical two people in the identical light — which is what
 * makes the rack read as one shoot rather than seventeen stock photos.
 *
 * Each entry: the look's slug, which panel the stage uses, and the garment description
 * that goes into the prompt. The house style lives in STYLE so a re-shoot is one edit.
 */
export const STYLE = `Two separate full-body fashion catalogue photographs side by side on one canvas, each model isolated on a seamless studio backdrop.

Lighting: strong directional key light from the upper left with soft falloff, a warm rim light along the right shoulder and arm, sculpted shading that reveals fabric weave and drape, deep editorial magazine contrast, matte film-like tonality. The light falls on the models ONLY, not on the backdrop behind them.

CRITICAL: the backdrop behind each model stays an even, completely unchanged flat pale cream #f3efe8 from edge to edge. No cast shadow, no drop shadow, no shadow on the wall, no vignette, no gradient, no hotspot, no floor line, no horizon. The models appear to float on flat unlit paper. It is a cut-out look: the paper is mathematically uniform everywhere except where the model is.

Composition for both panels: model centred horizontally, camera at chest height, straight-on, the whole figure from the top of the head to the soles of the shoes inside the frame with clear empty margin above the head and below the feet, no cropped limbs, hands visible at the sides.

No text, no logos, no captions, no borders. Vertical 3:4 panel proportions; the two panels are separated only by a narrow strip of the same plain paper.`;

/**
 * HOW TO SHOOT A LOOK
 *
 * 1. Generate look one normally. Set the prompt to `${CAST_SENTENCE} ${STYLE} ${panels}`.
 * 2. For every other look, pass the FIRST finished pair as the reference image and open
 *    the prompt with INKEEP. Identity holds that way; described in words it drifts, and
 *    seventeen looks with seventeen different models is not a wardrobe, it is a stock
 *    photo page.
 * 3. Split and finish with scripts/tryon_plates.py (see its docstring): `split` cuts the
 *    two panels apart, `finish` drives the backdrop to pure white - which is a no-op
 *    under the stage's `multiply` - and seats the soles 18px above the floor.
 *
 * The reference chain is the whole reason one look is generated per pair rather than two
 * models per look: one generation, one face, one light, two garments.
 */
export const INKEEP = `Keep these exact two models — the same faces, hair, skin tone, body proportions and heights — and change only their clothes.`;

/** Line up the two panels, in the order the finished canvas reads. */
export const panels = (look) =>
  `LEFT PANEL: the male model, wearing ${look.male}.\n\nRIGHT PANEL: the female model, wearing ${look.female}.`;

/**
 * The cast, as it appeared in the first generation. Kept here only so a fresh shoot can
 * be started from nothing; every later look is conditioned on the finished pair instead.
 */
export const MODELS = {
  male: 'a male model in his early thirties, short dark hair, clean-shaven, athletic slim build, standing facing the camera with feet slightly apart, arms relaxed at his sides',
  female:
    'a female model in her late twenties, dark hair tied back low, natural makeup, slim build, standing facing the camera with feet together, arms relaxed at her sides',
};

/** Opening prompt for a shoot with no reference image yet. */
export const seedPrompt = (look) =>
  `${STYLE}\n\nLEFT PANEL: ${MODELS.male}, wearing ${look.male}.\n\nRIGHT PANEL: ${MODELS.female}, wearing ${look.female}.`;

/**
 * look slug -> the outfit worn in EACH panel.
 *
 * Every look dresses both mannequins, so a pair is always a complete, coherent shoot and
 * re-running one line reproduces that look exactly. `panel` is the side the stage uses —
 * the gender the catalogue cut belongs to. The other panel exists so the shoot reads as a
 * campaign, and so the wardrobe as a whole shows the same two people throughout.
 */
export const LOOKS = [
  { slug: 'basic-tshirt-black-men', panel: 'male',
    male: 'a plain black crew-neck cotton t-shirt with dark camel chino trousers, a brown leather belt and dark brown leather derby shoes',
    female: 'a cream ribbed knit cardigan buttoned up with camel wide-leg trousers and tan leather loafers' },
  { slug: 'classic-white-shirt', panel: 'male',
    male: 'a crisp white cotton poplin shirt tucked into navy wool trousers with brown leather loafers',
    female: 'a black fine-gauge knit top with a matching black midi skirt and black ballet flats' },
  { slug: 'oxford-blue-shirt-men', panel: 'male',
    male: 'a light blue oxford cotton shirt with stone-grey chinos and tan suede shoes',
    female: 'a dove-grey silk shirt tucked into cream tailored trousers with nude pointed heels' },
  { slug: 'denim-jacket-men', panel: 'male',
    male: 'a mid-indigo denim jacket over a white t-shirt with charcoal trousers and black leather boots',
    female: 'a light-wash denim jacket over a white t-shirt with an off-white midi skirt and white leather sneakers' },
  { slug: 'polo-shirt-green-men', panel: 'male',
    male: 'an olive green knitted polo shirt with sand-coloured chinos and brown suede loafers',
    female: 'a stone-coloured linen shirt dress belted at the waist with tan leather sandals' },
  { slug: 'knit-sweater-gray-men', panel: 'male',
    male: 'a heather grey merino crew-neck sweater with dark navy trousers and black leather shoes',
    female: 'an oat-coloured chunky knit sweater with ecru straight-leg trousers and brown leather boots' },
  { slug: 'hoodie-charcoal-men', panel: 'male',
    male: 'a charcoal heavyweight cotton hoodie with black tapered joggers and white leather sneakers',
    female: 'a light grey cotton hoodie with black leggings and white leather sneakers' },
  { slug: 'wool-blazer-navy-men', panel: 'male',
    male: 'a navy wool single-breasted blazer over a white shirt with matching navy trousers and black oxford shoes',
    female: 'a black tailored trouser suit with a white silk camisole and pointed black heels' },
  { slug: 'elegant-pink-blouse', panel: 'female',
    male: 'a charcoal fine-gauge knit polo with black trousers and black leather shoes',
    female: 'a dusty pink silk blouse with a soft bow collar, tucked into cream wide-leg trousers with nude pointed heels' },
  { slug: 'silk-blouse-cream-women', panel: 'female',
    male: 'a sand-coloured linen shirt with olive chinos and brown leather loafers',
    female: 'a cream silk blouse with a fluid drape, tucked into camel tailored trousers with tan leather mules' },
  { slug: 'oversize-tshirt-white-women', panel: 'female',
    male: 'a white cotton t-shirt with mid-blue straight jeans and white leather sneakers',
    female: 'an oversized white cotton t-shirt with light-wash straight jeans and white leather sneakers' },
  { slug: 'knit-cardigan-cream-women', panel: 'female',
    male: 'a cream merino crew-neck sweater with stone chinos and brown leather shoes',
    female: 'a cream cable-knit cardigan buttoned up over a matching cream wide-leg trouser, with a tan leather handbag in one hand' },
  { slug: 'turtleneck-sweater-beige-women', panel: 'female',
    male: 'a chocolate brown merino turtleneck with charcoal trousers and brown leather boots',
    female: 'a beige fine-gauge turtleneck sweater with chocolate brown tailored trousers and brown leather boots' },
  { slug: 'midi-dress-floral-women', panel: 'female',
    male: 'a white oxford shirt with navy trousers and brown leather loafers',
    female: 'a floral-print midi dress with a cinched waist and long sleeves, with nude ankle-strap heels' },
  { slug: 'hoodie-blush-women', panel: 'female',
    male: 'a grey marl cotton hoodie with black joggers and white leather sneakers',
    female: 'a blush pink cotton hoodie with cream wide-leg joggers and white leather sneakers' },
  { slug: 'trench-coat-camel-women', panel: 'female',
    male: 'a stone-coloured cotton trench coat over a white shirt with navy trousers and brown leather shoes',
    female: 'a camel double-breasted trench coat belted at the waist, over black slim trousers and black ankle boots' },
  { slug: 'satin-blazer-black-women', panel: 'female',
    male: 'a black wool blazer over a black crew-neck top with black trousers and black leather shoes',
    female: 'a black satin single-breasted blazer with a matching black trouser and pointed black heels' },
];

/** The look the female wardrobe is shown in when a garment is unisex-cut. */
export const PANEL_OF = Object.fromEntries(LOOKS.map((look) => [look.slug, look.panel]));
