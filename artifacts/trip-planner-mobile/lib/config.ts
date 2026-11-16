/**
 * Configuración de la app móvil, independiente de Replit.
 *
 * Variables (se inyectan en tiempo de compilación; Expo solo expone las que
 * empiezan por EXPO_PUBLIC_ y deben leerse de forma literal):
 *   EXPO_PUBLIC_API_URL                URL completa de la API (https://api.joyplann.com)
 *   EXPO_PUBLIC_DOMAIN                 (heredada de Replit) dominio sin protocolo
 *   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY  clave pública de Clerk
 *   EXPO_PUBLIC_CLERK_PROXY_URL        opcional
 */

export const DEFAULT_DEV_API_PORT = 8080;

export type ApiUrlInputs = {
  apiUrl?: string;
  domain?: string;
  /** host:puerto del servidor de Metro en desarrollo (Constants.expoConfig.hostUri) */
  devHostUri?: string | null;
  isDev?: boolean;
};

function trimSlashes(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Devuelve la URL base de la API, o null si no hay forma de determinarla. */
export function resolveApiBaseUrl({ apiUrl, domain, devHostUri, isDev }: ApiUrlInputs): string | null {
  if (apiUrl && apiUrl.trim()) {
    const value = trimSlashes(apiUrl);
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  if (domain && domain.trim()) {
    return `https://${trimSlashes(domain).replace(/^https?:\/\//i, '')}`;
  }

  // En desarrollo, usar la misma IP del ordenador que sirve Metro, para que
  // un móvil físico en la misma red Wi-Fi llegue a la API local.
  if (isDev && devHostUri) {
    const host = devHostUri.split(':')[0];
    if (host) return `http://${host}:${DEFAULT_DEV_API_PORT}`;
  }

  return null;
}

function readDevHostUri(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default;
    return Constants?.expoConfig?.hostUri ?? null;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string | null {
  return resolveApiBaseUrl({
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    domain: process.env.EXPO_PUBLIC_DOMAIN,
    devHostUri: typeof __DEV__ !== 'undefined' && __DEV__ ? readDevHostUri() : null,
    isDev: typeof __DEV__ !== 'undefined' && __DEV__,
  });
}

export const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
export const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;
