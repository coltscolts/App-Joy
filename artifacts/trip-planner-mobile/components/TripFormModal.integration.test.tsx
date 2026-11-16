import React from 'react';
import { Alert } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '@workspace/api-client-react';
import { TripFormModal } from './TripFormModal';
import { ThemeProvider } from '@/contexts/ThemeContext';

const updateTrip = vi.fn();

vi.mock('@workspace/api-client-react', () => ({
  ApiError: class extends Error {},
  getGetDestinationSuggestionsQueryKey: () => ['destinations'],
  getGetTripsQueryKey: () => ['trips'],
  getGetTripQueryKey: () => ['trip'],
  getGetTripActivitiesQueryKey: () => ['activities'],
  useCreateTrip: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
  useUpdateTrip: () => ({ isPending: false, isError: false, error: null, mutate: updateTrip }),
  useGetDestinationSuggestions: () => ({ data: [], isFetching: false }),
}));

vi.mock('@/lib/queryClient', () => ({
  mobileQueryClient: { invalidateQueries: vi.fn() },
}));

function renderForm(onClose = vi.fn(), trip?: Trip) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <ThemeProvider>
        <TripFormModal visible onClose={onClose} onCreated={vi.fn()} trip={trip} />
      </ThemeProvider>,
    );
  });
  // El primer nodo con ese testID es el elemento host (los mocks de setup.ts pasan las props).
  const byTestId = (id: string): ReactTestInstance => renderer.root.findAllByProps({ testID: id })[0];
  const valueOf = (id: string): unknown => {
    const values: unknown[] = [];
    const walk = (node: ReactTestInstance | string) => {
      if (typeof node === 'string') return;
      if (typeof node.props.children === 'number') values.push(node.props.children);
      node.children.forEach(walk);
    };
    walk(byTestId(id));
    return values[0];
  };
  return { renderer, byTestId, valueOf, onClose };
}

describe('TripFormModal', () => {
  beforeEach(() => vi.mocked(Alert.alert).mockClear());

  it('changes travelers with − / + buttons and respects the minimums', () => {
    const { byTestId, valueOf } = renderForm();
    expect(valueOf('counter-adults')).toBe(1);
    expect(valueOf('counter-children')).toBe(0);

    // No se puede bajar de 1 adulto ni de 0 menores.
    expect(byTestId('counter-adults-decrease').props.disabled).toBe(true);
    expect(byTestId('counter-children-decrease').props.disabled).toBe(true);

    act(() => byTestId('counter-adults-increase').props.onPress());
    act(() => byTestId('counter-adults-increase').props.onPress());
    act(() => byTestId('counter-children-increase').props.onPress());
    expect(valueOf('counter-adults')).toBe(3);
    expect(valueOf('counter-children')).toBe(1);

    act(() => byTestId('counter-adults-decrease').props.onPress());
    expect(valueOf('counter-adults')).toBe(2);
  });

  it('closes immediately from the bottom Cancel button when nothing was entered', () => {
    const { byTestId, onClose } = renderForm();
    act(() => byTestId('button-cancel-trip').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('asks before discarding a form with changes', () => {
    const { byTestId, onClose } = renderForm();
    act(() => byTestId('counter-adults-increase').props.onPress());
    act(() => byTestId('button-cancel-trip-header').props.onPress());
    expect(onClose).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledTimes(1);

    const buttons = vi.mocked(Alert.alert).mock.calls[0][2] as { style?: string; onPress?: () => void }[];
    act(() => buttons.find((button) => button.style === 'destructive')?.onPress?.());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('edits an existing trip: prefilled, closes without asking, and saves with update', () => {
    const trip = {
      id: 9, name: 'Thanksgiving', tripType: 'single', destination: 'Mexico City, México',
      startDate: '2030-11-18', endDate: '2030-11-23', adults: 2, children: 1, stops: [],
    } as unknown as Trip;
    const { byTestId, valueOf, onClose } = renderForm(vi.fn(), trip);
    expect(valueOf('counter-adults')).toBe(2);
    expect(valueOf('counter-children')).toBe(1);

    // Sin cambios: cerrar no pregunta.
    act(() => byTestId('button-cancel-trip').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();

    act(() => byTestId('counter-adults-increase').props.onPress());
    act(() => byTestId('button-save-trip').props.onPress());
    expect(updateTrip).toHaveBeenCalledTimes(1);
    expect(updateTrip.mock.calls[0][0]).toMatchObject({
      id: 9,
      data: { name: 'Thanksgiving', tripType: 'single', destination: 'Mexico City, México', startDate: '2030-11-18', endDate: '2030-11-23', adults: 3, children: 1 },
    });
  });
});
