import { getOpenAI, isAiConfigured } from "./openai";
import { logger } from "./lib/logger";
import type { StopWeather } from "./weather";

/**
 * «Qué llevar»: recomendaciones de ropa según el clima de cada parada.
 * Las reglas siempre funcionan (sin IA); si hay OpenAI, se añaden consejos
 * personalizados según las actividades planeadas.
 */

export type Outfit = { summary: string; items: string[]; tips: string[] };
type Lang = "en" | "es";

const L = {
  es: {
    hot: "Calor", warm: "Templado y agradable", mild: "Fresco", cold: "Frío", freezing: "Muy frío",
    rainy: "con lluvia algunos días",
    tshirts: "Camisetas ligeras de algodón o lino", shorts: "Shorts, faldas o vestidos frescos",
    sandals: "Sandalias y tenis transpirables", sun: "Gorra o sombrero, lentes de sol y protector solar",
    swim: "Traje de baño", lightLayer: "Una capa ligera para la noche o el aire acondicionado",
    tees: "Camisetas y alguna camisa de manga larga", pants: "Pantalón ligero o jeans",
    sneakers: "Tenis cómodos para caminar", cardigan: "Suéter ligero o chamarra de mezclilla",
    layers: "Capas: camiseta + suéter", jacket: "Chamarra o trench impermeable",
    closedShoes: "Calzado cerrado y cómodo", scarf: "Bufanda ligera",
    coat: "Abrigo térmico o plumífero", thermal: "Ropa térmica (primera capa)",
    sweaters: "Suéteres de lana o forro polar", boots: "Botas impermeables con buena suela",
    hat: "Gorro, guantes y bufanda", umbrella: "Paraguas compacto", rainJacket: "Chamarra impermeable con capucha",
    tipSwing: "Diferencia grande entre día y noche: vístete por capas.",
    tipRain: "Ten un plan B bajo techo para los días de lluvia.",
    tipHot: "Hidrátate y evita caminar al mediodía.",
    tipCold: "Lleva calcetines extra: los pies fríos arruinan el día.",
    tipTypical: "Basado en el clima típico de esas fechas; revisa el pronóstico unos días antes.",
  },
  en: {
    hot: "Hot", warm: "Warm and pleasant", mild: "Cool", cold: "Cold", freezing: "Very cold",
    rainy: "with some rainy days",
    tshirts: "Light cotton or linen tees", shorts: "Shorts, skirts or breezy dresses",
    sandals: "Sandals and breathable sneakers", sun: "Cap or hat, sunglasses and sunscreen",
    swim: "Swimsuit", lightLayer: "A light layer for evenings or air conditioning",
    tees: "Tees plus a long-sleeve shirt", pants: "Light trousers or jeans",
    sneakers: "Comfortable walking sneakers", cardigan: "Light sweater or denim jacket",
    layers: "Layers: tee + sweater", jacket: "Water-resistant jacket or trench",
    closedShoes: "Comfortable closed shoes", scarf: "Light scarf",
    coat: "Insulated or down coat", thermal: "Thermal base layers",
    sweaters: "Wool or fleece sweaters", boots: "Waterproof boots with good grip",
    hat: "Beanie, gloves and scarf", umbrella: "Compact umbrella", rainJacket: "Hooded rain jacket",
    tipSwing: "Big day/night temperature swing: dress in layers.",
    tipRain: "Keep an indoor plan B for the rainy days.",
    tipHot: "Stay hydrated and avoid walking at midday.",
    tipCold: "Pack extra socks: cold feet ruin the day.",
    tipTypical: "Based on typical weather for those dates; check the forecast a few days before.",
  },
} as const;

/** Recomendación por reglas (sin IA). Exportada para pruebas. */
export function ruleBasedOutfit(weather: StopWeather, language: Lang): Outfit {
  const s = L[language];
  const { avgHigh, avgLow, rainyDays, totalDays } = weather;
  const rainy = rainyDays > 0 && rainyDays / totalDays >= 0.25;
  let label: string;
  let items: string[];
  if (avgHigh >= 28) {
    label = s.hot;
    items = [s.tshirts, s.shorts, s.sandals, s.sun, s.swim, s.lightLayer];
  } else if (avgHigh >= 21) {
    label = s.warm;
    items = [s.tees, s.pants, s.sneakers, s.cardigan, s.sun];
  } else if (avgHigh >= 13) {
    label = s.mild;
    items = [s.layers, s.pants, s.jacket, s.closedShoes, s.scarf];
  } else if (avgHigh >= 4) {
    label = s.cold;
    items = [s.coat, s.sweaters, s.pants, s.boots, s.hat];
  } else {
    label = s.freezing;
    items = [s.coat, s.thermal, s.sweaters, s.boots, s.hat];
  }
  if (rainy) items.push(avgHigh >= 21 ? s.umbrella : s.rainJacket);

  const tips: string[] = [];
  if (avgHigh - avgLow >= 10) tips.push(s.tipSwing);
  if (rainy) tips.push(s.tipRain);
  if (avgHigh >= 30) tips.push(s.tipHot);
  if (avgHigh < 8) tips.push(s.tipCold);
  if (weather.source === "typical") tips.push(s.tipTypical);

  const summary = `${label}${rainy ? ` ${s.rainy}` : ""} · ${Math.round(avgLow)}°–${Math.round(avgHigh)}°C`;
  return { summary, items: [...new Set(items)], tips };
}

const tipsCache = new Map<string, { expiresAt: number; tips: string[] }>();

/** Añade 1-3 consejos según las actividades (p. ej. iglesias, cenas elegantes, senderismo). Nunca lanza. */
export async function aiActivityTips(weather: StopWeather, activities: { title: string; category: string }[], language: Lang): Promise<string[]> {
  if (!isAiConfigured() || !activities.length) return [];
  const list = activities.slice(0, 25).map((a) => `- ${a.title} (${a.category})`).join("\n");
  const prompt = `Trip to ${weather.city}, ${weather.startDate} to ${weather.endDate}. Average ${weather.avgLow}–${weather.avgHigh}°C, ${weather.rainyDays} rainy day(s).
Planned activities:
${list}
Give 1 to 3 short, practical packing/outfit tips that depend on these specific activities (dress codes, religious sites, hiking, beach, gym, fancy dinners...). Do not repeat generic weather advice. Answer in ${language === "es" ? "Spanish (Latin American)" : "English"}. Return only a JSON array of strings, each under 120 characters.`;
  const key = prompt.replace(/Average [^\n]*/, `${Math.round(weather.avgLow)}|${Math.round(weather.avgHigh)}|${weather.rainyDays}`);
  const hit = tipsCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.tips;
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_completion_tokens: 400,
    });
    const text = completion.choices[0].message.content ?? "[]";
    const parsed = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
    const tips = Array.isArray(parsed)
      ? parsed.filter((tip): tip is string => typeof tip === "string" && tip.trim().length > 0).map((tip) => tip.trim().slice(0, 160)).slice(0, 3)
      : [];
    if (tipsCache.size > 500) tipsCache.delete(tipsCache.keys().next().value!);
    tipsCache.set(key, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, tips });
    return tips;
  } catch (error) {
    logger.warn({ err: error }, "Outfit AI tips failed");
    return [];
  }
}
