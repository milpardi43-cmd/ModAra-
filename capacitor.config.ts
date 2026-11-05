import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.modara.app',
  appName: 'MODARA',
  webDir: 'dist',
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
      style: 'LIGHT',
      autoBackdropColor: 'auto',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      launchFadeOutDuration: 250,
      backgroundColor: '#efeae1',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#efeae1',
    },
  },
};

export default config;
