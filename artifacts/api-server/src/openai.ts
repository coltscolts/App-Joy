import OpenAI from 'openai';
import { logger } from "./lib/logger";

// Cliente compatible con OpenAI. Acepta las variables de Replit AI Integrations
// (AI_INTEGRATIONS_OPENAI_*) o las estándar (OPENAI_API_KEY / OPENAI_BASE_URL).
// Se crea bajo demanda: si falta la clave, solo fallan las sugerencias con IA,
// no el arranque de toda la API.
let client: OpenAI | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI no está configurado: define OPENAI_API_KEY');
    }
    client = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return client;
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/** Categoría especial para «Ayúdame con ideas». */
export const MIXED_CATEGORY = 'any';
/** Categorías válidas que la IA puede asignar a cada idea. */
export const IDEA_CATEGORIES = ['cultural', 'tour', 'restaurant', 'bar', 'nightlife', 'fitness', 'kids', 'general'];

export interface TravelSuggestionParams {
  destination: string;
  adults: number;
  children: number;
  category: string;
  date: string;
  language: 'en' | 'es';
  childAges?: number[];
  budget: 'low' | 'medium' | 'high';
  interests?: string[];
}

export interface ActivitySuggestion {
  title: string;
  category: string;
  description: string;
  location: string;
  estimatedTime: string;
  kidFriendly: boolean;
  budget: 'low' | 'medium' | 'high';
}

