import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getGetMyPlanQueryKey, useGetMyPlan, type PlanStatus } from '@workspace/api-client-react';
import { PaywallModal } from '@/components/PaywallModal';
import { setupPurchases } from '@/lib/purchases';

export type PaywallReason = 'trips' | 'stops' | 'scans' | 'ideas' | 'map' | 'settings';

type PlanContextValue = {
  plan: PlanStatus | undefined;
  /** Hay cobros configurados y el usuario no es Pro: aplican los límites. */
  isLimited: boolean;
  openPaywall: (reason: PaywallReason) => void;
  refetchPlan: () => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

/** Códigos 402 del servidor → motivo del paywall. */
export function paywallReasonFromCode(code: unknown): PaywallReason | null {
  switch (code) {
    case 'LIMIT_TRIPS': return 'trips';
    case 'LIMIT_STOPS': return 'stops';
    case 'LIMIT_SCANS': return 'scans';
    case 'LIMIT_IDEAS': return 'ideas';
    default: return null;
  }
}

export function PlanProvider({ userId, children }: { userId: string | null | undefined; children: ReactNode }) {
  const planQuery = useGetMyPlan({ query: { queryKey: getGetMyPlanQueryKey(), enabled: Boolean(userId), staleTime: 60_000 } });
  const [reason, setReason] = useState<PaywallReason | null>(null);

  useEffect(() => {
    if (userId) void setupPurchases(userId);
  }, [userId]);

  const openPaywall = useCallback((next: PaywallReason) => setReason(next), []);
  const refetchPlan = useCallback(() => { void planQuery.refetch(); }, [planQuery]);

  const value = useMemo<PlanContextValue>(() => ({
    plan: planQuery.data,
    isLimited: Boolean(planQuery.data?.billingEnabled && !planQuery.data?.isPro),
    openPaywall,
    refetchPlan,
  }), [planQuery.data, openPaywall, refetchPlan]);

  return (
    <PlanContext.Provider value={value}>
      {children}
      <PaywallModal
        visible={reason !== null}
        reason={reason ?? 'settings'}
        plan={planQuery.data}
        onClose={() => setReason(null)}
        onUpgraded={() => {
          setReason(null);
          void planQuery.refetch();
        }}
      />
    </PlanContext.Provider>
  );
}

/** Puede devolver null fuera del proveedor (p. ej. en pruebas). */
export function usePlan(): PlanContextValue | null {
  return useContext(PlanContext);
}
