import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { WifiOff } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import NativeRuntime from './native/NativeRuntime';
import Footer from './components/Footer';
import BackgroundDecor from './components/BackgroundDecor';
import TextEffects from './components/TextEffects';
import Home from './pages/Home';

const loadCartDrawer = () => import('./components/CartDrawer');
const loadAuthModal = () => import('./components/AuthModal');
const loadCheckoutModal = () => import('./components/CheckoutModal');

const CartDrawer = lazy(loadCartDrawer);
const AuthModal = lazy(loadAuthModal);
const CheckoutModal = lazy(loadCheckoutModal);
const ChatWidget = lazy(() => import('./components/ChatWidget'));
const ScrollToTop = lazy(() => import('./components/ScrollToTop'));
const FloatingSearch = lazy(() => import('./components/FloatingSearch'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const Account = lazy(() => import('./pages/Account'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));
const Invoice = lazy(() => import('./pages/Invoice'));
const Favorites = lazy(() => import('./pages/Favorites'));

type View =
  | { name: 'home' }
  | { name: 'shop'; category?: string }
  | { name: 'product'; slug: string }
  | { name: 'blog' }
  | { name: 'blog-post'; slug: string }
  | { name: 'account' }
  | { name: 'favorites' }
  | { name: 'admin' }
  | { name: 'admin-login' }
  | { name: 'payment-callback' }
  | { name: 'invoice'; orderId: string };

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * GitHub Pages serves this app from a static sub-path. Hash routes keep
 * navigation shareable without asking the server for a non-existent file.
 * The 404 fallback also converts path routes into these hashes.
 */
function viewFromHash(hash: string): View | null {
  const route = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  if (!route || route === 'home') return { name: 'home' };

  const [rawName, ...rawParams] = route.split('/');
  const name = rawName.toLowerCase();
  const param = safeDecode(rawParams.join('/'));

  if (name === 'admin') return { name: 'admin' };
  if (name === 'backoffice-login') return { name: 'admin-login' };
  if (name === 'invoice' && param) return { name: 'invoice', orderId: param };
  if (name === 'shop' || name === 'products') return { name: 'shop', category: param || undefined };
  if (name === 'product' && param) return { name: 'product', slug: param };
  if (name === 'blog-post' && param) return { name: 'blog-post', slug: param };
  if (name === 'blog') return param ? { name: 'blog-post', slug: param } : { name: 'blog' };
  if (name === 'account') return { name: 'account' };
  if (name === 'favorites' || name === 'wishlist') return { name: 'favorites' };

  return null;
}

function initialView(): View {
  if (new URLSearchParams(window.location.search).get('payment') === 'zarinpal') return { name: 'payment-callback' };
  return viewFromHash(window.location.hash) ?? { name: 'home' };
}

function RouteLoading() {
  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-7xl items-center justify-center px-4 py-24" dir="rtl">
      <div className="flex items-center gap-3 text-sm font-semibold text-dark-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-500/25 border-t-gold-600" aria-hidden="true" />
        در حال بارگذاری…
      </div>
    </div>
  );
}

function AppContent() {
  const [view, setView] = useState<View>(initialView);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartEverOpened, setCartEverOpened] = useState(false);
  const [authEverOpened, setAuthEverOpened] = useState(false);
  const [checkoutEverOpened, setCheckoutEverOpened] = useState(false);
  const [deferredUiReady, setDeferredUiReady] = useState(false);
  const [searchOpenRequestId, setSearchOpenRequestId] = useState(0);
  const [exitHintVisible, setExitHintVisible] = useState(false);
  const navigationDepthRef = useRef(0);
  const lastBackPressRef = useRef(0);
  const exitHintTimerRef = useRef<number | undefined>(undefined);
  const nativeBackHandlerRef = useRef<() => void>(() => undefined);

  const openCart = useCallback(() => {
    setCartEverOpened(true);
    setCartOpen(true);
  }, []);

  const openAuth = useCallback(() => {
    setAuthEverOpened(true);
    setAuthOpen(true);
  }, []);

  const openCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutEverOpened(true);
    setCheckoutOpen(true);
  }, []);

  const handleNavigate = (name: string, param?: string) => {
    let nextView: View;
    let routeHash = '';

    if (name === 'home') {
      nextView = { name: 'home' };
    } else if (name === 'shop') {
      nextView = { name: 'shop', category: param };
      routeHash = param ? `#shop/${encodeURIComponent(param)}` : '#shop';
    } else if (name === 'product') {
      nextView = { name: 'product', slug: param || '' };
      routeHash = `#product/${encodeURIComponent(param || '')}`;
    } else if (name === 'blog') {
      nextView = { name: 'blog' };
      routeHash = '#blog';
    } else if (name === 'blog-post') {
      nextView = { name: 'blog-post', slug: param || '' };
      routeHash = `#blog-post/${encodeURIComponent(param || '')}`;
    } else if (name === 'account') {
      nextView = { name: 'account' };
      routeHash = '#account';
    } else if (name === 'favorites') {
      nextView = { name: 'favorites' };
      routeHash = '#favorites';
    } else if (name === 'admin') {
      nextView = { name: 'admin' };
      routeHash = '#admin';
    } else if (name === 'admin-login') {
      nextView = { name: 'admin-login' };
      routeHash = '#backoffice-login';
    } else if (name === 'invoice') {
      nextView = { name: 'invoice', orderId: param || '' };
      routeHash = `#invoice/${encodeURIComponent(param || '')}`;
    } else {
      return;
    }

    const nextUrl = `${window.location.pathname}${routeHash}`;
    if (Capacitor.isNativePlatform()) {
      if (window.location.hash !== routeHash) {
        window.history.pushState({ modaraRoute: true }, '', nextUrl);
        navigationDepthRef.current += 1;
      }
    } else {
      window.history.replaceState(null, '', nextUrl);
    }
    setExitHintVisible(false);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const syncRouteFromLocation = () => setView(viewFromHash(window.location.hash) ?? { name: 'home' });
    const handlePopState = () => {
      navigationDepthRef.current = Math.max(0, navigationDepthRef.current - 1);
      syncRouteFromLocation();
    };
    const handleOpenCart = () => openCart();
    const handleOpenSearch = () => {
      if (view.name !== 'home') {
        const homeUrl = `${window.location.pathname}`;
        if (Capacitor.isNativePlatform()) {
          window.history.pushState({ modaraRoute: true }, '', homeUrl);
          navigationDepthRef.current += 1;
        } else {
          window.history.replaceState(null, '', homeUrl);
        }
        setView({ name: 'home' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setSearchOpenRequestId((requestId) => requestId + 1);
    };
    window.addEventListener('hashchange', syncRouteFromLocation);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('modara:open-cart', handleOpenCart);
    window.addEventListener('modara:open-search', handleOpenSearch);
    return () => {
      window.removeEventListener('hashchange', syncRouteFromLocation);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('modara:open-cart', handleOpenCart);
      window.removeEventListener('modara:open-search', handleOpenSearch);
    };
  }, [openCart, view.name]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let removeListener: () => void = () => {};

    const acceptPaymentLink = (rawUrl: string) => {
      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        return;
      }
      if (url.protocol !== 'com.modara.app:' || url.hostname !== 'payment-callback') return;

      const params = new URLSearchParams(url.search);
      params.set('payment', 'zarinpal');
      navigationDepthRef.current = 0;
      window.history.replaceState({ modaraPaymentCallback: true }, '', `${window.location.pathname}?${params.toString()}`);
      setView({ name: 'payment-callback' });
      void Browser.close().catch(() => undefined);
    };

    void NativeApp.addListener('appUrlOpen', ({ url }) => acceptPaymentLink(url)).then((handle) => {
      if (disposed) void handle.remove();
      else removeListener = () => { void handle.remove(); };
    });
    void NativeApp.getLaunchUrl().then((launch) => {
      if (!disposed && launch?.url) acceptPaymentLink(launch.url);
    }).catch(() => undefined);

    return () => {
      disposed = true;
      removeListener();
    };
  }, []);

  useEffect(() => {
    nativeBackHandlerRef.current = () => {
      if (checkoutOpen) { setCheckoutOpen(false); return; }
      if (authOpen) { setAuthOpen(false); return; }
      if (cartOpen) { setCartOpen(false); return; }
      if (navigationDepthRef.current > 0) { window.history.back(); return; }
      if (view.name !== 'home') {
        window.history.replaceState(null, '', window.location.pathname);
        setView({ name: 'home' });
        window.scrollTo({ top: 0 });
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 1800) {
        void NativeApp.exitApp();
        return;
      }
      lastBackPressRef.current = now;
      setExitHintVisible(true);
      if (exitHintTimerRef.current !== undefined) window.clearTimeout(exitHintTimerRef.current);
      exitHintTimerRef.current = window.setTimeout(() => setExitHintVisible(false), 1800);
    };
  }, [authOpen, cartOpen, checkoutOpen, view.name]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let removeListener: () => void = () => {};
    void NativeApp.addListener('backButton', () => nativeBackHandlerRef.current()).then((handle) => {
      if (disposed) void handle.remove();
      else removeListener = () => { void handle.remove(); };
    });
    return () => {
      disposed = true;
      removeListener();
      if (exitHintTimerRef.current !== undefined) window.clearTimeout(exitHintTimerRef.current);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    let idleId: number | undefined;
    let timer: number | undefined;
    const enableDeferredUi = () => {
      setDeferredUiReady(true);
      // Warm the interaction-only chunks after the first render is settled.
      void loadCartDrawer();
      void loadAuthModal();
      void loadCheckoutModal();
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(enableDeferredUi, { timeout: 1800 });
    } else {
      timer = window.setTimeout(enableDeferredUi, 1200);
    }

    return () => {
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const isHome = view.name === 'home';
  const isPaymentCallback = view.name === 'payment-callback';
  const isAdminLogin = view.name === 'admin-login';
  const isInvoice = view.name === 'invoice';
  const isUtilityPage = isPaymentCallback || isAdminLogin || isInvoice;
  const isAdmin = view.name === 'admin';
  const showMobileNavigation = !isUtilityPage && !isAdmin;

  return (
    <div className={`relative flex min-h-screen flex-col pt-[env(safe-area-inset-top)] ${showMobileNavigation ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
      <NativeRuntime />
      <TextEffects />
      {!isPaymentCallback && <BackgroundDecor />}
      {!isUtilityPage && <Header onNavigate={handleNavigate} onOpenCart={openCart} onOpenAuth={openAuth} />}
      <OfflineNotice />

      <main className="flex-1">
        <Suspense fallback={<RouteLoading />}>
          {view.name === 'home' && <Home onNavigate={handleNavigate} />}
          {view.name === 'shop' && <Shop onNavigate={handleNavigate} initialCategory={view.category} />}
          {view.name === 'product' && (
            <ProductDetail slug={view.slug} onNavigate={handleNavigate} onOpenAuth={openAuth} />
          )}
          {view.name === 'blog' && <Blog onNavigate={handleNavigate} />}
          {view.name === 'blog-post' && <BlogPostPage slug={view.slug} onNavigate={handleNavigate} />}
          {view.name === 'account' && <Account onNavigate={handleNavigate} />}
          {view.name === 'favorites' && <Favorites onNavigate={handleNavigate} />}
          {view.name === 'admin-login' && <AdminLogin onNavigate={handleNavigate} />}
          {view.name === 'admin' && <AdminPanel onNavigate={handleNavigate} onOpenAuth={() => handleNavigate('admin-login')} />}
          {view.name === 'payment-callback' && <PaymentCallback onNavigate={handleNavigate} />}
          {view.name === 'invoice' && <Invoice orderId={view.orderId} onNavigate={handleNavigate} />}
        </Suspense>
      </main>

      {!isUtilityPage && <Footer onNavigate={handleNavigate} />}

      {!isUtilityPage && cartEverOpened && (
        <Suspense fallback={null}>
          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={openCheckout} />
        </Suspense>
      )}

      {!isUtilityPage && authEverOpened && (
        <Suspense fallback={null}>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </Suspense>
      )}

      {!isUtilityPage && checkoutEverOpened && (
        <Suspense fallback={null}>
          <CheckoutModal
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            onOpenInvoice={(id) => handleNavigate('invoice', id)}
          />
        </Suspense>
      )}

      {deferredUiReady && !isUtilityPage && (
        <Suspense fallback={null}>
          <ChatWidget productPage={view.name === 'product'} />
          <ScrollToTop />
        </Suspense>
      )}
      {deferredUiReady && isHome && (
        <Suspense fallback={null}>
          <FloatingSearch onNavigate={handleNavigate} openRequestId={searchOpenRequestId} />
        </Suspense>
      )}
      {showMobileNavigation && (
        <BottomNavigation
          activeView={view.name}
          onNavigate={handleNavigate}
          onOpenCart={openCart}
          onOpenAuth={openAuth}
        />
      )}
      {exitHintVisible && (
        <div role="status" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#211a12]/90 px-4 py-2 text-xs font-semibold text-white shadow-xl md:hidden">
          برای خروج، دوباره بازگردید
        </div>
      )}
    </div>
  );
}

function OfflineNotice() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top)+0.5rem)] z-[60] mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-[#fff9e8] px-4 py-3 text-center text-xs font-semibold text-amber-900 shadow-lg md:top-4">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      اتصال اینترنت قطع است؛ خرید و پرداخت پس از اتصال دوباره قابل تلاش است.
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <AppContent />
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
