import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { Trip } from '@workspace/api-client-react';
import { OutfitsModal } from './OutfitsModal';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { weatherIcon } from '@/lib/outfits';

const queryResult = vi.fn();
vi.mock('@workspace/api-client-react', () => ({
  GetTripOutfitsLanguage: { es: 'es', en: 'en' },
  getGetTripOutfitsQueryKey: () => ['outfits'],
  useGetTripOutfits: () => queryResult(),
}));

const trip = { id: 3, name: 'Europa', destination: 'Madrid', startDate: '2030-05-01', endDate: '2030-05-06', adults: 2, children: 0, tripType: 'multi', stops: [] } as unknown as Trip;
const weather = { source: 'forecast', avgHigh: 30, avgLow: 20, maxTemp: 33, minTemp: 18, rainyDays: 0, totalDays: 3 };

function render() {
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<ThemeProvider><OutfitsModal trip={trip} visible onClose={vi.fn()} /></ThemeProvider>); });
  const texts = () => renderer.root.findAll((n: ReactTestInstance) => n.type === 'Text').map((n: ReactTestInstance) => [n.props.children].flat().join(''));
  return { renderer, texts };
}

describe('OutfitsModal', () => {
  it('shows live weather, outfit items and tips per stop', () => {
    queryResult.mockReturnValue({
      isLoading: false, isError: false, refetch: vi.fn(),
      data: { stops: [
        { city: 'Madrid, España', startDate: '2030-05-01', endDate: '2030-05-03',
          weather: { ...weather, current: { temperature: 27.4, apparentTemperature: 29.1, precipitation: 0, observedAt: '2030-05-01T12:00' } },
          outfit: { summary: 'Calor · 20°–30°C', items: ['Traje de baño'], tips: ['Lleva algo para cubrir hombros en iglesias'] } },
        { city: 'Lisboa', startDate: '2030-05-04', endDate: '2030-05-06', weather: null, outfit: null },
      ] },
    });
    const { renderer, texts } = render();
    expect(renderer.root.findAllByProps({ testID: 'outfit-stop' }).length).toBeGreaterThanOrEqual(2);
    const all = texts();
    expect(all.some((t) => /27°C/.test(t) && /29°C/.test(t))).toBe(true);
    expect(all).toContain('Traje de baño');
    expect(all).toContain('Lleva algo para cubrir hombros en iglesias');
    expect(all.some((t) => /(Weather not available|Clima no disponible)/.test(t))).toBe(true);
  });

  it('picks a weather icon', () => {
    expect(weatherIcon(null)).toBe('cloud-outline');
    expect(weatherIcon({ ...weather, current: null })).toBe('sunny-outline');
    expect(weatherIcon({ ...weather, rainyDays: 2, current: null } as never)).toBe('rainy-outline');
    expect(weatherIcon({ ...weather, avgHigh: 2, current: null } as never)).toBe('snow-outline');
  });
});
