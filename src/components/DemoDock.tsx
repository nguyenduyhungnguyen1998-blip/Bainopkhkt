/**
 * DemoDock – bảng điều khiển nổi cho buổi trình diễn (kiểu cheat menu nhỏ góc màn).
 * Nút tròn nhỏ luôn nổi trên màn hình; chạm để mở/đóng panel điều khiển real-time
 * (mở/khóa điểm, đặt quiz, cộng XP, reset cờ finale) mà không rời màn hình đang demo.
 *
 * Nút chỉ hiện khi đã bật: thêm ?admin=1 vào URL (tự lưu), hoặc bật từ trang #/admin,
 * hoặc localStorage mdv.admin=1. Khách thường không bao giờ thấy.
 */
import { useEffect, useState } from 'preact/hooks';
import { SITES } from '../data/content';
import type { Site } from '../data/types';
import { t, useLang } from '../lib/i18n';
import {
  grantXp,
  isSpotUnlocked,
  quizBest,
  recordQuizResult,
  relockSpot,
  resetProgress,
  siteUnlockedCount,
  unlockSpot,
  useProgress,
} from '../lib/progress';
import { routeHref } from '../lib/router';
import { Icon } from './Icon';
import './demodock.css';

const FLAG = 'mdv.admin';

/** Bật nút nổi (gọi từ trang #/admin hoặc khi thấy ?admin=1 trên URL). */
export function enableDemoDock() {
  try {
    localStorage.setItem(FLAG, '1');
  } catch {
    /* bộ nhớ riêng tư */
  }
  window.dispatchEvent(new Event('mdv:demo-dock'));
}

function dockEnabled(): boolean {
  try {
    if (new URLSearchParams(location.search).get('admin') === '1') {
      enableDemoDock();
      return true;
    }
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export function DemoDock() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState(SITES[0]?.entityId ?? '');
  const [, tick] = useState(0);
  const [lang] = useLang();
  const p = useProgress();
  const totalSpots = SITES.reduce((n, s) => n + s.spots.length, 0);
  const doneSpots = Object.keys(p.unlocked).length;
  const site: Site | undefined = SITES.find((s) => s.entityId === siteId) ?? SITES[0];

  useEffect(() => {
    setEnabled(dockEnabled());
    const on = () => setEnabled(dockEnabled());
    window.addEventListener('mdv:demo-dock', on);
    return () => window.removeEventListener('mdv:demo-dock', on);
  }, []);

  if (!enabled) return null;

  const clearFinaleFlags = () => {
    try {
      localStorage.removeItem('mdv.finale.v1');
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('mdv.sitefin.')) localStorage.removeItem(k);
      }
    } catch {
      /* bộ nhớ riêng tư */
    }
    tick((n) => n + 1);
  };

  return (
    <div class={`demodock ${open ? 'demodock--open' : ''}`}>
      {open && (
        <div class="demodock__panel" role="dialog" aria-label="Demo control">
          <div class="demodock__head">
            <b>Demo</b>
            <span class="demodock__stat">
              {doneSpots}/{totalSpots} · {p.xp} XP
            </span>
          </div>

          <div class="demodock__row">
            <button
              class="dd__btn dd__btn--go"
              onClick={() => SITES.forEach((s) => s.spots.forEach((sp) => unlockSpot(s.entityId, sp.spotId)))}
            >
              Mở hết {totalSpots}
            </button>
            <button class="dd__btn" onClick={() => site && site.spots.forEach((sp) => unlockSpot(site.entityId, sp.spotId))}>
              Mở hết khu ({site ? siteUnlockedCount(site, p) : 0}/{site?.spots.length ?? 0})
            </button>
          </div>

          <label class="demodock__lbl">
            Khu di sản
            <select class="dd__sel" value={siteId} onChange={(e) => setSiteId((e.target as HTMLSelectElement).value)}>
              {SITES.map((s) => (
                <option key={s.entityId} value={s.entityId}>
                  {t(s.name, lang)}
                </option>
              ))}
            </select>
          </label>

          <div class="demodock__spots">
            {site?.spots.map((sp) => {
              const on = isSpotUnlocked(site.entityId, sp.spotId);
              const best = quizBest(site.entityId, sp.spotId);
              return (
                <div key={sp.spotId} class="dd__spot">
                  <button
                    class={`dd__chip ${on ? 'dd__chip--on' : ''}`}
                    onClick={() => (on ? relockSpot(site.entityId, sp.spotId) : unlockSpot(site.entityId, sp.spotId))}
                    title={on ? 'Gỡ dấu (diễn lại check-in)' : `Mở (+${sp.xp} XP)`}
                  >
                    {on ? '●' : '○'} {t(sp.name, lang)}
                  </button>
                  {sp.quiz?.length ? (
                    <button
                      class={`dd__mini ${best === sp.quiz.length ? 'dd__mini--on' : ''}`}
                      onClick={() => recordQuizResult(site.entityId, sp.spotId, sp.quiz!.length, sp.quiz!.length)}
                      title="Đặt điểm thử tài tối đa"
                    >
                      {best ?? '–'}/{sp.quiz.length}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div class="demodock__row">
            {[30, 100, 500].map((x) => (
              <button key={x} class="dd__btn" onClick={() => grantXp(x)}>
                +{x} XP
              </button>
            ))}
          </div>

          <div class="demodock__row">
            <button class="dd__btn" onClick={clearFinaleFlags}>
              Xem lại finale
            </button>
            <a class="dd__btn" href={routeHref.admin} onClick={() => setOpen(false)}>
              #/admin
            </a>
            <button
              class="dd__btn dd__btn--warn"
              onClick={() => {
                if (confirm('Xóa toàn bộ tiến độ hành trình?')) resetProgress();
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
      <button
        class="demodock__fab"
        aria-expanded={open}
        aria-label="Bảng điều khiển demo"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="spark" size={18} />
      </button>
    </div>
  );
}
