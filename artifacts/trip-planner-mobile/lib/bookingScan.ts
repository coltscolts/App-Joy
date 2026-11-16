import { ApiError, extractBookings, type ExtractedBooking } from '@workspace/api-client-react';

/**
 * "Rellenar desde captura": la persona elige una captura de su reserva, se
 * reduce en el teléfono (para subir ~200 KB en vez de varios MB) y la API la
 * lee con IA. El resultado solo rellena el formulario: siempre se revisa
 * antes de guardar.
 */

export type ScanErrorCode = 'cancelled' | 'not_configured' | 'rate_limited' | 'no_bookings' | 'limit' | 'failed';

export class ScanError extends Error {
  constructor(public code: ScanErrorCode) {
    super(code);
  }
}

const MAX_WIDTH = 1280;

export async function pickAndReadBookingScreenshot(params: {
  language: 'en' | 'es';
  tripId: number;
}): Promise<ExtractedBooking[]> {
  // Import dinámico: los módulos nativos solo se cargan al usar la función.
  const ImagePicker = await import('expo-image-picker');
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.[0]) throw new ScanError('cancelled');

  const asset = picked.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width && asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  if (!saved.base64) throw new ScanError('failed');

  let result;
  try {
    result = await extractBookings({
      imageBase64: saved.base64,
      mimeType: 'image/jpeg',
      language: params.language,
      tripId: params.tripId,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 503) throw new ScanError('not_configured');
      if (error.status === 429) throw new ScanError('rate_limited');
      if (error.status === 402) throw new ScanError('limit');
    }
    throw new ScanError('failed');
  }
  if (!result.bookings.length) throw new ScanError('no_bookings');
  return result.bookings;
}

type TripRange = { startDate: string; endDate: string };

export type BookingFormPatch = {
  category: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  city: string | null;
  flightNumber: string | null;
  details: string | null;
  hotel: { name: string; address: string; city: string | null; checkIn: string; checkOut: string } | null;
  /** La fecha leída no cae dentro del viaje: se avisa y no se aplica. */
  dateOutsideTrip: string | null;
};

const inRange = (date: string | null | undefined, trip: TripRange) =>
  Boolean(date && date >= trip.startDate && date <= trip.endDate);

/** Convierte una reserva leída en los cambios del formulario de actividad. */
export function bookingToFormPatch(
  booking: ExtractedBooking,
  trip: TripRange,
  labels: { confirmation: string },
): BookingFormPatch {
  const detailLines = [
    booking.confirmationNumber ? `${labels.confirmation}: ${booking.confirmationNumber}` : null,
    booking.details ?? null,
  ].filter(Boolean);
  const date = inRange(booking.date, trip) ? booking.date! : null;
  const dateOutsideTrip = booking.date && !date ? booking.date : null;

  let hotel: BookingFormPatch['hotel'] = null;
  if (booking.kind === 'hotel') {
    const checkIn = date ?? trip.startDate;
    const checkOut = booking.endDate && booking.endDate > checkIn && booking.endDate <= trip.endDate
      ? booking.endDate
      : trip.endDate;
    hotel = { name: booking.title, address: booking.location ?? '', city: booking.city ?? null, checkIn, checkOut };
  }

  return {
    category: booking.kind,
    title: booking.title,
    date,
    time: booking.time ?? null,
    location: booking.location ?? null,
    city: booking.city ?? null,
    flightNumber: booking.kind === 'flight' ? booking.flightNumber ?? null : null,
    details: detailLines.length ? detailLines.join('\n') : null,
    hotel,
    dateOutsideTrip,
  };
}
