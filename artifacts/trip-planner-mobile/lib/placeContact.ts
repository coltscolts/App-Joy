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
