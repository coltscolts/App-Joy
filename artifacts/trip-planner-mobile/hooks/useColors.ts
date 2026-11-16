import { useTheme } from '@/contexts/ThemeContext';
import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 * Respects the user's manual theme override via ThemeContext.
 */
export function useColors() {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;

  return { ...palette, radius: colors.radius, isDark };
}
