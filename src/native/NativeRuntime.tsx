import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Applies native-only system chrome while leaving the regular website untouched. */
export default function NativeRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add('capacitor-native');
    void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
    void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    void StatusBar.setBackgroundColor({ color: '#efeae1' }).catch(() => undefined);
    void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => undefined);

    let disposed = false;
    let showHandle: { remove: () => Promise<void> } | undefined;
    let hideHandle: { remove: () => Promise<void> } | undefined;
    void Keyboard.addListener('keyboardDidShow', () => document.documentElement.classList.add('keyboard-open'))
      .then((handle) => { if (disposed) void handle.remove(); else showHandle = handle; });
    void Keyboard.addListener('keyboardDidHide', () => document.documentElement.classList.remove('keyboard-open'))
      .then((handle) => { if (disposed) void handle.remove(); else hideHandle = handle; });

    const frame = window.requestAnimationFrame(() => {
      void SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
    });

    return () => {
      disposed = true;
      document.documentElement.classList.remove('capacitor-native', 'keyboard-open');
      window.cancelAnimationFrame(frame);
      void showHandle?.remove();
      void hideHandle?.remove();
    };
  }, []);

  return null;
}
