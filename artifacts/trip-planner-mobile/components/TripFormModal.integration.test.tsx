import React from 'react';
import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripFormModal } from './TripFormModal';
import { ThemeProvider } from '@/contexts/ThemeContext';

vi.mock('@workspace/api-client-react', () => ({
  getGetDestinationSuggestionsQueryKey: () => ['destinations'],
  getGetTripsQueryKey: () => ['trips'],
  useCreateTrip: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
  useGetDestinationSuggestions: () => ({ data: [], isFetching: false }),
}));

vi.mock('@/lib/queryClient', () => ({
  mobileQueryClient: { invalidateQueries: vi.fn() },
}));

function renderForm(onClose = vi.fn()) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <ThemeProvider>
        <TripFormModal visible onClose={onClose} onCreated={vi.fn()} />
      </ThemeProvider>,
    );
  });
  const byTestId = (id: string) => renderer.root.find((node) => node.props.testID === id && typeof node.type === 'string');
  const valueOf = (id: string) => {
    const texts = byTestId(id).findAll((node) => node.type === 'Text');
    return texts.map((node) => node.props.children).find((child) => typeof child === 'number');
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
});
