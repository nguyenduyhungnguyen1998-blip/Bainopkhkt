/**
 * Khoảnh khắc ăn mừng tập trung (B2/B3):
 *  - confetti CSS thuần (không lib) mỗi lần mở khóa điểm;
 *  - banner huy hiệu khi hoàn thành cả một khu;
 *  - modal finale khi đủ 9/9 điểm (một lần mỗi hành trình).
 * Lắng nghe 'mdv:unlock' do progress.ts phát – chạy cho cả QR thật lẫn nút demo.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { SITES } from '../data/content';
import { UI, t } from '../lib/i18n';
import { routeHref } from '../lib/router';
import { getProgress, type UnlockResult } from '../lib/progress';
import { Icon } from './Icon';
import './celebrate.css';

const FINALE_KEY = 'mdv.finale.v1';
const TOTAL_SPOTS = SITES.reduce((n, s) => n + s.spots.length, 0);

/** Mảnh giấy confetti: vị trí trái, trễ rơi, tốc, xoay, màu lấy theo bảng màu giao diện. */
interface Piece {
  left: number;
  delay: number;
  dur: number;
  rot: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
}
const COLORS = ['#FFD56A', '#C84B31', '#0FA37F', '#F4F1EA', '#E5A93B'];
const PIECES: Piece[] = Array.from({ length: 30 }, (_, i) => {
  const rnd = (seed: number) => {
    const x = Math.sin(seed * 9973 + i * 131) * 10000;
    return x - Math.floor(x);
  };
  return {
    left: rnd(1) * 100,
    delay: rnd(2) * 320,
    dur: 1300 + rnd(3) * 700,
    rot: 360 + rnd(4) * 720,
    w: 6 + rnd(5) * 8,
    h: 8 + rnd(6) * 10,
    color: COLORS[i % COLORS.length],
    round: rnd(7) > 0.6,
  };
});

function finaleSeen(): boolean {
  try {
    return localStorage.getItem(FINALE_KEY) === '1';
  } catch {
    return true; // không lưu được thì coi như đã thấy – đỡ phiền
  }
}
export function markFinaleSeen() {
  try {
    localStorage.setItem(FINALE_KEY, '1');
  } catch {
    /* bộ nhớ riêng tư */
  }
}
export function clearFinaleSeen() {
  try {
    localStorage.removeItem(FINALE_KEY);
  } catch {
    /* bộ nhớ riêng tư */
  }
}

export function Celebrate() {
  const [burst, setBurst] = useState(0);
  const [badge, setBadge] = useState<{ name: string; seq: number } | null>(null);
  const [finale, setFinale] = useState(false);
  const badgeTimer = useRef(0);
  const finaleCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onUnlock = (e: Event) => {
      const d = (e as CustomEvent<UnlockResult>).detail;
      if (d.gainedXp <= 0) return;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setBurst(Date.now());
      if (d.newBadge) {
        setBadge({ name: t(d.newBadge.name), seq: Date.now() });
        clearTimeout(badgeTimer.current);
        badgeTimer.current = window.setTimeout(() => setBadge(null), 3600);
      }
      if (Object.keys(getProgress().unlocked).length >= TOTAL_SPOTS && !finaleSeen()) {
        markFinaleSeen();
        setFinale(true);
      }
    };
    window.addEventListener('mdv:unlock', onUnlock);
    return () => window.removeEventListener('mdv:unlock', onUnlock);
  }, []);

  // Confetti tự gỡ sau khi mảnh cuối rơi xong.
  useEffect(() => {
    if (!burst) return;
    const id = window.setTimeout(() => setBurst(0), 2400);
    return () => clearTimeout(id);
  }, [burst]);

  // Finale: focus vào thẻ + Esc đóng.
  useEffect(() => {
    if (!finale) return;
    finaleCardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFinale(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finale]);

  return (
    <>
      {burst > 0 && (
        <div class="celebrate" key={burst} aria-hidden="true">
          {PIECES.map((p, i) => (
            <i
              key={i}
              style={{
                left: `${p.left}%`,
                width: `${p.w}px`,
                height: `${p.h}px`,
                background: p.color,
                borderRadius: p.round ? '50%' : '2px',
                animationDuration: `${p.dur}ms`,
                animationDelay: `${p.delay}ms`,
                ['--rot' as string]: `${p.rot}deg`,
              }}
            />
          ))}
        </div>
      )}
      {badge && (
        <div class="mbadge" key={badge.seq} role="status">
          <Icon name="award" size={20} />
          <span>
            {t(UI.badgeEarned)}: <b>{badge.name}</b>
          </span>
        </div>
      )}
      {finale && (
        <div class="finale" role="dialog" aria-modal="true" aria-label={t(UI.finaleTitle)}>
          <div class="finale__card" ref={finaleCardRef} tabIndex={-1}>
            <div class="finale__icon">
              <Icon name="award" size={52} />
            </div>
            <h2>{t(UI.finaleTitle)}</h2>
            <p class="mdv-muted">{t(UI.finaleBody)}</p>
            <div class="finale__stats">
              <b>{TOTAL_SPOTS}/{TOTAL_SPOTS}</b>
              <span>{t(UI.spots)}</span>
              <i />
              <b>{getProgress().xp}</b>
              <span>XP</span>
            </div>
            <a class="mdv-btn mdv-btn--primary finale__cta" href={routeHref.passport} onClick={() => setFinale(false)}>
              <Icon name="passport" size={18} /> {t(UI.finalePassport)}
            </a>
            <button class="mdv-btn mdv-btn--ghost" onClick={() => setFinale(false)}>
              {t(UI.dismiss)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
