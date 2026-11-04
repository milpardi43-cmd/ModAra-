import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import BackgroundDecor from './components/BackgroundDecor';
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

type View =
  | { name: 'home' }
  | { name: 'shop'; category?: string }
  | { name: 'product'; slug: string }
  | { name: 'blog' }
  | { name: 'blog-post'; slug: string }
  | { name: 'account' }
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

    window.history.replaceState(null, '', `${window.location.pathname}${routeHash}`);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash(window.location.hash) ?? { name: 'home' });
    const handleOpenCart = () => openCart();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('modara:open-cart', handleOpenCart);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('modara:open-cart', handleOpenCart);
    };
  }, [openCart]);

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

  return (
    <div className="relative min-h-screen flex flex-col">
      {!isPaymentCallback && <BackgroundDecor />}
      {!isUtilityPage && <Header onNavigate={handleNavigate} />}

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
          <ChatWidget />
          <ScrollToTop />
        </Suspense>
      )}
      {deferredUiReady && isHome && (
        <Suspense fallback={null}>
          <FloatingSearch onNavigate={handleNavigate} />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
