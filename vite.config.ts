import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const supabaseStub = fileURLToPath(new URL('./src/lib/supabaseJsStub.ts', import.meta.url));
const localBackendStub = fileURLToPath(
  new URL('./src/lib/localBackendStub.ts', import.meta.url),
);

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hasSupabaseCredentials = Boolean(
    (env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      (env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
  );

  /**
   * The app has two mutually exclusive backend implementations. Keeping the
   * unused one out of the graph saves the Supabase SDK in demo builds and the
   * local seed/backend in credentialed production builds.
   */
  const backendBoundary = {
    name: 'modara-backend-boundary',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (!hasSupabaseCredentials && source === '@supabase/supabase-js') {
        return supabaseStub;
      }
      if (
        hasSupabaseCredentials &&
        source === './localBackend' &&
        importer?.includes('/src/lib/supabase.ts')
      ) {
        return localBackendStub;
      }
      return null;
    },
  };

  /**
   * Absolute origin used by the canonical/Open Graph tags in index.html.
   * Netlify exports URL (primary site) and DEPLOY_PRIME_URL (this deploy,
   * including Deploy Previews) to the build, so shared links never point at
   * someone else's domain; local builds fall back to the dev server.
   */
  const buildBase = command === 'build' ? process.env.BASE_PATH ?? '/Modara/' : '/';
  const siteUrl = (
    env.SITE_URL ||
    process.env.SITE_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    (command === 'build'
      ? buildBase === '/'
        ? '' // manual/offline build: leave root-relative tags until SITE_URL is set
        : 'https://milanorezaee2.github.io/Modara'
      : 'http://localhost:5173')
  ).replace(/\/+$/, '');

  const siteMeta = {
    name: 'modara-site-meta',
    /**
     * Fills the canonical/OG placeholders and — because the fonts are now
     * self-hosted and therefore fingerprinted at build time — injects a
     * preload for the one woff2 that carries the Persian glyphs. Without it the
     * browser only discovers the font after parsing the CSS, which shows a
     * flash of fallback text on every first visit.
     */
    transformIndexHtml(html: string, ctx?: { bundle?: Record<string, unknown> }) {
      const rendered = html.replaceAll('__SITE_URL__', siteUrl);
      const bundle = ctx?.bundle;
      if (!bundle) return rendered;

      const base = command === 'build' ? process.env.BASE_PATH ?? '/Modara/' : '/';
      const normalizeBase = base.endsWith('/') ? base : `${base}/`;

      const arabicFont = Object.keys(bundle).find(
        (file) => file.includes('beiruti') && file.includes('arabic') && file.endsWith('.woff2'),
      );
      if (!arabicFont) return rendered;

      const preload = `    <link rel="preload" href="${normalizeBase}${arabicFont}" as="font" type="font/woff2" crossorigin />\n`;
      return rendered.replace('</head>', `${preload}  </head>`);
    },
  };

  return {
    // The dev server always runs at "/", while the production build defaults to
    // "/Modara/" because GitHub Pages serves this repository under that sub path.
    // Build with BASE_PATH=/ when deploying to a custom domain or root host.
    base: command === 'build' ? process.env.BASE_PATH ?? '/Modara/' : '/',
    plugins: [backendBoundary, siteMeta, react()],
    optimizeDeps: {
      // Pre-bundling Lucide is essential in dev: otherwise the browser walks
      // its ESM barrel file and requests well over a thousand icon modules.
      include: ['lucide-react'],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      modulePreload: { polyfill: false },
      reportCompressedSize: false,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // allow the sandbox/preview proxy hosts (e2b, ngrok-style tunnels, LAN)
      allowedHosts: true,
      hmr: { clientPort: 443 },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
      allowedHosts: true,
    },
  };
});
