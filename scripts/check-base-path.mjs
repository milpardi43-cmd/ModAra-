#!/usr/bin/env node
/**
 * Are the site's asset URLs ready for the path being deployed to?
 *
 *   BASE_PATH=/ModAra-/ npm run build
 *   BASE_PATH=/ModAra-/ node scripts/check-base-path.mjs
 *
 * Two ways this repo can ship a blank page or a picture-less banner, both caught
 * here:
 *
 * 1. The bundle. GitHub Pages serves a project site under /<repo>/, while Netlify
 *    and a custom domain serve it from "/", so Vite has to bake the matching
 *    prefix into every URL in dist/index.html. A root-relative "/assets/…" behind
 *    a sub path 404s, and the HTML that loaded fine shows nothing.
 * 2. The source. A hard-coded src="/images/…" inside a component bypasses asset()
 *    in src/lib/format.ts, so it works at "/" — dev and Netlify — and breaks under
 *    a sub path. Referencing files in public/ through asset() keeps this quiet.
 *
 * The Pages workflow runs this right after the build so neither can go live.
 */
import { readFile, readdir } from 'node:fs/promises';
import { relative } from 'node:path';

const normalise = (value) => {
  const segment = String(value ?? '/').trim().replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
};

const base = normalise(process.env.BASE_PATH);
const root = new URL('../', import.meta.url);
const htmlFile = process.argv[2] ?? 'dist/index.html';

/** Attributes that hand a URL straight to the browser, skipping asset(). */
const HARDCODED = /\b(?:src|srcSet|poster|href|xlinkHref)="\/(?:images|videos)\/[^"]*"/;

async function sourceFiles(dir, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

let offenders = [];
try {
  const files = await sourceFiles(new URL('src/', root).pathname.replace(/\/+$/, ''));
  offenders = (
    await Promise.all(
      files.map(async (file) =>
        (await readFile(file, 'utf8'))
          .split('\n')
          .map((line, index) => ({ at: `${relative(root.pathname, file)}:${index + 1}`, line }))
          .filter((row) => HARDCODED.test(row.line)),
      ),
    )
  ).flat();
} catch (error) {
  console.error(`\n  could not read src/: ${error.message ?? error}\n`);
  process.exit(1);
}

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

const misbased = [...new Set(refs.filter((ref) => !ref.startsWith(base)))];
const ok = !offenders.length && !misbased.length;

console.log(`\n  base      ${base}`);
console.log(
  offenders.length
    ? `  source    ✗ ${offenders.length} reference(s) in src/ bypass asset():`
    : `  source    ✓ nothing in src/ bypasses asset()`,
);
for (const row of offenders.slice(0, 10)) {
  console.log(`      ${row.at}  ${row.line.trim().slice(0, 96)}`);
}
if (offenders.length > 10) console.log(`      … and ${offenders.length - 10} more`);

console.log(
  misbased.length
    ? `  bundle    ✗ ${misbased.length} of ${new Set(refs).size} reference(s) in ${htmlFile} miss the base:`
    : `  bundle    ✓ ${new Set(refs).size} reference(s) in ${htmlFile}, all under the deployed base`,
);
for (const ref of misbased.slice(0, 10)) console.log(`      ${ref}`);
if (misbased.length > 10) console.log(`      … and ${misbased.length - 10} more`);

if (ok) {
  console.log('\n  ✓ the build is ready for this base path\n');
  process.exit(0);
}

if (offenders.length) {
  console.log('\n  fix (source): pass those paths through asset() in src/lib/format.ts, so the');
  console.log('       deployed base is applied — a literal "/images/…" only works at "/".');
}
if (misbased.length) {
  console.log(`\n  fix (bundle): rebuild with BASE_PATH=${base}; a host that serves the site`);
  console.log('       from "/" needs BASE_PATH=/ instead.');
}
console.log('');
process.exit(1);
