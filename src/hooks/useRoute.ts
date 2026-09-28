import { useEffect, useState } from 'react';

export type Route =
  | 'home'
  | 'training'
  | 'session'
  | 'nutrition'
  | 'nutrition-pantry'
  | 'nutrition-shopping'
  | 'body'
  | 'progress'
  | 'coach'
  | 'sources'
  | 'settings';

const parse = (): { route: Route; param?: string } => {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [r, param] = h.split('/');
  return { route: (r || 'home') as Route, param };
};

export function navigate(to: string) {
  const target = `#/${to}`;
  if (window.location.hash !== target) window.location.hash = target;
  window.scrollTo({ top: 0 });
}

export function useRoute() {
  const [state, setState] = useState(parse);
  useEffect(() => {
    const on = () => setState(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return state;
}
