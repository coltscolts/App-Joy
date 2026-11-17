import type { Ionicons } from '@expo/vector-icons';
import type { StopWeather } from '@workspace/api-client-react';

/** Icono según el clima: lluvia si llueve ≥ 25 % de los días; si no, por temperatura. */
export function weatherIcon(weather: StopWeather | null | undefined): keyof typeof Ionicons.glyphMap {
  if (!weather) return 'cloud-outline';
  if (weather.rainyDays > 0 && weather.rainyDays / weather.totalDays >= 0.25) return 'rainy-outline';
  if (weather.avgHigh < 4) return 'snow-outline';
  if (weather.avgHigh < 13) return 'cloudy-outline';
  if (weather.avgHigh < 21) return 'partly-sunny-outline';
  return 'sunny-outline';
}
