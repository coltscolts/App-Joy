/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#112135',
    tint: '#1868C6',
    background: '#F4F7F9',
    foreground: '#112135',
    title: '#1868C6',
    card: '#FFFFFF',
    cardForeground: '#112135',
    primary: '#1868C6',
    primaryForeground: '#FFFFFF',
    secondary: '#E2E8F0',
    secondaryForeground: '#1E293B',
    muted: '#F1F5F9',
    mutedForeground: '#64748B',
    accent: '#FFC857',
    accentForeground: '#453200',
    destructive: '#E63946',
    destructiveForeground: '#FFFFFF',
    border: '#E2E8F0',
    input: '#CBD5E1',
  },
  dark: {
    text: '#F1F6FC',
    tint: '#70465B',
    background: '#08162B',
    foreground: '#F1F6FC',
    title: '#035CB5',
    card: '#13233D',
    cardForeground: '#F1F6FC',
    primary: '#70465B',
    primaryForeground: '#ffffff',
    secondary: '#1A2D49',
    secondaryForeground: '#E2ECF7',
    muted: '#10213A',
    mutedForeground: '#A9B9CC',
    accent: '#1B4E62',
    accentForeground: '#E2F8FA',
    destructive: '#B32636',
    destructiveForeground: '#ffffff',
    border: '#2A4260',
    input: '#56708B',
  },
  radius: 8,
};

export default colors;
