import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { useSSO } from '@clerk/expo';
import { useSignInWithApple } from '@clerk/expo/apple';

export type SocialProvider = 'apple' | 'google';

function describeError(error: unknown): string | null {
  const clerkErrors = (error as { errors?: { longMessage?: string; message?: string }[] })?.errors;
  const first = clerkErrors?.[0];
  return first?.longMessage ?? first?.message ?? (error instanceof Error ? error.message : null);
}

/**
 * Inicio de sesión con Apple o Google.
 * - Apple en iOS: hoja nativa de Apple (Face ID, muestra «JoyPlann», sin navegador).
 * - Google, y Apple fuera de iOS: flujo web de Clerk.
 * Cerrar la ventana no se considera un error.
 */
export function useSocialAuth(messages: { failed: (provider: string) => string; extraStep: (provider: string) => string }) {
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const start = useCallback(async (provider: SocialProvider) => {
    const label = provider === 'apple' ? 'Apple' : 'Google';
    setMessage(null);
    setPending(provider);
    try {
      if (provider === 'apple' && Platform.OS === 'ios') {
        const { createdSessionId, setActive } = await startAppleAuthenticationFlow();
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId, navigate: () => router.replace('/(tabs)') });
        }
        return; // sin sesión = la persona canceló
      }
      const result = await startSSOFlow({
        strategy: provider === 'apple' ? 'oauth_apple' : 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId, navigate: () => router.replace('/(tabs)') });
      } else if (result.authSessionResult?.type === 'success') {
        setMessage(messages.extraStep(label));
      }
    } catch (error) {
      console.warn(`[auth] ${label} sign-in failed`, error);
      const detail = describeError(error);
      setMessage(detail ? `${messages.failed(label)} (${detail})` : messages.failed(label));
    } finally {
      setPending(null);
    }
  }, [messages, startAppleAuthenticationFlow, startSSOFlow]);

  return { start, pending, message, setMessage };
}
