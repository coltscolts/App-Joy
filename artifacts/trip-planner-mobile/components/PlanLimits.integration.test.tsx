import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripFormModal } from './TripFormModal';
import { PaywallModal } from './PaywallModal';
import { paywallReasonFromCode } from '@/contexts/PlanContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const openPaywall = vi.fn();
let isLimited = true;

vi.mock('@/contexts/PlanContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/PlanContext')>();
  return {
    ...actual,
    usePlan: () => ({ isLimited, plan: { limits: { activeTrips: 1, scans: 2, ideas: 3, stops: 2 } }, openPaywall, refetchPlan: vi.fn() }),
  };
});
vi.mock('@workspace/api-client-react', () => ({
  ApiError: class extends Error {},
  getGetDestinationSuggestionsQueryKey: () => ['destinations'],
  getGetTripsQueryKey: () => ['trips'],
  getGetTripQueryKey: () => ['trip'],
  getGetTripActivitiesQueryKey: () => ['activities'],
  getGetMyPlanQueryKey: () => ['plan'],
  useGetMyPlan: () => ({ data: undefined, refetch: vi.fn() }),
  refreshMyPlan: vi.fn(),
  useCreateTrip: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
  useUpdateTrip: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }),
  useGetDestinationSuggestions: () => ({ data: [], isFetching: false }),
}));
vi.mock('@/lib/queryClient', () => ({ mobileQueryClient: { invalidateQueries: vi.fn() } }));

function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<ThemeProvider>{element}</ThemeProvider>);
  });
  const byTestId = (id: string): ReactTestInstance | undefined => renderer.root.findAllByProps({ testID: id })[0];
  return { renderer, byTestId };
}

const stopBlocks = (renderer: ReactTestRenderer) =>
  renderer.root.findAll((node: ReactTestInstance) => typeof node.props.testID === 'string' && /^input-stop-destination-/.test(node.props.testID) && typeof node.type === 'string');

describe('plan limits in the app', () => {
  beforeEach(() => {
    openPaywall.mockReset();
    isLimited = true;
  });

  it('maps server limit codes to paywall reasons', () => {
    expect(paywallReasonFromCode('LIMIT_TRIPS')).toBe('trips');
    expect(paywallReasonFromCode('LIMIT_STOPS')).toBe('stops');
    expect(paywallReasonFromCode('LIMIT_SCANS')).toBe('scans');
    expect(paywallReasonFromCode('LIMIT_IDEAS')).toBe('ideas');
    expect(paywallReasonFromCode('OTHER')).toBeNull();
  });

  it('free plan: a third destination opens the paywall instead of adding a stop', () => {
    const { byTestId } = render(<TripFormModal visible onClose={vi.fn()} onCreated={vi.fn()} />);
    act(() => byTestId('button-trip-type-multi')!.props.onPress());
    act(() => byTestId('button-add-stop')!.props.onPress());
    expect(openPaywall).toHaveBeenCalledWith('stops');
  });

  it('Pro: adding a destination works normally', () => {
    isLimited = false;
    const { byTestId } = render(<TripFormModal visible onClose={vi.fn()} onCreated={vi.fn()} />);
    act(() => byTestId('button-trip-type-multi')!.props.onPress());
    act(() => byTestId('button-add-stop')!.props.onPress());
    expect(openPaywall).not.toHaveBeenCalled();
  });

  it('paywall says subscriptions are coming soon when purchases are not configured', async () => {
    const { byTestId } = render(<PaywallModal visible reason="stops" plan={undefined} onClose={vi.fn()} onUpgraded={vi.fn()} />);
    await act(async () => { await Promise.resolve(); });
    expect(byTestId('paywall-unavailable')).toBeDefined();
  });
});
