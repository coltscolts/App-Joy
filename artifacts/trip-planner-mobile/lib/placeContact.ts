import { Platform } from 'react-native';

/** Categorías en las que normalmente hay que reservar. */
export const BOOKABLE_CATEGORIES = new Set(['restaurant', 'bar', 'nightlife', 'tour']);

/** Si la IA lo indica (p. ej. ruta para correr: no; clase de barre: sí), manda su criterio. */
export function needsBooking(category: string, budget?: string | null, aiSaysBooking?: boolean | null): boolean {
  if (typeof aiSaysBooking === 'boolean') return aiSaysBooking;
  return BOOKABLE_CATEGORIES.has(category) || budget === 'high';
}

/** Enlaces de búsqueda (nunca datos inventados) cuando no hay contacto verificado. */
export function fallbackLinks(name: string, city: string, language: 'en' | 'es') {
  const place = [name, city].filter(Boolean).join(', ');
  const maps = Platform.OS === 'ios'
    ? `http://maps.apple.com/?q=${encodeURIComponent(place)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  const bookingQuery = `${language === 'es' ? 'reservar' : 'book'} ${name} ${city}`.trim();
  return {
    maps,
    bookingSearch: `https://www.google.com/search?q=${encodeURIComponent(bookingQuery)}`,
  };
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/**
 * Horario del día planeado. Google publica las líneas empezando en lunes y
 * openDays con 0 = domingo. closed=true solo si sabemos que ese día no abre.
 */
export function dayStatus(
  contact: { openingHours?: string[] | null; openDays?: number[] | null } | null | undefined,
  dateIso: string | null | undefined,
): { line: string | null; closed: boolean | null } {
  if (!contact || !dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return { line: null, closed: null };
  const [y, m, d] = dateIso.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay(); // 0 = domingo
  const line = contact.openingHours?.[(weekday + 6) % 7] ?? null;
  const closed = contact.openDays ? !contact.openDays.includes(weekday) : null;
  return { line, closed };
}

/** Búsqueda en OpenTable (restaurantes y bares); no es un enlace inventado a un local concreto. */
export function openTableSearch(name: string, city: string): string {
  return `https://www.opentable.com/s?term=${encodeURIComponent([name, city].filter(Boolean).join(' '))}`;
}
