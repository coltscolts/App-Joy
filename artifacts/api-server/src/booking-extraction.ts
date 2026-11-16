import type { Trip } from "@workspace/db";
import { getOpenAI } from "./openai";

/**
 * Extracción de reservas (vuelos, hoteles, restaurantes…) desde una captura de
 * pantalla con un modelo de visión compatible con OpenAI.
 *
 * El modelo devuelve JSON con un esquema estricto; aun así todo se valida y
 * normaliza aquí (fechas, horas, longitudes) antes de llegar al cliente, que
 * siempre muestra el formulario para que la persona revise antes de guardar.
 */

export const BOOKING_KINDS = [
  "flight",
  "hotel",
  "train",
  "restaurant",
  "tour",
  "transfer",
  "transportation",
  "general",
] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export type ExtractedBooking = {
  kind: BookingKind;
  title: string;
  date: string | null;
  endDate: string | null;
  time: string | null;
  location: string | null;
  city: string | null;
  flightNumber: string | null;
  confirmationNumber: string | null;
  details: string | null;
};

export const MAX_BOOKINGS = 6;
/** ~5 MB de imagen en base64. La app reduce las capturas a ~200 KB. */
export const MAX_IMAGE_BASE64_LENGTH = 7_000_000;
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

const nullableString = { type: ["string", "null"] } as const;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["bookings"],
  properties: {
    bookings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "kind",
          "title",
          "date",
          "endDate",
          "time",
          "location",
          "city",
          "flightNumber",
          "confirmationNumber",
          "details",
        ],
        properties: {
          kind: { type: "string", enum: [...BOOKING_KINDS] },
          title: { type: "string" },
          date: nullableString,
          endDate: nullableString,
          time: nullableString,
          location: nullableString,
          city: nullableString,
          flightNumber: nullableString,
          confirmationNumber: nullableString,
          details: nullableString,
        },
      },
    },
  },
} as const;

function buildInstructions(language: "en" | "es", trip?: Pick<Trip, "startDate" | "endDate" | "destination"> | null) {
  const spanish = language === "es";
  const tripContext = trip
    ? `The traveler's trip runs from ${trip.startDate} to ${trip.endDate} (destinations: ${trip.destination}). Use it to infer a missing year.`
    : "If the year is missing, assume the next upcoming occurrence of that date.";
  return [
    "You read screenshots of travel confirmations (airline, hotel, train, restaurant, tour, car or transfer bookings, emails or apps) and extract each booking.",
    "Return one entry per distinct booking or flight leg (a round trip is two flights). Ignore ads, prices and unrelated text.",
    "kind: flight, hotel, train, restaurant, tour, transfer (airport/car transfers, car rental), transportation (bus, ferry, other) or general.",
    `title: short and useful, e.g. "AM 401 Mexico City → Madrid" for flights, the hotel or restaurant name otherwise. Write it in ${spanish ? "Spanish" : "English"} unless it is a proper name.`,
    "date: YYYY-MM-DD of departure / check-in / reservation. endDate: YYYY-MM-DD of check-out or arrival on a later day, else null.",
    "time: local departure / check-in / reservation time as HH:MM 24h, else null.",
    "location: address, airport or station (for flights: origin → destination airports). city: city of the booking (departure city for flights).",
    "flightNumber: airline code + number without spaces (e.g. AM401), only for flights. confirmationNumber: booking/PNR/reservation code if visible.",
    `details: one or two short lines with other useful facts (seat, terminal, room type, guests), in ${spanish ? "Spanish" : "English"}, else null.`,
    "Never invent data: use null when a value is not visible. If the image has no booking, return an empty list.",
    tripContext,
  ].join("\n");
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const valid = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  return valid && year >= 2000 && year <= 2100 ? value.trim() : null;
}

function cleanTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

/** Valida y normaliza la salida del modelo. Exportada para pruebas. */
export function normalizeExtraction(raw: unknown): ExtractedBooking[] {
  const list = (raw as { bookings?: unknown })?.bookings;
  if (!Array.isArray(list)) return [];
  const bookings: ExtractedBooking[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const kind = BOOKING_KINDS.includes(entry.kind as BookingKind) ? (entry.kind as BookingKind) : "general";
    const title = cleanText(entry.title, 120);
    if (!title) continue;
    const date = cleanDate(entry.date);
    let endDate = cleanDate(entry.endDate);
    if (date && endDate && endDate < date) endDate = null;
    const flightNumber = kind === "flight"
      ? cleanText(entry.flightNumber, 12)?.replace(/\s+/g, "").toUpperCase() ?? null
      : null;
    bookings.push({
      kind,
      title,
      date,
      endDate,
      time: cleanTime(entry.time),
      location: cleanText(entry.location, 200),
      city: cleanText(entry.city, 120),
      flightNumber,
      confirmationNumber: cleanText(entry.confirmationNumber, 40),
      details: cleanText(entry.details, 400),
    });
    if (bookings.length >= MAX_BOOKINGS) break;
  }
  return bookings;
}

export async function extractBookingsFromImage(params: {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  language: "en" | "es";
  trip?: Pick<Trip, "startDate" | "endDate" | "destination"> | null;
}): Promise<ExtractedBooking[]> {
  const completion = await getOpenAI().chat.completions.create({
    model: VISION_MODEL,
    temperature: 0,
    max_completion_tokens: 2000,
    response_format: {
      type: "json_schema",
      json_schema: { name: "travel_bookings", strict: true, schema: responseSchema as unknown as Record<string, unknown> },
    },
    messages: [
      { role: "system", content: buildInstructions(params.language, params.trip) },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the bookings from this screenshot." },
          { type: "image_url", image_url: { url: `data:${params.mimeType};base64,${params.imageBase64}`, detail: "high" } },
        ],
      },
    ],
  });
  const text = completion.choices[0]?.message?.content ?? "";
  try {
    return normalizeExtraction(JSON.parse(text));
  } catch {
    return [];
  }
}
