/**
 * D1 – Debug HUD. Chỉ được tải khi có ?debug=1 (hoặc localStorage mdv.debug=1),
 * nằm trong chunk riêng để không lọt vào đường tải chính của production.
 */
import { useEffect, useState } from 'preact/hooks';
import { useOnline, useTheme } from '../lib/theme';
import { useProgress, resetProgress, unlockSpot, computeStatuses } from '../lib/progress';
import { SITES } from '../data/content';
import { clearErrors, exportErrorsJson, getErrors, onErrorsChange, logError } from './errorlog';
import { navigate } from '../lib/router';
import './hud.css';

function useFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function useSwState(): string {
  const [s, set] = useState('n/a');
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return set('unsupported');
    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return set('none');
      set(r.active ? 'active' : r.installing ? 'installing' : r.waiting ? 'waiting' : 'registered');
    });
  }, []);
  return s;
}

function useErrorCount(): number {
  const [n, set] = useState(getErrors().length);
  useEffect(() => onErrorsChange(() => set(getErrors().length)), []);
  return n;
}

export function DebugHud() {
  const [open, setOpen] = useState(true);
  const online = useOnline();
  const [theme, setTheme] = useTheme();
  const progress = useProgress();
  const fps = useFps();
  const sw = useSwState();
  const errors = useErrorCount();
  const statuses = computeStatuses(progress);
  const next = SITES.find((s) => statuses.get(s.entityId) === 'next' || statuses.get(s.entityId) === 'active');

  const unlockNext = () => {
    if (!next) return;
    const spot = next.spots.find((sp) => !(`${next.entityId}/${sp.spotId}` in progress.unlocked));
    if (spot) unlockSpot(next.entityId, spot.spotId);
  };

  const download = () => {
    const blob = new Blob([exportErrorsJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mdv-errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fpsClass = fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad';

  return (
    <aside class={`hud ${open ? '' : 'hud--min'}`} aria-label="Debug HUD">
      <button class="hud__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? 'HUD ▾' : `HUD ▸ ${fps}fps ${errors ? `⚠${errors}` : ''}`}
      </button>
      {open && (
        <div class="hud__body">
          <div class="hud__grid">
            <span>net</span>
            <b class={online ? 'ok' : 'bad'}>{online ? 'online' : 'offline'}</b>
            <span>sw</span>
            <b>{sw}</b>
            <span>fps</span>
            <b class={fpsClass}>{fps}</b>
            <span>xp</span>
            <b>{progress.xp}</b>
            <span>unlocked</span>
            <b>{Object.keys(progress.unlocked).length}</b>
            <span>errors</span>
            <b class={errors ? 'bad' : 'ok'}>{errors}</b>
            <span>theme</span>
            <b>{theme}</b>
            <span>route</span>
            <b class="hud__mono">{location.hash || '#/'}</b>
          </div>
          <div class="hud__actions">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Đổi theme</button>
            <button onClick={unlockNext} disabled={!next}>
              Mở điểm kế tiếp
            </button>
            <button onClick={() => resetProgress()}>Reset tiến độ</button>
            <button onClick={() => logError('manual', 'Test error từ HUD')}>Tạo lỗi thử</button>
            <button onClick={download} disabled={!errors}>
              Xuất log
            </button>
            <button onClick={() => clearErrors()} disabled={!errors}>
              Xóa log
            </button>
            <button onClick={() => navigate('/map')}>→ map</button>
          </div>
        </div>
      )}
    </aside>
  );
}
