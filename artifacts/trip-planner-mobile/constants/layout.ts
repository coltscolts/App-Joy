import type { ViewStyle } from 'react-native';

/**
 * Ancho máximo de lectura para pantallas anchas (iPad, iPhone plegable
 * abierto, horizontal). En teléfonos no cambia nada: ocupa todo el ancho.
 */
export const MAX_CONTENT_WIDTH = 720;

export const readableWidth: ViewStyle = {
  alignSelf: 'center',
  maxWidth: MAX_CONTENT_WIDTH,
  width: '100%',
};
