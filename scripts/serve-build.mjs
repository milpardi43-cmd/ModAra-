#!/usr/bin/env node
/**
 * Serves the production build (`dist/`) the way a real CDN would: pre-compressed
 * bodies (brotli, falling back to gzip), long-lived immutable caching for
 * fingerprinted assets, ETag revalidation for HTML, and a no-latency in-memory
 * cache of the compressed payloads.
 *
 * Why this exists: `vite preview` is meant for smoke tests and answers every
 * request with uncompressed bytes. Over a tunnel that turns a 124 kB bundle
 * into 426 kB on the wire, and the Persian demo seed into another ~330 kB.
 * This server keeps the whole site under ~200 kB of transfer on a cold load.
 *
 * Usage:
 *   npm run build          # BASE_PATH=/ for a root-hosted deploy
 *   npm run serve          # http://0.0.0.0:5173
 *   PORT=8080 npm run serve
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync, constants as zlibConstants } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '0.0.0.0';

const COMPRESSIBLE = new Set([
  '.html', '.js', '.mjs', '.css', '.svg', '.json', '.webmanifest', '.txt', '.map',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/** One entry per served file: raw bytes + every compressed variant we may need. */
const cache = new Map();

function cacheHeaders(urlPath) {
  // Vite fingerprints everything under /assets/, so it can be cached forever.
  if (urlPath.startsWith('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (/\.(woff2|webp|avif|png|jpe?g|svg|mp4)$/i.test(urlPath)) {
    return 'public, max-age=604800';
  }
  // HTML must always revalidate so a new deploy is picked up immediately.
  return 'no-cache';
}

async function loadFile(filePath, urlPath) {
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error('not a file');
  const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const compressible = COMPRESSIBLE.has(extname(filePath).toLowerCase());
  const entry = { type, etag, compressible, info, raw: null, br: null, gzip: null, urlPath };
  cache.set(urlPath, entry);
  return entry;
}

/**
 * Brotli at quality 11 is the smallest, but it needs ~800 ms for the main
 * bundle: fine as a one-off build step, terrible on the first request. Live
 * requests therefore use quality 5 (~12 ms, 1.5% bigger) while a background
 * pass upgrades every asset to quality 11 right after boot.
 */
const LIVE_BROTLI_QUALITY = 5;
const WARM_BROTLI_QUALITY = 11;

function brotli(buffer, quality) {
  return brotliCompressSync(buffer, {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: quality,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
    },
  });
}

async function rawBody(entry) {
  if (!entry.raw) entry.raw = await readFile(entry.filePath);
  return entry.raw;
}

function pickEncoding(req) {
  const accepted = String(req.headers['accept-encoding'] || '');
  if (/\bbr\b/.test(accepted)) return 'br';
  if (/\bgzip\b/.test(accepted)) return 'gzip';
  return null;
}

const server = createServer(async (req, res) => {
  const started = process.hrtime.bigint();

  // --- route -------------------------------------------------------------
  let pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  if (pathname.includes('\0')) {
    res.writeHead(400).end('Bad request');
    return;
  }

  let urlPath = normalize(pathname).replace(/\\/g, '/');
  if (!urlPath.startsWith('/')) urlPath = `/${urlPath}`;

  let filePath = join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let isAppShell = false;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('directory');
  } catch {
    // Unknown route without a file extension -> the SPA shell (hash routing).
    if (extname(urlPath) === '') {
      filePath = join(ROOT, 'index.html');
      urlPath = '/index.html';
      isAppShell = true;
    } else {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
  }

  try {
    let entry = cache.get(urlPath);
    if (entry && entry.filePath !== filePath) entry = undefined;

    if (entry && !urlPath.startsWith('/assets/')) {
      // Un-fingerprinted files (HTML, images, fonts from public/) are cached with
      // `no-cache`, so a new deploy must be visible on the very next request.
      const fresh = await stat(filePath);
      if (fresh.size !== entry.info.size || fresh.mtimeMs !== entry.info.mtimeMs) {
        cache.delete(urlPath);
        entry = undefined;
      }
    }

    if (!entry) entry = await loadFile(filePath, urlPath);
    entry.filePath = filePath;

    res.setHeader('etag', entry.etag);
    res.setHeader('cache-control', cacheHeaders(urlPath));
    res.setHeader('vary', 'Accept-Encoding');
    res.setHeader('x-content-type-options', 'nosniff');

    if (req.headers['if-none-match'] === entry.etag) {
      res.writeHead(304).end();
      return;
    }

    const encoding = entry.compressible ? pickEncoding(req) : null;

    if (!encoding) {
      res.setHeader('content-type', entry.type);
      res.setHeader('content-length', entry.info.size);
      res.writeHead(200);
      if (req.method === 'HEAD') return res.end();
      createReadStream(filePath).pipe(res);
      return;
    }

    let body;
    if (encoding === 'br') {
      if (!entry.br) entry.br = brotli(await rawBody(entry), LIVE_BROTLI_QUALITY);
      body = entry.br;
    } else {
      if (!entry.gzip) entry.gzip = gzipSync(await rawBody(entry), { level: 9 });
      body = entry.gzip;
    }

    res.setHeader('content-type', entry.type);
    res.setHeader('content-encoding', encoding);
    res.setHeader('content-length', body.length);
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : body);

    if (isAppShell) return;
  } catch (error) {
    console.error(`[serve] ${urlPath}:`, error.message);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('Internal error');
    return;
  } finally {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (process.env.LOG_REQUESTS === '1') {
      console.log(`${req.method} ${urlPath} ${ms.toFixed(1)}ms`);
    }
  }
});

/**
 * Background warm-up: precompute the best-quality compressed bodies so every
 * visit after the first seconds of uptime is served from memory.
 */
async function warmCache() {
  const started = Date.now();
  let files = 0;
  let bytes = 0;

  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!COMPRESSIBLE.has(extname(entry.name).toLowerCase())) continue;

      const urlPath = `/${full.slice(ROOT.length + 1).split(sep).join('/')}`;
      try {
        const cached = cache.get(urlPath) || (await loadFile(full, urlPath));
        cached.filePath = full;
        const buffer = await rawBody(cached);
        cached.br = brotli(buffer, WARM_BROTLI_QUALITY);
        if (!cached.gzip) cached.gzip = gzipSync(buffer, { level: 9 });
        files += 1;
        bytes += cached.br.length;
      } catch (error) {
        console.error(`[serve] warm ${urlPath}:`, error.message);
      }
    }
  };

  await walk(ROOT);
  console.log(
    `[serve] precompressed ${files} files (${(bytes / 1024).toFixed(0)} kB brotli) in ${Date.now() - started} ms`,
  );
}

server.listen(PORT, HOST, () => {
  console.log(`ModAra build served from dist/ at http://${HOST}:${PORT}`);
  // Let the first connection through before spending CPU on compression.
  setTimeout(() => {
    warmCache().catch((error) => console.error('[serve] warm-up failed:', error.message));
  }, 250);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
