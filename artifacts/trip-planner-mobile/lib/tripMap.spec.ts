import { describe, expect, it } from 'vitest';
import { buildRoute, estimateLeg, formatKm, formatMinutes, geocodeQuery, haversineKm, isCityCentroid, placesQuery, orderActivities } from './tripMap';

const prado = { latitude: 40.4138, longitude: -3.6921 };
const retiro = { latitude: 40.4153, longitude: -3.6845 };
const toledo = { latitude: 39.8628, longitude: -4.0273 };

describe('trip map helpers', () => {
  it('measures straight-line distance', () => {
    expect(haversineKm(prado, retiro)).toBeGreaterThan(0.6);
    expect(haversineKm(prado, retiro)).toBeLessThan(0.75);
    expect(Math.round(haversineKm(prado, toledo))).toBe(68);
  });

  it('estimates walking for short legs and driving for long ones', () => {
    expect(estimateLeg(1)).toEqual({ km: 1.3, mode: 'walk', minutes: 16 });
    const car = estimateLeg(68);
    expect(car.mode).toBe('car');
    expect(car.minutes).toBe(Math.round((68 * 1.3 / 30) * 60 + 5));
  });

  it('orders a day by time, puts untimed last and skips flights', () => {
    const acts = [
      { id: 1, date: '2030-05-01', time: '15:00', title: 'Retiro', category: 'tour' },
      { id: 2, date: '2030-05-01', time: null, title: 'Cena', category: 'restaurant' },
      { id: 3, date: '2030-05-01', time: '09:00', title: 'Prado', category: 'cultural' },
      { id: 4, date: '2030-05-01', time: '07:00', title: 'AM401', category: 'flight' },
      { id: 5, date: '2030-05-02', time: '10:00', title: 'Toledo', category: 'tour' },
    ];
    expect(orderActivities(acts, '2030-05-01').map((a) => a.id)).toEqual([3, 1, 2]);
    expect(orderActivities(acts, 'all').map((a) => a.id)).toEqual([3, 1, 2, 5]);
  });

  it('builds legs only between located places and reports the missing ones', () => {
    const route = buildRoute([
      { id: 1, date: 'd', title: 'Prado', category: 'cultural', ...prado },
      { id: 2, date: 'd', title: 'Sin ubicar', category: 'general' },
      { id: 3, date: 'd', title: 'Retiro', category: 'tour', ...retiro },
    ]);
    expect(route.located.map((a) => a.id)).toEqual([1, 3]);
    expect(route.legs).toHaveLength(1);
    expect(route.missing).toBe(1);
    expect(route.totalKm).toBeCloseTo(route.legs[0].km);
  });

  it('builds a geocoding query with the city when it is not already included', () => {
    expect(geocodeQuery({ id: 1, date: 'd', title: 'Prado', category: 'c', location: 'Paseo del Prado', city: 'Madrid, España' })).toBe('Paseo del Prado, Madrid, España');
    expect(geocodeQuery({ id: 1, date: 'd', title: 'Museo', category: 'c', location: 'Calle Mayor 1, Madrid', city: 'Madrid, España' })).toBe('Calle Mayor 1, Madrid');
    expect(geocodeQuery({ id: 1, date: 'd', title: 'Botín', category: 'c' }, 'Madrid')).toBe('Botín, Madrid');
  });

  it('formats distances and durations', () => {
    expect(formatKm(0.42, 'es-419')).toBe('420 m');
    expect(formatMinutes(95)).toBe('1 h 35 min');
    expect(formatMinutes(40)).toBe('40 min');
  });
});

describe('whole-trip totals', () => {
  it('does not add the jump between days to the total', () => {
    const route = buildRoute([
      { id: 1, date: 'd1', title: 'A', category: 'tour', latitude: 40.4138, longitude: -3.6921 },
      { id: 2, date: 'd1', title: 'B', category: 'tour', latitude: 40.4153, longitude: -3.6845 },
      { id: 3, date: 'd2', title: 'C', category: 'tour', latitude: 39.8628, longitude: -4.0273 },
    ]);
    expect(route.legs).toHaveLength(2);
    expect(route.totalKm).toBeCloseTo(route.legs[0].km);
  });
});


describe('place lookup helpers', () => {
  it('builds a Places query from title and location', () => {
    expect(placesQuery({ id: 1, date: 'd', title: 'Visit Chapultepec Castle', category: 'c', location: 'Chapultepec Park, Mexico City' }))
      .toBe('Visit Chapultepec Castle, Chapultepec Park, Mexico City');
    expect(placesQuery({ id: 1, date: 'd', title: 'Limantour', category: 'c', location: 'Roma Norte' })).toBe('Limantour, Roma Norte');
    expect(placesQuery({ id: 1, date: 'd', title: 'Prado', category: 'c', location: null })).toBe('Prado');
  });

  it('detects results that are just the city centre', () => {
    const center = { latitude: 19.4326, longitude: -99.1332 };
    expect(isCityCentroid({ latitude: 19.4330, longitude: -99.1335 }, center)).toBe(true);
    expect(isCityCentroid({ latitude: 19.4204, longitude: -99.1819 }, center)).toBe(false);
    expect(isCityCentroid({ latitude: 19.4330, longitude: -99.1335 }, null)).toBe(false);
  });
});
