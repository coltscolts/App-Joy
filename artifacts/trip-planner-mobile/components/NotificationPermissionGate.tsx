import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/expo';
import { t } from '@/lib/i18n';
import {
  getNotificationPermissionState,
  NOTIFICATION_PERMISSION_PROMPT_KEY,
  requestReminderPermission,
} from '@/lib/reminders';

async function rememberPromptDecision() {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_PROMPT_KEY, '1');
  } catch {
    // A storage failure should not prevent the operating-system prompt.
  }
}

export function NotificationPermissionGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const promptShown = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !isLoaded || !isSignedIn || promptShown.current) return;

    let cancelled = false;
    void (async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_PROMPT_KEY);
        if (cancelled || alreadyAsked === '1') return;

        const permission = await getNotificationPermissionState();
        if (cancelled || permission.granted || !permission.canAskAgain) return;

        promptShown.current = true;
        Alert.alert(
          t('notifications_first_launch_title'),
          t('notifications_first_launch_body'),
          [
            {
              text: t('notifications_first_launch_later'),
              style: 'cancel',
              onPress: () => void rememberPromptDecision(),
            },
            {
              text: t('notifications_first_launch_enable'),
              onPress: () => {
                void (async () => {
                  await rememberPromptDecision();
                  const result = await requestReminderPermission();
                  if (!result.granted && result.message) {
                    Alert.alert(t('notifications_permission_title'), result.message);
                  }
                })();
              },
            },
          ],
        );
      } catch {
        // Permission prompts are helpful but must never block app startup.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return null;
}