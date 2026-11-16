import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it('usa EXPO_PUBLIC_API_URL y quita la barra final', () => {
    expect(resolveApiBaseUrl({ apiUrl: 'https://api.joyplann.com/' })).toBe('https://api.joyplann.com');
  });

  it('añade https si la URL no lleva protocolo', () => {
    expect(resolveApiBaseUrl({ apiUrl: 'api.joyplann.com' })).toBe('https://api.joyplann.com');
  });

  it('respeta http explícito (útil en desarrollo local)', () => {
    expect(resolveApiBaseUrl({ apiUrl: 'http://192.168.1.10:8080' })).toBe('http://192.168.1.10:8080');
  });

  it('prioriza la URL sobre el dominio heredado de Replit', () => {
    expect(resolveApiBaseUrl({ apiUrl: 'https://a.com', domain: 'b.com' })).toBe('https://a.com');
  });

  it('acepta EXPO_PUBLIC_DOMAIN con o sin protocolo', () => {
    expect(resolveApiBaseUrl({ domain: 'b.com' })).toBe('https://b.com');
    expect(resolveApiBaseUrl({ domain: 'https://b.com/' })).toBe('https://b.com');
  });

  it('en desarrollo usa la IP de Metro con el puerto de la API', () => {
    expect(resolveApiBaseUrl({ devHostUri: '192.168.1.5:8081', isDev: true })).toBe('http://192.168.1.5:8080');
  });

  it('en producción sin configuración devuelve null', () => {
    expect(resolveApiBaseUrl({ devHostUri: '192.168.1.5:8081', isDev: false })).toBeNull();
  });
});
