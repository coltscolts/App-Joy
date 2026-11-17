import { and, eq, gte, sql } from "drizzle-orm";
import { aiUsage, db, trips } from "@workspace/db";
import { logger } from "./lib/logger";

/**
 * Plan del usuario (gratis / Pro) y límites del plan gratuito.
 *
 * - Pro se consulta a RevenueCat (app_user_id = id de Clerk) y se cachea.
 * - Los límites solo se aplican cuando los cobros están configurados
 *   (REVENUECAT_SECRET_API_KEY); así nadie queda bloqueado sin poder pagar.
 */

export const FREE_LIMITS = { activeTrips: 1, scans: 2, ideas: 3, stops: 2 } as const;
/**
 * Sin cobros activados (lanzamiento gratuito) todo es ilimitado salvo un tope
 * de uso justo al mes, para evitar abusos y costes de IA descontrolados.
 */
export const FAIR_USE_LIMITS = { scans: 60, ideas: 150 } as const;
export type UsageKind = "scans" | "ideas";

const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || "pro";
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { isPro: boolean; expiresAt: string | null; at: number }>();

export function isBillingEnabled(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_API_KEY);
}

type ProStatus = { isPro: boolean; expiresAt: string | null };
type Resolver = (userId: string) => Promise<ProStatus>;

async function fetchFromRevenueCat(userId: string): Promise<ProStatus> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_API_KEY}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`RevenueCat ${response.status}`);
  const body = (await response.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
  };
  const entitlement = body.subscriber?.entitlements?.[ENTITLEMENT_ID];
  if (!entitlement) return { isPro: false, expiresAt: null };
  const active = entitlement.expires_date === null || new Date(entitlement.expires_date).getTime() > Date.now();
  return { isPro: active, expiresAt: entitlement.expires_date };
}

let resolver: Resolver = fetchFromRevenueCat;
/** Solo para pruebas. */
export function setProStatusResolver(next: Resolver | null) {
  resolver = next ?? fetchFromRevenueCat;
  cache.clear();
}

export function invalidateProStatus(userId: string) {
  cache.delete(userId);
}

export async function getProStatus(userId: string): Promise<ProStatus> {
  if (!isBillingEnabled()) return { isPro: false, expiresAt: null };
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;
  try {
    const status = await resolver(userId);
    cache.set(userId, { ...status, at: Date.now() });
    return status;
  } catch (err) {
    // Si RevenueCat no responde, no castigamos a quien quizá ya pagó.
    logger.warn({ err }, "Could not verify Pro status; allowing access");
    return { isPro: true, expiresAt: null };
  }
}

export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** Hoy en UTC menos un día, para no penalizar diferencias de zona horaria. */
function activeSinceDate(now = new Date()): string {
  return new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
}

export async function getUsage(userId: string) {
  const [row] = await db.select().from(aiUsage).where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, currentMonth())));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trips)
    .where(and(eq(trips.ownerId, userId), gte(trips.endDate, activeSinceDate())));
  return { scans: row?.scans ?? 0, ideas: row?.ideas ?? 0, activeTrips: count };
}

export async function incrementUsage(userId: string, kind: UsageKind) {
  const month = currentMonth();
  await db
    .insert(aiUsage)
    .values({ userId, month, [kind]: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.month],
      set: { [kind]: sql`${aiUsage[kind]} + 1`, updatedAt: sql`now()` },
    });
}

export type LimitCheck = { allowed: true } | { allowed: false; code: string; limit: number };

/** ¿Puede el usuario usar esta función ahora? */
export async function checkLimit(userId: string, kind: UsageKind | "activeTrips"): Promise<LimitCheck> {
  if (!isBillingEnabled()) {
    if (kind === "activeTrips") return { allowed: true };
    const usage = await getUsage(userId);
    const limit = FAIR_USE_LIMITS[kind];
    return usage[kind] < limit ? { allowed: true } : { allowed: false, code: "FAIR_USE", limit };
  }
  const { isPro } = await getProStatus(userId);
  if (isPro) return { allowed: true };
  const usage = await getUsage(userId);
  const limit: number = FREE_LIMITS[kind];
  if (usage[kind] < limit) return { allowed: true };
  const code = kind === "activeTrips" ? "LIMIT_TRIPS" : kind === "scans" ? "LIMIT_SCANS" : "LIMIT_IDEAS";
  return { allowed: false, code, limit };
}

/** Viajes multidestino: el plan gratuito admite hasta FREE_LIMITS.stops destinos. */
export async function checkStopsLimit(userId: string, stopsCount: number): Promise<LimitCheck> {
  if (!isBillingEnabled() || stopsCount <= FREE_LIMITS.stops) return { allowed: true };
  const { isPro } = await getProStatus(userId);
  return isPro ? { allowed: true } : { allowed: false, code: "LIMIT_STOPS", limit: FREE_LIMITS.stops };
}

export async function getPlan(userId: string) {
  const enabled = isBillingEnabled();
  const [status, usage] = await Promise.all([getProStatus(userId), getUsage(userId)]);
  return {
    billingEnabled: enabled,
    isPro: status.isPro,
    expiresAt: status.expiresAt,
    limits: FREE_LIMITS,
    usage,
  };
}
