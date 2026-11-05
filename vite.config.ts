import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
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
  const appBase = command === 'build' ? process.env.BASE_PATH ?? '/Modara/' : '/';
  const buildBase = appBase;
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
      return html.replaceAll('__SITE_URL__', siteUrl);
    },
  };

  return {
    // The dev server always runs at "/", while the production build defaults to
    // "/Modara/" because GitHub Pages serves this repository under that sub path.
    // Build with BASE_PATH=/ when deploying to a custom domain or root host.
    base: appBase,
    plugins: [
      backendBoundary,
      siteMeta,
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: appBase,
          name: 'مُدارا | فروشگاه آنلاین مد و فشن',
          short_name: 'مُدارا',
          description: 'فروشگاه آنلاین مُدارا؛ خرید لباس، اکسسوری، عینک و ساعت.',
          lang: 'fa',
          dir: 'rtl',
          start_url: appBase,
          scope: appBase,
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          theme_color: '#efeae1',
          background_color: '#efeae1',
          categories: ['shopping', 'lifestyle'],
          icons: [
            { src: `${appBase}pwa-192x192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: `${appBase}pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: `${appBase}pwa-maskable-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'فروشگاه مُدارا', short_name: 'فروشگاه', url: `${appBase}#shop` },
            { name: 'علاقه‌مندی‌های من', short_name: 'علاقه‌مندی‌ها', url: `${appBase}#favorites` },
          ],
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/.netlify(?:\/|$)/],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.includes('/images/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'modara-public-images-v1',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
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