export async function generateTravelSuggestions(
  params: TravelSuggestionParams
): Promise<ActivitySuggestion[]> {
  const isSpanish = params.language === 'es';
  const budgetDescriptions = isSpanish ? {
    low: 'económico y accesible (menos de 20-30 USD por persona)',
    medium: 'precio moderado (30-100 USD por persona)',
    high: 'experiencias premium y de lujo (más de 100 USD por persona)',
  } : {
    low: 'budget-friendly and affordable (under $20-30 per person)',
    medium: 'moderately priced ($30-100 per person)',
    high: 'premium and luxury experiences (over $100 per person)',
  };

  const childContext = params.children > 0
    ? isSpanish
      ? `\nEl grupo incluye ${params.children} ${params.children === 1 ? 'niño' : 'niños'}${
          params.childAges?.length ? ` de ${params.childAges.join(', ')} años` : ''
        }. Las actividades deben ser apropiadas para familias con niños.`
      : `\nThe group includes ${params.children} child${params.children > 1 ? 'ren' : ''}${
          params.childAges?.length ? ` aged ${params.childAges.join(', ')}` : ''
        }. Activities should be appropriate for families with children.`
    : '';

  const categoryDescriptions: Record<string, string> = isSpanish ? {
    cultural: 'experiencias culturales y locales',
    fitness: 'deporte y entrenamiento: rutas para correr, senderismo, gimnasios, CrossFit, HYROX, barre, pilates, yoga o ciclismo',
    tour: 'tours y recorridos guiados',
    restaurant: 'restaurantes y experiencias gastronómicas',
    bar: 'bares y cocktailbars',
    nightlife: 'vida nocturna',
    kids: 'actividades para niños',
    general: 'experiencias variadas',
    hotel: 'experiencias o servicios del alojamiento',
    train: 'experiencias relacionadas con trenes',
    transfer: 'traslados',
    transportation: 'transporte local',
    flight: 'experiencias relacionadas con el vuelo',
  } : {
    cultural: 'cultural and local experiences',
    fitness: 'sport and training: running routes, hiking, gyms, CrossFit, HYROX, barre, pilates, yoga or cycling',
    tour: 'tours and guided visits',
    restaurant: 'restaurants and dining experiences',
    bar: 'bars and cocktail bars',
    nightlife: 'nightlife',
    kids: 'activities for children',
    general: 'varied experiences',
    hotel: 'hotel experiences or services',
    train: 'train-related experiences',
    transfer: 'transfers',
    transportation: 'local transportation',
    flight: 'flight-related experiences',
  };
  // «any»: propuestas variadas según los gustos; la IA elige la categoría de cada una.
  const isMixed = params.category === MIXED_CATEGORY;
  const requestedCategory = isMixed
    ? (isSpanish ? 'una mezcla variada de actividades que encaje con sus gustos' : 'a varied mix of activities that fits their tastes')
    : categoryDescriptions[params.category] ?? params.category;
  const count = isMixed ? 6 : 4;
  const categoryField = isMixed ? IDEA_CATEGORIES.join('|') : params.category;
  const dateContext = `\n${isSpanish ? 'Fecha planeada' : 'Planned date'}: ${params.date}`;
  const interestsContext = params.interests?.length
    ? `\n${isSpanish ? 'Preferencias adicionales' : 'Additional preferences'}: ${params.interests.join(', ')}`
    : '';

  const prompt = isSpanish
    ? `Eres un asesor de viajes. Sugiere ${count} actividades concretas en ${params.destination} que correspondan a ${requestedCategory}.

Composición del grupo:
- ${params.adults} adulto${params.adults > 1 ? 's' : ''}
${childContext}${dateContext}${interestsContext}

Presupuesto: ${budgetDescriptions[params.budget]}

Requisitos:
1. Todas las propuestas deben pertenecer a la categoría solicitada.
2. Adapta el ritmo y la logística al tamaño del grupo.
3. Si hay niños, prioriza seguridad, descansos, accesibilidad y duración apropiada.
4. Usa lugares o zonas conocidas cuando tengas confianza; no inventes calificaciones, horarios, precios exactos ni disponibilidad.
5. Incluye una duración estimada realista y una ubicación o zona útil.
6. Responde en español y recuerda que el usuario debe verificar horarios y disponibilidad.
7. Si pide actividad física (correr, senderismo, gym, CrossFit, HYROX, barre, pilates, yoga, ciclismo…): da opciones concretas. Rutas para correr con punto de salida, distancia aproximada en km, tipo de terreno y mejor hora; senderos con punto de inicio, distancia, desnivel y dificultad; gimnasios, boxes de CrossFit, gimnasios que entrenan HYROX y estudios de barre, pilates o yoga indicando si suelen aceptar clase suelta o pase de día. Usa la categoría "fitness".
8. "needsBooking" es true solo si normalmente hace falta reservar o pagar entrada/clase (restaurante, clase, pase de día, tour); false para rutas, parques o paseos libres.

Devuelve SOLAMENTE un arreglo JSON válido con este formato:
[
  {
    "title": "Nombre de la actividad o lugar",
    "category": "${categoryField}",
    "description": "Por qué encaja con este grupo y qué debe considerar",
    "location": "Zona, barrio o punto de referencia",
    "estimatedTime": "Duración estimada",
    "kidFriendly": true|false,
    "needsBooking": true|false,
    "budget": "${params.budget}"
  }
]`
    : `You are a travel advisor. Suggest ${count} specific activities in ${params.destination} that match ${requestedCategory}.

Group:
- ${params.adults} adult${params.adults === 1 ? '' : 's'}
${childContext}${dateContext}${interestsContext}

Budget: ${budgetDescriptions[params.budget]}

Requirements:
1. Every suggestion must belong to the requested category.
2. Adapt the pace and logistics to the group size.
3. If children are included, prioritize safety, breaks, accessibility, and an appropriate duration.
4. Use known places or areas when confident; do not invent ratings, opening hours, exact prices, or availability.
5. Include a realistic estimated duration and a useful location or area.
6. Respond in English and remind the user to verify opening hours and availability.
7. If they want physical activity (running, hiking, gym, CrossFit, HYROX, barre, pilates, yoga, cycling…), give concrete options: running routes with start point, approximate distance in km, surface and best time; hikes with trailhead, distance, elevation gain and difficulty; gyms, CrossFit boxes, gyms that train HYROX and barre, pilates or yoga studios, saying whether they usually accept drop-in classes or day passes. Use the "fitness" category.
8. "needsBooking" is true only if it usually requires a booking or paid entry/class (restaurant, class, day pass, tour); false for routes, parks or free walks.

Return ONLY a valid JSON array in this format:
[
  {
    "title": "Activity or place name",
    "category": "${categoryField}",
    "description": "Why it suits this group and what they should consider",
    "location": "Area, neighborhood, or landmark",
    "estimatedTime": "Estimated duration",
    "kidFriendly": true|false,
    "needsBooking": true|false,
    "budget": "${params.budget}"
  }
]`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable travel advisor who provides personalized, budget-conscious activity recommendations. Always return valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_completion_tokens: 8192,
    });

    const responseText = completion.choices[0].message.content?.trim() || '[]';
    
    // Extract JSON from response (in case model adds markdown formatting)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) throw new Error('Suggestions response is not an array');

    return parsed.slice(0, count).map((suggestion): ActivitySuggestion => ({
      title: String(suggestion.title || (isSpanish ? 'Actividad sugerida' : 'Suggested activity')),
      category: isMixed
        ? (IDEA_CATEGORIES.includes(suggestion.category) ? suggestion.category : 'general')
        : params.category,
      description: String(suggestion.description || ''),
      location: String(suggestion.location || params.destination),
      estimatedTime: String(suggestion.estimatedTime || (isSpanish ? 'Duración por confirmar' : 'Duration to be confirmed')),
      kidFriendly: Boolean(suggestion.kidFriendly),
      ...(typeof suggestion.needsBooking === 'boolean' ? { needsBooking: suggestion.needsBooking } : {}),
      budget: params.budget,
    }));
  } catch (error) {
    logger.error({ err: error }, "Error generating travel suggestions");
    throw new Error('Failed to generate travel suggestions');
  }
}
