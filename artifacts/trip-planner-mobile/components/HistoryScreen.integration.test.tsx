import React from 'react';
import { Alert } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistoryScreen from '../app/(tabs)/history';
import { ThemeProvider } from '@/contexts/ThemeContext';

const deleteTrips = vi.fn();
const clearTrip = vi.fn();
const trips = [
  { id: 1, name: 'Cancún 2024', destination: 'Cancún', startDate: '2024-03-01', endDate: '2024-03-05' },
  { id: 2, name: 'Madrid 2025', destination: 'Madrid', startDate: '2025-06-01', endDate: '2025-06-08' },
  { id: 3, name: 'Futuro', destination: 'Tokio', startDate: '2099-01-01', endDate: '2099-01-09' },
];

vi.mock('@workspace/api-client-react', () => ({
  getGetTripsQueryKey: () => ['trips'],
  useGetTrips: () => ({ data: trips, isLoading: false, isRefetching: false, refetch: vi.fn() }),
}));
vi.mock('@/lib/tripDeletion', () => ({ deleteTripsWithReminders: (...args: unknown[]) => deleteTrips(...args) }));
vi.mock('@/contexts/TripContext', () => ({ useTripSelection: () => ({ selectTrip: vi.fn(), selectedTrip: { id: 2 }, clearTrip }) }));
vi.mock('expo-router', () => ({ router: { navigate: vi.fn() } }));

function render() {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<ThemeProvider><HistoryScreen /></ThemeProvider>);
  });
  const byTestId = (id: string): ReactTestInstance | undefined => renderer.root.findAllByProps({ testID: id })[0];
  return { renderer, byTestId };
}

describe('History screen deletion', () => {
  beforeEach(() => {
    vi.mocked(Alert.alert).mockClear();
    deleteTrips.mockReset();
    clearTrip.mockReset();
  });

  it('shows only past trips and deletes several selected ones after confirming', async () => {
    deleteTrips.mockResolvedValue({ deletedIds: [1, 2], failed: [] });
    const { byTestId } = render();
    expect(byTestId('history-trip-1')).toBeDefined();
    expect(byTestId('history-trip-3')).toBeUndefined();

    act(() => byTestId('history-select-toggle')!.props.onPress());
    expect(byTestId('history-delete-selected')!.props.disabled).toBe(true);

    act(() => byTestId('history-trip-1')!.props.onPress());
    expect(byTestId('history-delete-selected')!.props.disabled).toBe(false);
    act(() => byTestId('history-select-all')!.props.onPress());

    act(() => byTestId('history-delete-selected')!.props.onPress());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const buttons = vi.mocked(Alert.alert).mock.calls[0][2] as { style?: string; onPress?: () => void }[];
    await act(async () => { buttons.find((button) => button.style === 'destructive')?.onPress?.(); });

    expect(deleteTrips).toHaveBeenCalledTimes(1);
    expect((deleteTrips.mock.calls[0][0] as { id: number }[]).map((trip) => trip.id).sort()).toEqual([1, 2]);
    // El viaje abierto (id 2) se deselecciona.
    expect(clearTrip).toHaveBeenCalled();
  });

  it('does not delete anything if the confirmation is cancelled', () => {
    const { byTestId } = render();
    act(() => byTestId('history-select-toggle')!.props.onPress());
    act(() => byTestId('history-trip-2')!.props.onPress());
    act(() => byTestId('history-delete-selected')!.props.onPress());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(deleteTrips).not.toHaveBeenCalled();
  });
});
