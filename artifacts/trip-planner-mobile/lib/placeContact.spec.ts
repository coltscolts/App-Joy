import { describe, expect, it } from 'vitest';
import { fallbackLinks, needsBooking, telUrl } from './placeContact';

describe('place contact helpers', () => {
  it('flags categories that usually need booking, and premium ideas', () => {
    expect(needsBooking('restaurant')).toBe(true);
    expect(needsBooking('bar')).toBe(true);
    expect(needsBooking('cultural')).toBe(false);
    expect(needsBooking('cultural', 'high')).toBe(true);
  });

  it('builds search links, never invented contact data', () => {
    const links = fallbackLinks('Sobrino de Botín', 'Madrid', 'es');
    expect(links.bookingSearch).toBe('https://www.google.com/search?q=reservar%20Sobrino%20de%20Bot%C3%ADn%20Madrid');
    expect(links.maps).toContain(encodeURIComponent('Sobrino de Botín, Madrid'));
  });

  it('cleans phone numbers for the dialer', () => {
    expect(telUrl('+34 913 66-42 17')).toBe('tel:+34913664217');
  });
});

describe('AI booking flag', () => {
  it('follows the AI when it says whether booking is needed', () => {
    expect(needsBooking('fitness', 'medium', false)).toBe(false); // ruta para correr
    expect(needsBooking('fitness', 'medium', true)).toBe(true); // clase de barre
    expect(needsBooking('restaurant', 'medium', undefined)).toBe(true);
  });
});

import { dayStatus, openTableSearch } from './placeContact';

describe('opening hours for the planned day', () => {
  const contact = {
    openingHours: ['lunes: Cerrado', 'martes: 13:00–23:00', 'miércoles: 13:00–23:00', 'jueves: 13:00–23:00', 'viernes: 13:00–02:00', 'sábado: 13:00–02:00', 'domingo: 13:00–18:00'],
    openDays: [0, 2, 3, 4, 5, 6],
  };
  it('picks the line for the weekday of the date (Monday-first list)', () => {
    expect(dayStatus(contact, '2026-11-21')).toEqual({ line: 'sábado: 13:00–02:00', closed: false }); // sábado
    expect(dayStatus(contact, '2026-11-22')).toEqual({ line: 'domingo: 13:00–18:00', closed: false });
  });
  it('flags a closed day', () => {
    expect(dayStatus(contact, '2026-11-23')).toEqual({ line: 'lunes: Cerrado', closed: true }); // lunes
  });
  it('returns unknowns without data', () => {
    expect(dayStatus(null, '2026-11-23')).toEqual({ line: null, closed: null });
    expect(dayStatus({ openingHours: null, openDays: null }, '2026-11-23')).toEqual({ line: null, closed: null });
  });
  it('builds an OpenTable search link', () => {
    expect(openTableSearch('Limantour', 'Ciudad de México')).toBe('https://www.opentable.com/s?term=Limantour%20Ciudad%20de%20M%C3%A9xico');
  });
});
