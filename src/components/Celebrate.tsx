/**
 * Khoảnh khắc ăn mừng tập trung (B2/B3):
 *  - confetti CSS thuần (không lib) mỗi lần mở khóa điểm;
 *  - banner huy hiệu khi hoàn thành cả một khu;
 *  - modal finale khi đủ 9/9 điểm (một lần mỗi hành trình).
 * Lắng nghe 'mdv:unlock' do progress.ts phát – chạy cho cả QR thật lẫn nút demo.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { SITES } from '../data/content';
import type { Site } from '../data/types';
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

/** Finale cấp khu (ví dụ đủ 5/5 Văn Miếu) — một lần mỗi khu, mỗi hành trình. */
const siteFinKey = (siteId: string) => `mdv.sitefin.${siteId}`;
function siteFinSeen(siteId: string): boolean {
  try {
    return localStorage.getItem(siteFinKey(siteId)) === '1';
  } catch {
    return true;
  }
}
function markSiteFinSeen(siteId: string) {
  try {
    localStorage.setItem(siteFinKey(siteId), '1');
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
  const [siteFin, setSiteFin] = useState<{ site: Site; spotXp: number; bonusXp: number; totalXp: number } | null>(null);
  const badgeTimer = useRef(0);
  const finaleCardRef = useRef<HTMLDivElement>(null);
  const siteCardRef = useRef<HTMLDivElement>(null);
  // Banner danh hiệu: hàng đợi xếp lần lượt + chống trùng cùng id trong 4s (huy hiệu khu
  // vừa nhận qua mdv:unlock.newBadge cũng đi qua đây, event mdv:achievement sau sẽ bị lọc).
  const bannerQueue = useRef<{ id: string; name: { vi: string; en: string } }[]>([]);
  const bannerSeen = useRef(new Map<string, number>());

  useEffect(() => {
    const pump = () => {
      if (badgeTimer.current) return;
      const it = bannerQueue.current.shift();
      if (!it) return;
      setBadge({ name: t(it.name), seq: Date.now() });
      badgeTimer.current = window.setTimeout(() => {
        setBadge(null);
        badgeTimer.current = 0;
        pump();
      }, 3600);
    };
    const showBanner = (id: string, name: { vi: string; en: string }) => {
      const now = Date.now();
      if ((bannerSeen.current.get(id) ?? 0) + 4000 > now) return;
      bannerSeen.current.set(id, now);
      bannerQueue.current.push({ id, name });
      pump();
    };
    const onUnlock = (e: Event) => {
      const d = (e as CustomEvent<UnlockResult & { siteId?: string; spotId?: string }>).detail;
      if (d.gainedXp <= 0) return;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setBurst(Date.now());
      if (d.newBadge) showBanner(d.newBadge.id, d.newBadge.name);
      if (Object.keys(getProgress().unlocked).length >= TOTAL_SPOTS && !finaleSeen()) {
        markFinaleSeen();
        setFinale(true);
      } else if (d.siteCompleted && d.siteId && !siteFinSeen(d.siteId)) {
        // Đủ dấu một khu (nhưng chưa 9/9 toàn bộ) -> khoảnh khắc kết hành trình khu riêng.
        markSiteFinSeen(d.siteId);
        const s = SITES.find((x) => x.entityId === d.siteId);
        // Gom kết quả vào chính thẻ hoàn thành — không trông chờ toast bị che bên dưới.
        if (s) setSiteFin({ site: s, spotXp: d.spotXp, bonusXp: d.bonusXp, totalXp: getProgress().xp });
      }
    };
    // Danh hiệu hành trình (quiz/XP/dấu) đạt qua mọi đường — confetti + banner tên danh hiệu.
    const onAchievement = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; name: { vi: string; en: string } }>).detail;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setBurst(Date.now());
      showBanner(d.id, d.name);
    };
    window.addEventListener('mdv:unlock', onUnlock);
    window.addEventListener('mdv:achievement', onAchievement);
    return () => {
      window.removeEventListener('mdv:unlock', onUnlock);
      window.removeEventListener('mdv:achievement', onAchievement);
    };
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

  // Site finale: focus thẻ + Esc đóng.
  useEffect(() => {
    if (!siteFin) return;
    siteCardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSiteFin(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [siteFin]);

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
      {siteFin && (
        <div class="finale" role="dialog" aria-modal="true" aria-label={`${t(UI.siteDoneTitle)} ${t(siteFin.site.name)}`}>
          <div class="finale__card finale__card--site" ref={siteCardRef} tabIndex={-1}>
            <div class="finale__icon">
              <Icon name="award" size={46} />
            </div>
            <h2>
              {t(UI.siteDoneTitle)} {t(siteFin.site.name)}
            </h2>
            <p class="mdv-muted">{t(UI.siteDoneBody)}</p>
            <div class="finale__stats">
              <b>{siteFin.site.spots.length}/{siteFin.site.spots.length}</b>
              <span>{t(UI.spots)}</span>
              <i />
              <b>+{siteFin.spotXp} XP</b>
              <span>{t(UI.siteDoneStamp)}</span>
              <i />
              <b>+{siteFin.bonusXp} XP</b>
              <span>{t(UI.siteDoneBonus)}</span>
              <i />
              <b>{siteFin.totalXp} XP</b>
              <span>{t(UI.totalXp)}</span>
              <i />
              <b>{t(siteFin.site.gamificationConfig.badge.name)}</b>
            </div>
            <a class="mdv-btn mdv-btn--primary finale__cta" href={routeHref.passport} onClick={() => setSiteFin(null)}>
              <Icon name="passport" size={18} /> {t(UI.viewStamp)}
            </a>
            <button class="mdv-btn mdv-btn--ghost" onClick={() => setSiteFin(null)}>
              {t(UI.dismiss)}
            </button>
          </div>
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
