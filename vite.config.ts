import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { rackFirstLookUrl } from './src/lib/rackFirstLook';
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
  /** Preloaded with the same base the bundle uses, so the hero's LCP image starts
   *  downloading with the document instead of after the catalogue round-trip. */
  // The query string matters: a preload for a URL the page then requests without
  // (or with a different one) downloads the 74-108 kB artwork twice.
  const firstLookPreload = `<link rel="preload" as="image" fetchpriority="high" href="${buildBase}${rackFirstLookUrl.replace(/^\//, '')}" />`;
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
    transformIndexHtml(html: string) {
      const withMeta = html.replaceAll('__SITE_URL__', siteUrl);
      return withMeta.includes('</title>')
        ? withMeta.replace('</title>', `</title>\n    ${firstLookPreload}`)
        : `${firstLookPreload}${withMeta}`;
    },
  };

  return {
    // The dev server always runs at "/", while the production build defaults to
    // "/Modara/" because GitHub Pages serves this repository under that sub path.
    // Build with BASE_PATH=/ when deploying to a custom domain or root host.
    base: buildBase,
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
