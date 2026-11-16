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
