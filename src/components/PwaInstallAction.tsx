import { useEffect, useState } from 'react';
import { Download, Plus, Share, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function PwaInstallAction() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const appleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setInstalled(standalone);
    setIsIos(appleMobile);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowGuide(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setShowGuide(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === 'accepted') setInstalled(true);
    } catch {
      setShowGuide(true);
    }
  };

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => { void install(); }}
        aria-haspopup="dialog"
        aria-expanded={showGuide}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-right text-sm font-semibold text-dark-800 transition-colors hover:bg-amber-50 active:bg-amber-100"
      >
        <Download className="h-5 w-5 text-gold-700" aria-hidden="true" />
        نصب اپ مُدارا روی گوشی
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-dark-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" dir="rtl">
          <button
            type="button"
            aria-label="بستن راهنمای نصب"
            onClick={() => setShowGuide(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="relative z-10 w-full max-w-md rounded-t-[1.75rem] bg-[#fffdf9] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Download className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="pwa-install-title" className="text-lg font-bold text-dark-900">نصب اپ مُدارا</h2>
                  <p className="mt-1 text-sm text-dark-500">دسترسی سریع از صفحهٔ اصلی گوشی</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="بستن"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dark-500 hover:bg-dark-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isIos ? (
              <ol className="space-y-4 text-sm leading-7 text-dark-700">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">۱</span>
                  <span>این صفحه را در مرورگر <strong>Safari</strong> باز کنید.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">۲</span>
                  <span className="flex items-center gap-1">دکمهٔ اشتراک‌گذاری <Share className="inline h-4 w-4" aria-hidden="true" /> را بزنید و «افزودن به صفحهٔ اصلی» را انتخاب کنید.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">۳</span>
                  <span>در پایان، «افزودن» را لمس کنید.</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-4 text-sm leading-7 text-dark-700">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">۱</span>
                  <span>در Chrome، منوی سه‌نقطهٔ بالای صفحه را باز کنید.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">۲</span>
                  <span>«نصب برنامه» یا «افزودن به صفحهٔ اصلی» را انتخاب و تأیید کنید.</span>
                </li>
              </ol>
            )}

            <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              پس از نصب، مُدارا مثل یک اپ از صفحهٔ اصلی گوشی باز می‌شود.
            </div>
          </section>
        </div>
      )}
    </>
  );
}
