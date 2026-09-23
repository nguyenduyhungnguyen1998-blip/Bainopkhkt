import { lazy, Suspense } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { useRoute } from './lib/router';
import { useOnline } from './lib/theme';
import { UI, t, useLang } from './lib/i18n';
import { Dock } from './components/Dock';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Celebrate } from './components/Celebrate';
import { applySwUpdate, useSwStatus } from './lib/sw';
import { MapScreen } from './screens/MapScreen';
import { DestinationScreen } from './screens/DestinationScreen';
import { PassportScreen, QuizScreen, SettingsScreen } from './screens/OtherScreens';

// Debug HUD tách chunk riêng: chỉ tải khi ?debug=1 hoặc localStorage mdv.debug=1
const DebugHud = lazy(() => import('./debug/hud').then((m) => ({ default: m.DebugHud })));

function useDebugFlag(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('debug');
    let ls: string | null = null;
    try {
      ls = localStorage.getItem('mdv.debug');
      if (q === '1') localStorage.setItem('mdv.debug', '1');
      if (q === '0') localStorage.removeItem('mdv.debug');
    } catch {
      /* ignore */
    }
    setOn(q === '1' || (q !== '0' && ls === '1'));
  }, []);
  return on;
}

/** Kính mờ tự tắt khi máy yếu (P2): đo FPS ~1.5s đầu, dưới ngưỡng thì bỏ backdrop-filter. */
function usePerfGuard() {
  useEffect(() => {
    let frames = 0;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const el = performance.now() - t0;
      if (el >= 1500) {
        if ((frames / el) * 1000 < 35) document.documentElement.dataset.noBlur = '1';
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

export function App() {
  const route = useRoute();
  const online = useOnline();
  const [lang] = useLang();
  const debug = useDebugFlag();
  const { hasUpdate } = useSwStatus();
  usePerfGuard();

  // Đổi màn hình (kể cả đổi điểm trong cùng khu) → trả cuộn về đầu trang.
  const routeKey =
    route.name === 'destination' ? `d:${route.siteId}/${route.spotId ?? ''}?${route.query}` : route.name === 'notfound' ? route.path : route.name;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

  let screen;
  switch (route.name) {
    case 'map':
      screen = <MapScreen />;
      break;
    case 'destination':
      screen = <DestinationScreen key={`${route.siteId}/${route.spotId}`} siteId={route.siteId} spotId={route.spotId} query={route.query} />;
      break;
    case 'passport':
      screen = <PassportScreen />;
      break;
    case 'quiz':
      screen = <QuizScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    default:
      screen = (
        <main class="mdv-screen">
          <h1>404</h1>
          <p class="mdv-muted">{route.path}</p>
          <a class="mdv-btn mdv-btn--primary" href="#/map">
            {t(UI.map, lang)}
          </a>
        </main>
      );
  }

  return (
    <>
      <div class="mdv-bg-pattern" aria-hidden="true" />
      {!online && <div class="mdv-offline-bar" role="status">{t(UI.offline, lang)}</div>}
      <ErrorBoundary>{screen}</ErrorBoundary>
      {hasUpdate && (
        <div class="mdv-update-bar" role="status">
          <span>{t(UI.updateReady, lang)}</span>
          <button class="mdv-chip" onClick={applySwUpdate}>
            {t(UI.updateNow, lang)}
          </button>
        </div>
      )}
      <Celebrate />
      <Dock route={route} />
      {debug && (
        <Suspense fallback={null}>
          <DebugHud />
        </Suspense>
      )}
    </>
  );
}
