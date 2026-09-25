import { lazy, Suspense } from 'preact/compat';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { useRoute } from './lib/router';
import { useOnline } from './lib/theme';
import { UI, t, useLang } from './lib/i18n';
import { Dock } from './components/Dock';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Celebrate } from './components/Celebrate';
import { applySwUpdate, useSwStatus } from './lib/sw';
import { isDebug } from './lib/debug';
import { MapScreen } from './screens/MapScreen';
import { DestinationScreen } from './screens/DestinationScreen';
import { AdminScreen, PassportScreen, QuizScreen, SettingsScreen } from './screens/OtherScreens';
import { getSite } from './data/content';

// Debug HUD tách chunk riêng: chỉ tải khi ?debug=1 hoặc localStorage mdv.debug=1
const DebugHud = lazy(() => import('./debug/hud').then((m) => ({ default: m.DebugHud })));

function useDebugFlag(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isDebug());
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
  // useLayoutEffect để cuộn chạy TRƯỚC paint – không còn 1 frame nội dung mới nằm giữa trang.
  const routeKey =
    route.name === 'destination' ? `d:${route.siteId}/${route.spotId ?? ''}?${route.query}` : route.name === 'notfound' ? route.path : route.name;
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

  // Backdrop nhuộm theo site đang xem (ExperienceBackdrop "lite"): một lớp cố định
  // dưới nội dung, đổi --site-tint -> transition mượt giữa các site.
  const site = route.name === 'destination' ? getSite(route.siteId) : undefined;
  const tint = site?.tint ?? 'transparent';
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--site-tint', tint);
  }, [tint]);

  let screen;
  switch (route.name) {
    case 'map':
      screen = <MapScreen />;
      break;
    case 'destination':
      // Khoá theo siteId: đổi điểm trong cùng khu KHÔNG remount -> không chạy lại
      // animation vào màn (trước đây giống reload trang mỗi lần đổi điểm).
      screen = <DestinationScreen key={route.siteId} siteId={route.siteId} spotId={route.spotId} query={route.query} />;
      break;
    case 'passport':
      screen = <PassportScreen />;
      break;
    case 'quiz':
      // key theo `at`: CTA "thử tài tại đây" đổi điểm phải remount QuizScreen,
      // nếu không `active` state cũ giữ điểm trước.
      screen = <QuizScreen key={route.at ?? ''} at={route.at} />;
      break;
    case 'admin':
      screen = <AdminScreen />;
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
      <div class="mdv-backdrop" aria-hidden="true" />
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
