#!/usr/bin/env node
/**
 * Batch the art preparation for the hero's try-on wardrobe.
 *
 * The shooting itself is one image generation per look (see scripts/try-on-pairs.mjs for
 * the prompts and why every look is shot as a matched pair). This script takes whatever
 * raw pairs exist in the shoot folder and does the mechanical part for all of them:
 * split, normalise, seat, and assert that the finished plate is invisible on the page.
 *
 *   node scripts/shoot-try-on.mjs            # every raw pair present
 *   node scripts/shoot-try-on.mjs --check    # only re-validate what is already finished
 *
 * A look with no raw pair is reported, not skipped silently: the wardrobe is all
 * seventeen or it is not the wardrobe.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { LOOKS } from './try-on-pairs.mjs';

const RAW_DIR = 'public/images/hero/try-on-v2/_shoot';
const OUT_DIR = 'public/images/hero/try-on-v2';
const WORK_DIR = '/tmp/try-on-work';

const checkOnly = process.argv.includes('--check');
mkdirSync(WORK_DIR, { recursive: true });

const python = (args) =>
  execFileSync('python3', ['scripts/tryon_plates.py', ...args], { encoding: 'utf8' }).trim();

const shot = new Set(
  existsSync(RAW_DIR)
    ? readdirSync(RAW_DIR).filter((f) => f.endsWith('.png') && !f.startsWith('_')).map((f) => f.slice(0, -4))
    : [],
);

const results = [];
for (const look of LOOKS) {
  if (checkOnly) {
    const reports = ['male', 'female'].map((panel) => {
      const plate = join(OUT_DIR, `${look.slug}-${panel}.webp`);
      return existsSync(plate) ? python(['check', plate]) : 'missing plate';
    });
    results.push([look.slug, reports.join(' || ')]);
    continue;
  }
  if (!shot.has(look.slug)) {
    results.push([look.slug, 'no raw pair yet']);
    continue;
  }
  python(['split', join(RAW_DIR, `${look.slug}.png`), WORK_DIR, look.slug]);
  const reports = [];
  for (const panel of ['male', 'female']) {
    const src = join(WORK_DIR, `${look.slug}-${panel}.png`);
    const dst = join(OUT_DIR, `${look.slug}-${panel}.webp`);
    if (!existsSync(src)) {
      reports.push(`no ${panel} panel`);
      continue;
    }
    reports.push(python(['finish', src, dst]).replace(/\n/g, ' | '));
  }
  results.push([look.slug, reports.join(' || ')]);
}

let failed = 0;
for (const [slug, report] of results) {
  const bad = /FAIL|no raw|missing|no .* panel/.test(report);
  if (bad) failed += 1;
  console.log(`${bad ? '✗' : '✓'} ${slug.padEnd(30)} ${report.replace(/\n/g, ' | ')}`);
}
console.log(`\n${results.length - failed}/${results.length} looks ready`);
process.exit(failed === 0 ? 0 : 1);
