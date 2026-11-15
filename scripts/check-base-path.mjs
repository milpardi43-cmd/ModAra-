#!/usr/bin/env node
/**
 * Does dist/index.html address its assets through the base path we deploy to?
 *
 *   BASE_PATH=/ModAra-/ npm run build
 *   BASE_PATH=/ModAra-/ node scripts/check-base-path.mjs
 *
 * GitHub Pages serves a project site under /<repo>/ while Netlify and a custom
 * domain serve it from "/", so Vite has to bake the matching prefix into every
 * asset URL. A root-relative "/assets/…" in a sub-path deploy is the classic
 * blank page: the HTML answers 200 and the bundle behind it 404s. This runs in
 * the Pages workflow so that mismatch fails the build instead of going live.
 */
import { readFile } from 'node:fs/promises';

const normalise = (value) => {
  const segment = String(value ?? '/').trim().replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
};
const base = normalise(process.env.BASE_PATH);
const htmlFile = process.argv[2] ?? 'dist/index.html';

let html;
try {
  html = await readFile(new URL(`../${htmlFile}`, import.meta.url), 'utf8');
} catch {
  console.error(`\n  ${htmlFile} is missing — build first: BASE_PATH=${base} npm run build\n`);
  process.exit(1);
}

/**
 * Only same-origin absolute URLs are ours to police. Relative paths ("./x.js"),
 * in-page anchors, data URIs and protocol/host-qualified links ("//cdn…",
 * "https://…") are correct under any base and are left alone.
 */
const refs = [...html.matchAll(/(?:src|href|content)="(\/(?!\/)[^"]*)"/g)]
  .map((match) => match[1])
  .filter((ref) => ref !== '/');

const wrong = [...new Set(refs.filter((ref) => !ref.startsWith(base)))];

console.log(`\n  base      ${base}`);
console.log(`  checked   ${new Set(refs).size} asset reference(s) in ${htmlFile}`);

if (wrong.length) {
  console.log('\n  ✗ these references ignore the deployed base path:');
  for (const ref of wrong.slice(0, 12)) console.log(`      ${ref}`);
  if (wrong.length > 12) console.log(`      … and ${wrong.length - 12} more`);
  console.log(
    `\n    rebuild with BASE_PATH=${base} (vite.config.ts reads it); a host that serves\n` +
      '    the site from "/" needs BASE_PATH=/ instead.\n',
  );
  process.exit(1);
}

console.log('  ✓ every asset reference is namespaced under the deployed base\n');
