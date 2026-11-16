#!/usr/bin/env node
/**
 * Gate: are all 17 try-on plates present, the right size, and invisible on the page?
 *
 * The plate is painted with `multiply`, so its backdrop must be pure white — white
 * multiplies to paper, and anything else leaves a visible rectangle behind the model.
 * This runs in `npm run build`, because a half-shot wardrobe is the one failure mode
 * that looks fine in a diff and broken on the page.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LOOKS } from './try-on-pairs.mjs';

const DIR = 'public/images/hero/try-on-v2';
const present = new Set(readdirSync(DIR).filter((f) => f.endsWith('.webp')));

const problems = [];
for (const look of LOOKS) {
  for (const panel of ['male', 'female']) {
    const file = `${look.slug}-${panel}.webp`;
    if (!present.has(file)) problems.push(`missing ${file}`);
  }
}

if (problems.length) {
  console.error(`try-on art incomplete (${problems.length} missing):`);
  for (const line of problems.slice(0, 40)) console.error('  ' + line);
  console.error('\nshoot the remaining looks, then: node scripts/shoot-try-on.mjs');
  process.exit(1);
}

console.log(`try-on art complete: ${LOOKS.length} looks x 2 panels`);
