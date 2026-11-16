import { describe, expect, it, vi } from 'vitest';

vi.mock('@workspace/api-client-react', () => ({ ApiError: class {}, extractBookings: vi.fn() }));

import { bookingToFormPatch } from './bookingScan';

const trip = { startDate: '2026-12-01', endDate: '2026-12-10' };
const labels = { confirmation: 'Confirmación' };
const base = {
  title: 'x', date: null, endDate: null, time: null, location: null, city: null,
  flightNumber: null, confirmationNumber: null, details: null,
};

describe('bookingToFormPatch', () => {
  it('maps a flight inside the trip, keeping time, flight number and confirmation', () => {
    const patch = bookingToFormPatch({
      ...base, kind: 'flight', title: 'AM401 MEX → MAD', date: '2026-12-01', time: '09:05',
      location: 'MEX → MAD', city: 'Ciudad de México', flightNumber: 'AM401', confirmationNumber: 'XK7P2Q', details: 'Asiento 23A',
    }, trip, labels);
    expect(patch).toMatchObject({
      category: 'flight', title: 'AM401 MEX → MAD', date: '2026-12-01', time: '09:05',
      flightNumber: 'AM401', details: 'Confirmación: XK7P2Q\nAsiento 23A', hotel: null, dateOutsideTrip: null,
    });
  });

  it('builds a hotel stay and clamps check-out to the trip', () => {
    const patch = bookingToFormPatch({
      ...base, kind: 'hotel', title: 'Hotel Ritz', date: '2026-12-03', endDate: '2026-12-15', location: 'Plaza de la Lealtad 5',
    }, trip, labels);
    expect(patch.hotel).toEqual({ name: 'Hotel Ritz', address: 'Plaza de la Lealtad 5', city: null, checkIn: '2026-12-03', checkOut: '2026-12-10' });
  });

  it('does not apply a date outside the trip and reports it', () => {
    const patch = bookingToFormPatch({ ...base, kind: 'restaurant', title: 'Botín', date: '2027-01-05' }, trip, labels);
    expect(patch.date).toBeNull();
    expect(patch.dateOutsideTrip).toBe('2027-01-05');
    expect(patch.flightNumber).toBeNull();
  });
});
