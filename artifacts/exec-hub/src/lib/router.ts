import { useEffect, useState } from 'react';

// Router por hash (#/reuniones/123): funciona igual instalado en iPad y servido bajo /oficina/.
const current = () => window.location.hash.replace(/^#\/?/, '') || 'hoy';

export function useRoute(): [string[], (to: string) => void] {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => { setPath(current()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [path.split('/'), navigate];
}

export function navigate(to: string) {
  window.location.hash = `/${to}`;
}
