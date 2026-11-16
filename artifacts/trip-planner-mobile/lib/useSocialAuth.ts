import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { useSSO } from '@clerk/expo';
import { useSignInWithApple } from '@clerk/expo/apple';

export type SocialProvider = 'apple' | 'google';

type MaybeSignUp = { status?: string | null; missingFields?: string[] } | null | undefined;

/** Si Clerk dejó el registro a medias, qué datos faltan (p. ej. username, phone_number). */
export function missingFieldsMessage(signUp: MaybeSignUp): string | null {
  if (!signUp || signUp.status !== 'missing_requirements') return null;
  const fields = signUp.missingFields ?? [];
  return fields.length ? fields.join(', ') : 'missing_requirements';
}

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
        const { createdSessionId, setActive, signUp } = await startAppleAuthenticationFlow();
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId, navigate: () => router.replace('/(tabs)') });
          return;
        }
        // Sin sesión: o canceló (silencio) o Clerk exige datos que Apple no da.
        const missing = missingFieldsMessage(signUp as MaybeSignUp);
        if (missing) setMessage(`${messages.extraStep(label)} (${missing})`);
        return;
      }
      const result = await startSSOFlow({
        strategy: provider === 'apple' ? 'oauth_apple' : 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId, navigate: () => router.replace('/(tabs)') });
      } else if (result.authSessionResult?.type === 'success') {
        const missing = missingFieldsMessage(result.signUp as MaybeSignUp);
        setMessage(missing ? `${messages.extraStep(label)} (${missing})` : messages.extraStep(label));
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
