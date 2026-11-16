import { Platform } from 'react-native';

/**
 * Compras dentro de la app (Apple / Google) mediante RevenueCat.
 * app_user_id = id de Clerk, igual que en el servidor (artifacts/api-server/src/billing.ts).
 * Sin clave configurada (o en web) todo queda desactivado sin errores.
 */

type PurchasesModule = typeof import('react-native-purchases').default;
export type PurchasesPackage = import('react-native-purchases').PurchasesPackage;

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
}) || '';

let configuredFor: string | null = null;

function getModule(): PurchasesModule | null {
  if (!apiKey || Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-purchases').default as PurchasesModule;
  } catch {
    return null;
  }
}

export function isPurchasesAvailable(): boolean {
  return getModule() !== null;
}

/** Configura RevenueCat para este usuario (idempotente). */
export async function setupPurchases(userId: string): Promise<void> {
  const Purchases = getModule();
  if (!Purchases || configuredFor === userId) return;
  try {
    if (configuredFor === null) {
      Purchases.configure({ apiKey, appUserID: userId });
    } else {
      await Purchases.logIn(userId);
    }
    configuredFor = userId;
  } catch (error) {
    console.warn('[purchases] setup failed', error);
  }
}

export async function resetPurchasesUser(): Promise<void> {
  const Purchases = getModule();
  if (!Purchases || configuredFor === null) return;
  try {
    await Purchases.logOut();
  } catch {
    // Usuario anónimo ya: nada que hacer.
  }
}

/** Paquetes de la oferta actual (mensual, anual…), con precios locales de la tienda. */
export async function getPackages(): Promise<PurchasesPackage[]> {
  const Purchases = getModule();
  if (!Purchases) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export type PurchaseResult = 'purchased' | 'cancelled';

export async function buyPackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const Purchases = getModule();
  if (!Purchases) throw new Error('Purchases not available');
  try {
    await Purchases.purchasePackage(pkg);
    return 'purchased';
  } catch (error) {
    if ((error as { userCancelled?: boolean })?.userCancelled) return 'cancelled';
    throw error;
  }
}

/** Devuelve true si tras restaurar hay alguna suscripción activa. */
export async function restorePurchases(): Promise<boolean> {
  const Purchases = getModule();
  if (!Purchases) return false;
  const info = await Purchases.restorePurchases();
  return Object.keys(info.entitlements.active).length > 0;
}

export const MANAGE_SUBSCRIPTIONS_URL = Platform.OS === 'android'
  ? 'https://play.google.com/store/account/subscriptions'
  : 'https://apps.apple.com/account/subscriptions';
