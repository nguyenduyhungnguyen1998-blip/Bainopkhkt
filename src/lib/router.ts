/**
 * Router dùng hash (#/map, #/d/van-mieu/khue-van-cac?s=...) để:
 *  - hoạt động khi mở từ file hoặc host tĩnh không cấu hình rewrite,
 *  - deep link từ mã QR không cần server.
 */
import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'map' }
  | { name: 'destination'; siteId: string; spotId?: string; query: URLSearchParams }
  | { name: 'passport' }
  | { name: 'quiz'; at?: string }
  | { name: 'admin' }
  | { name: 'settings' }
  | { name: 'notfound'; path: string };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/map';
  const [pathPart, queryPart = ''] = raw.split('?');
  const query = new URLSearchParams(queryPart);
  const segs = pathPart.split('/').filter(Boolean);
  switch (segs[0]) {
    case undefined:
    case 'map':
      return { name: 'map' };
    case 'd':
      if (!segs[1]) return { name: 'notfound', path: raw };
      return { name: 'destination', siteId: segs[1], spotId: segs[2], query };
    case 'passport':
      return { name: 'passport' };
    case 'quiz':
      return { name: 'quiz', at: query.get('at') ?? undefined };
    case 'admin':
      return { name: 'admin' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'notfound', path: raw };
  }
}

export function navigate(path: string, replace = false) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const routeHref = {
  map: '#/map',
  passport: '#/passport',
  quiz: '#/quiz',
  /** Mở thẳng quiz của một điểm — dùng cho CTA "thử tài tại đây" cuối nội dung. */
  quizAt: (siteId: string, spotId: string) => `#/quiz?at=${siteId}/${spotId}`,
  /** Bảng điều khiển demo – chỉ gõ URL, không nằm trong dock. */
  admin: '#/admin',
  settings: '#/settings',
  destination: (siteId: string, spotId?: string) => `#/d/${siteId}${spotId ? `/${spotId}` : ''}`,
};
