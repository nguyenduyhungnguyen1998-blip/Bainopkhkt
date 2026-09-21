import { Icon } from './Icon';
import { routeHref, type Route } from '../lib/router';
import { UI, t, useLang } from '../lib/i18n';

const ITEMS = [
  { name: 'map', href: routeHref.map, icon: 'map', label: UI.map },
  { name: 'passport', href: routeHref.passport, icon: 'passport', label: UI.passport },
  { name: 'quiz', href: routeHref.quiz, icon: 'quiz', label: UI.quiz },
  { name: 'settings', href: routeHref.settings, icon: 'settings', label: UI.settings },
] as const;

export function Dock({ route }: { route: Route }) {
  const [lang] = useLang();
  // Đang xem trang điểm đến thì tab Bản đồ vẫn sáng để người dùng biết đường quay lại.
  const current = route.name === 'destination' ? 'map' : route.name;
  return (
    <nav class="mdv-dock" aria-label="Điều hướng chính">
      {ITEMS.map((it) => (
        <a
          key={it.name}
          href={it.href}
          class="mdv-dock__item"
          aria-current={current === it.name ? 'page' : undefined}
        >
          <Icon name={it.icon} />
          <span>{t(it.label, lang)}</span>
        </a>
      ))}
    </nav>
  );
}
