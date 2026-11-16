import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '@workspace/api-client-react';
import { ActivityFormModal } from './ActivityFormModal';
import { TimePickerField } from './TimePickerField';
import { ThemeProvider } from '@/contexts/ThemeContext';

const createActivity = vi.fn();
const createHotelStays = vi.fn();
const flightLookup = vi.fn();

vi.mock('@workspace/api-client-react', () => ({
  FlightLookupLanguage: { en: 'en', es: 'es' },
  SuggestionParamsLanguage: { en: 'en', es: 'es' },
  flightLookup: (...args: unknown[]) => flightLookup(...args),
  getDestinationForDate: (_date: string, trip: Trip) => trip.destination,
  getGetDestinationSuggestionsQueryKey: () => ['destinations'],
  getGetHotelSuggestionsQueryKey: () => ['hotels'],
  getGetTripActivitiesQueryKey: () => ['activities'],
  useCreateActivity: () => ({ isError: false, mutateAsync: createActivity }),
  useCreateHotelStays: () => ({ isError: false, mutateAsync: createHotelStays }),
  useGetDestinationSuggestions: () => ({ data: [], isFetching: false }),
  useGetHotelSuggestions: () => ({ data: [], isError: false, isFetching: false }),
  useGetSuggestions: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useGetTripActivities: () => ({ data: [] }),
  useUpdateActivity: () => ({ isError: false, mutateAsync: vi.fn() }),
}));

vi.mock('@/lib/queryClient', () => ({
  mobileQueryClient: { invalidateQueries: vi.fn() },
}));

const trip: Trip = {
  id: 42,
  name: 'Authenticated test trip',
  destination: 'Madrid',
  startDate: '2026-11-10',
  endDate: '2026-11-16',
  adults: 2,
  children: 0,
  tripType: 'single',
  stops: [],
  createdAt: '2026-08-25T12:00:00.000Z',
};

function byTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.findByProps({ testID });
}

async function renderWithTheme(children: React.ReactNode) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ThemeProvider>{children}</ThemeProvider>);
  });
  return renderer;
}

function textContent(node: ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('');
}

function press(renderer: ReactTestRenderer, testID: string) {
  const target = renderer.root.findAllByProps({ testID }).find((node) => typeof node.props.onPress === 'function');
  if (!target) throw new Error(`No pressable found for ${testID}`);
  act(() => target.props.onPress());
}

function changeText(renderer: ReactTestRenderer, testID: string, value: string) {
  const target = renderer.root.findAllByProps({ testID }).find((node) => typeof node.props.onChangeText === 'function');
  if (!target) throw new Error(`No text input found for ${testID}`);
  act(() => target.props.onChangeText(value));
}

function openCategory(renderer: ReactTestRenderer, category: 'flight' | 'hotel') {
  press(renderer, 'select-category');
  press(renderer, `category-option-${category}`);
}

describe('ActivityFormModal authenticated Expo web flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createActivity.mockResolvedValue({ id: 100, reminderEnabled: false });
    createHotelStays.mockResolvedValue([
      { id: 101, reminderEnabled: false },
      { id: 102, reminderEnabled: false },
    ]);
  });

  it('shows a localized flight time, clears it, and submits canonical API values', async () => {
    flightLookup.mockResolvedValue({
      airline: 'Joy Air',
      flightNumber: 'JP905',
      status: 'scheduled',
      departure: { airport: 'Madrid', scheduled: '2026-11-10T21:05:00' },
      arrival: { airport: 'Lisbon', scheduled: '2026-11-10T22:10:00' },
    });
    const renderer = await renderWithTheme(
      <ActivityFormModal trip={trip} visible onClose={vi.fn()} />,
    );

    openCategory(renderer, 'flight');
    changeText(renderer, 'input-flight-number', 'jp905');
    await act(async () => byTestId(renderer, 'button-lookup-flight').props.onPress());

    expect(textContent(byTestId(renderer, 'input-time'))).toContain('9:05 PM');
    await act(async () => byTestId(renderer, 'button-save-activity').props.onPress());
    expect(createActivity.mock.calls[0][0].data.time).toBe('21:05');

    press(renderer, 'input-time');
    press(renderer, 'button-clear-time');
    expect(textContent(byTestId(renderer, 'input-time'))).not.toContain('9:05 PM');
    await act(async () => byTestId(renderer, 'button-save-activity').props.onPress());
    expect(createActivity).toHaveBeenCalledTimes(2);
    expect(createActivity.mock.calls[1][0].data.time).toBeNull();
  });

  it('emits an empty string when an optional time is cleared', async () => {
    const onChange = vi.fn();
    const renderer = await renderWithTheme(
      <TimePickerField label="Time" value="21:05" placeholder="Optional" onChange={onChange} />,
    );

    press(renderer, 'input-time');
    press(renderer, 'button-clear-time');

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('prevents the second hotel from starting before the first and keeps their boundary synchronized', async () => {
    const renderer = await renderWithTheme(
      <ActivityFormModal trip={trip} visible onClose={vi.fn()} />,
    );

    openCategory(renderer, 'hotel');
    press(renderer, 'hotel-mode-2');
    press(renderer, 'input-hotel-check-in-1');

    expect(byTestId(renderer, 'input-hotel-check-in-1-day-2026-11-09').props.disabled).toBe(true);
    press(renderer, 'input-hotel-check-in-1-day-2026-11-14');

    press(renderer, 'input-hotel-check-out-0');
    expect(byTestId(renderer, 'input-hotel-check-out-0-day-2026-11-14').props.accessibilityState.selected).toBe(true);
  });
});