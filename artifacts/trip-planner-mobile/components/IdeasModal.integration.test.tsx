import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { Trip } from '@workspace/api-client-react';
import { IdeasModal, tripDays } from './IdeasModal';
import { ThemeProvider } from '@/contexts/ThemeContext';

const getSuggestions = vi.fn();
const createActivity = vi.fn();

vi.mock('@workspace/api-client-react', () => ({
  ApiError: class extends Error {},
  getDestinationForDate: (_date: string, trip: Trip) => trip.destination,
  getGetTripActivitiesQueryKey: () => ['activities'],
  useGetSuggestions: () => ({ isPending: false, mutateAsync: getSuggestions }),
  useCreateActivity: () => ({ mutateAsync: createActivity }),
}));
vi.mock('@/lib/queryClient', () => ({ mobileQueryClient: { invalidateQueries: vi.fn() } }));
vi.mock('@/contexts/PlanContext', () => ({ usePlan: () => null, paywallReasonFromCode: () => null }));

const trip = {
  id: 7, name: 'Madrid', destination: 'Madrid, España', startDate: '2030-05-01', endDate: '2030-05-03',
  adults: 2, children: 0, tripType: 'single', stops: [],
} as unknown as Trip;

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

function render() {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<ThemeProvider><IdeasModal trip={trip} visible onClose={vi.fn()} /></ThemeProvider>);
  });
  const byTestId = (id: string): ReactTestInstance => renderer.root.findAllByProps({ testID: id })[0];
  const texts = () => renderer.root.findAll((node: ReactTestInstance) => node.type === 'Text' && typeof node.props.children === 'string')
    .map((node: ReactTestInstance) => node.props.children as string);
  return { renderer, byTestId, texts };
}

describe('IdeasModal', () => {
  it('lists every day of the trip', () => {
    expect(tripDays('2030-05-30', '2030-06-02')).toEqual(['2030-05-30', '2030-05-31', '2030-06-01', '2030-06-02']);
  });

  it('asks for tastes, requests mixed ideas and adds one to the chosen day', async () => {
    getSuggestions.mockResolvedValue([
      { title: 'Mercado de San Miguel', category: 'restaurant', description: 'Tapas', location: 'Centro', estimatedTime: '2 h', kidFriendly: true, budget: 'medium' },
      { title: 'Museo del Prado', category: 'cultural', description: 'Arte', location: 'Paseo del Prado', estimatedTime: '3 h', kidFriendly: false, budget: 'medium' },
    ]);
    createActivity.mockResolvedValue({ id: 1 });
    const { byTestId, texts, renderer } = render();
    await flush();

    // Sin gustos elegidos no se pide nada.
    await act(async () => byTestId('ideas-generate').props.onPress());
    expect(getSuggestions).not.toHaveBeenCalled();

    act(() => byTestId('taste-taste_food').props.onPress());
    await act(async () => byTestId('ideas-generate').props.onPress());
    await flush();

    const request = getSuggestions.mock.calls[0][0].data;
    expect(request).toMatchObject({ category: 'any', destination: 'Madrid, España', date: '2030-05-01', adults: 2 });
    expect(request.interests).toHaveLength(1);
    expect(texts()).toContain('Mercado de San Miguel');

    const addButtons = renderer.root.findAll((node: ReactTestInstance) => node.props.accessibilityRole === 'button' && node.props.disabled === false && typeof node.props.onPress === 'function' && !node.props.testID);
    await act(async () => addButtons[0].props.onPress());
    await flush();
    expect(createActivity).toHaveBeenCalledTimes(1);
    expect(createActivity.mock.calls[0][0].data).toMatchObject({ tripId: 7, date: '2030-05-01', category: 'restaurant', title: 'Mercado de San Miguel', status: 'pending' });

    // Un museo no lleva «Por reservar».
    const remaining = renderer.root.findAll((node: ReactTestInstance) => node.props.accessibilityRole === 'button' && node.props.disabled === false && typeof node.props.onPress === 'function' && !node.props.testID);
    await act(async () => remaining[0].props.onPress());
    await flush();
    expect(createActivity.mock.calls[1][0].data).toMatchObject({ title: 'Museo del Prado', status: 'confirmed' });
  });

  it('sends fitness interests and does not mark a running route as pending', async () => {
    getSuggestions.mockReset();
    createActivity.mockReset();
    getSuggestions.mockResolvedValue([
      { title: 'Ruta del Retiro', category: 'fitness', description: '5 km en tierra', location: 'Puerta de Alcalá', estimatedTime: '35 min', kidFriendly: true, needsBooking: false, budget: 'low' },
    ]);
    createActivity.mockResolvedValue({ id: 2 });
    const { byTestId, renderer } = render();
    await flush();
    act(() => byTestId('taste-fit_running').props.onPress());
    act(() => byTestId('taste-fit_hyrox').props.onPress());
    await act(async () => byTestId('ideas-generate').props.onPress());
    await flush();
    const request = getSuggestions.mock.calls[0][0].data;
    expect(request.interests.length).toBeGreaterThanOrEqual(2);
    expect(request.interests.join(' ')).toMatch(/HYROX/);

    const add = renderer.root.findAll((node: ReactTestInstance) => node.props.accessibilityRole === 'button' && node.props.disabled === false && typeof node.props.onPress === 'function' && !node.props.testID);
    await act(async () => add[0].props.onPress());
    await flush();
    expect(createActivity.mock.calls[0][0].data).toMatchObject({ category: 'fitness', status: 'confirmed' });
  });
});
