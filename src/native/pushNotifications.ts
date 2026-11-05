import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

export type PushSetupStatus =
  | 'not-native'
  | 'not-configured'
  | 'permission-denied'
  | 'registration-requested'
  | 'registration-failed'
  | 'token-saved'
  | 'token-save-failed'
  | 'needs-auth';

let listenersReady = false;

/** Request permission only after an explicit user action and only when a secure token endpoint exists. */
export async function requestPushRegistration(onStatus: (status: PushSetupStatus) => void) {
  if (!Capacitor.isNativePlatform()) return 'not-native' as const;

  const endpoint = import.meta.env.VITE_PUSH_TOKEN_ENDPOINT as string | undefined;
  if (!endpoint) return 'not-configured' as const;

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return 'not-configured' as const;
  }
  if (endpointUrl.protocol !== 'https:' && endpointUrl.hostname !== 'localhost') return 'not-configured' as const;

  try {
    const current = await PushNotifications.checkPermissions();
    const permission = current.receive === 'granted' ? current : await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return 'permission-denied' as const;

    if (!listenersReady) {
      await PushNotifications.addListener('registration', async ({ value }) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            onStatus('needs-auth');
            return;
          }
          const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: value, platform: Capacitor.getPlatform() }),
          });
          onStatus(response.ok ? 'token-saved' : 'token-save-failed');
        } catch {
          onStatus('token-save-failed');
        }
      });
      await PushNotifications.addListener('registrationError', () => onStatus('registration-failed'));
      listenersReady = true;
    }

    await PushNotifications.register();
    return 'registration-requested' as const;
  } catch {
    return 'registration-failed' as const;
  }
}
