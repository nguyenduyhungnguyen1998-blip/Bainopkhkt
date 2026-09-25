/**
 * DemoDock – bảng điều khiển nổi cho buổi trình diễn (kiểu cheat menu nhỏ góc màn).
 * Nút tròn nhỏ luôn nổi trên màn hình; chạm để mở/đóng panel điều khiển real-time
 * (mở/khóa điểm, đặt quiz, cộng XP, diễn lại finale, reset) mà không rời màn hình đang demo.
 * Kéo-thả: giữ nút (hoặc tay cầm đầu panel) rồi kéo tới vị trí thuận tay – lưu vị trí trên máy.
 *
 * Nút chỉ hiện khi đã bật: thêm ?admin=1 vào URL (tự lưu), vào trang #/admin (tự bật),
 * hoặc localStorage mdv.admin=1. Khách thường không bao giờ thấy.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { SITES, getSite, getSpot } from '../data/content';
import type { Site } from '../data/types';
import { t, useLang } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import {
  clearQuizResults,
  computeAchievements,
  grantXp,
  isSpotUnlocked,
  quizBest,
  recordQuizResult,
  relockAll,
  relockSpot,
  resetProgress,
  siteUnlockedCount,
  unlockSpot,
  useProgress,
} from '../lib/progress';
import { routeHref, useRoute } from '../lib/router';
import { Icon } from './Icon';
import './demodock.css';

const FLAG = 'mdv.admin';
const POS_KEY = 'mdv.dockpos';
const FAB = 44; // px – kích thước nút tròn

/** Bật nút nổi (gọi từ trang #/admin hoặc khi thấy ?admin=1 trên URL). */
export function enableDemoDock() {
  try {
    localStorage.setItem(FLAG, '1');
  } catch {
    /* bộ nhớ riêng tư */
  }
  window.dispatchEvent(new Event('mdv:demo-dock'));
}

/** Ẩn nút nổi cho đến khi bật lại (nút "Ẩn bảng" trong tab Hệ thống). */
function disableDemoDock() {
  try {
    localStorage.removeItem(FLAG);
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

type Pos = { x: number; y: number };
type Tab = 'stamps' | 'quiz' | 'xp' | 'finale' | 'sys';

function loadPos(): Pos | null {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) || 'null') as Pos | null;
    return raw && Number.isFinite(raw.x) && Number.isFinite(raw.y) ? raw : null;
  } catch {
    return null;
  }
}

const clampPos = (p: Pos): Pos => ({
  x: Math.min(Math.max(6, p.x), Math.max(6, window.innerWidth - FAB - 6)),
  y: Math.min(Math.max(6, p.y), Math.max(6, window.innerHeight - FAB - 6)),
});

/** Vị trí mặc định (góc phải, ngay trên dock). */
const defaultPos = (): Pos => ({
  x: Math.max(6, window.innerWidth - 12 - FAB),
  y: Math.max(6, window.innerHeight - 90 - FAB),
});

export function DemoDock() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('stamps');
  const [pos, setPos] = useState<Pos | null>(null);
  const [, tick] = useState(0);
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  const route = useRoute();
  const p = useProgress();
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  const totalSpots = SITES.reduce((n, s) => n + s.spots.length, 0);
  const doneSpots = Object.keys(p.unlocked).length;
  const quizSets = Object.keys(p.quizDone).length;
  const eff = pos ?? defaultPos();

  useEffect(() => {
    setEnabled(dockEnabled());
    setPos(loadPos());
    const on = () => setEnabled(dockEnabled());
    window.addEventListener('mdv:demo-dock', on);
    return () => window.removeEventListener('mdv:demo-dock', on);
  }, []);

  if (!enabled) return null;

  /* Kéo-thả chia sẻ cho nút tròn và tay cầm đầu panel. */
  const startDrag = (e: PointerEvent, onTap?: () => void) => {
    if ((e.target as Element).closest('button.dd__x')) return; // nút đóng vẫn bấm được
    e.preventDefault();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: eff.x, oy: eff.y, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
      if (d.moved) setPos(clampPos({ x: d.ox + dx, y: d.oy + dy }));
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (d?.moved) {
        // vị trí mới nhất đã nằm trong state pos (setPos ở move) -> persist ra localStorage
        setPos((cur) => {
          const v = clampPos(cur ?? defaultPos());
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(v));
          } catch {
            /* bộ nhớ riêng tư */
          }
          return v;
        });
      } else {
        onTap?.();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const unlockAll = () => SITES.forEach((s) => s.spots.forEach((sp) => unlockSpot(s.entityId, sp.spotId)));
  const maxQuizAll = () =>
    SITES.forEach((s) => s.spots.forEach((sp) => sp.quiz?.length && recordQuizResult(s.entityId, sp.spotId, sp.quiz.length, sp.quiz.length)));

  /**
   * Diễn lại finale: đảm bảo mọi điểm đã mở -> xóa cờ "đã xem" -> gỡ 1 điểm cuối
   * rồi mở lại -> sự kiện unlock siteCompleted bắn ra -> modal finale chạy ngay.
   */
  const replaySiteFinale = (site: Site) => {
    try {
      localStorage.removeItem(`mdv.sitefin.${site.entityId}`);
      if (site.entityId === SITES[SITES.length - 1]?.entityId) localStorage.removeItem('mdv.finale.v1');
    } catch {
      /* bộ nhớ riêng tư */
    }
    site.spots.forEach((sp) => unlockSpot(site.entityId, sp.spotId));
    const last = site.spots[site.spots.length - 1];
    relockSpot(site.entityId, last.spotId);
    unlockSpot(site.entityId, last.spotId);
    tick((n) => n + 1);
  };

  const replayGrandFinale = () => {
    try {
      localStorage.removeItem('mdv.finale.v1');
    } catch {
      /* bộ nhớ riêng tư */
    }
    SITES.forEach((s) => s.spots.forEach((sp) => unlockSpot(s.entityId, sp.spotId)));
    const site = SITES[SITES.length - 1];
    const last = site.spots[site.spots.length - 1];
    relockSpot(site.entityId, last.spotId);
    unlockSpot(site.entityId, last.spotId);
    tick((n) => n + 1);
  };

  const finaleSeen = (key: string) => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  };

  // Bố trí panel theo phía còn chỗ: gần mép phải -> mở sang trái, nửa dưới màn -> mở lên trên.
  const panelStyle: Record<string, string> = {};
  if (eff.x + FAB > window.innerWidth - 350) panelStyle.right = '0';
  else panelStyle.left = '0';
  if (eff.y > window.innerHeight * 0.55) panelStyle.bottom = 'calc(100% + 8px)';
  else panelStyle.top = 'calc(100% + 8px)';

  const achievements = computeAchievements(p);

  /* Ngữ cảnh màn hình: panel "ăn theo" trang đang mở – hiện đúng điểm/khu và hành động liên quan. */
  const ctx = (() => {
    if (route.name === 'destination') {
      if (route.spotId) {
        const found = getSpot(route.siteId, route.spotId);
        if (found) return { kind: 'spot' as const, ...found };
      }
      const site = getSite(route.siteId);
      if (site) return { kind: 'site' as const, site };
    }
    if (route.name === 'quiz' && route.at) {
      const [sid, spid] = route.at.split('/');
      const found = getSpot(sid, spid);
      if (found) return { kind: 'spot' as const, ...found };
    }
    if (route.name === 'map') {
      // Điểm kế tiếp = điểm chưa mở đầu tiên theo thứ tự hành trình.
      for (const s of SITES)
        for (const sp of s.spots) if (!isSpotUnlocked(s.entityId, sp.spotId)) return { kind: 'next' as const, site: s, spot: sp };
      return { kind: 'all-done' as const };
    }
    if (route.name === 'passport') return { kind: 'passport' as const };
    return undefined;
  })();

  return (
    <div class="demodock" style={pos ? { left: `${pos.x}px`, top: `${pos.y}px`, right: 'auto', bottom: 'auto' } : undefined}>
      {open && (
        <div class="demodock__panel" role="dialog" aria-label="Bảng điều khiển demo" style={panelStyle}>
          <div
            class="demodock__head"
            title="Giữ và kéo để di chuyển bảng"
            onPointerDown={(e) => startDrag(e)}
          >
            <span class="dd__grip">⋮⋮</span>
            <b>Điều khiển demo</b>
            <span class="demodock__stat">
              {doneSpots}/{totalSpots} · {p.xp} XP
            </span>
            <button class="dd__x" aria-label="Đóng" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          {ctx && (
            <div class="dd__ctx">
              {ctx.kind === 'spot' && (
                <>
                  <div class="dd__ctxtop">
                    <b>{t(ctx.spot.name, lang)}</b>
                    <span>
                      {t(ctx.site.name, lang)} · {isSpotUnlocked(ctx.site.entityId, ctx.spot.spotId) ? '● đã ghé' : '○ chưa ghé'} · quiz{' '}
                      {quizBest(ctx.site.entityId, ctx.spot.spotId) ?? '–'}/{ctx.spot.quiz?.length ?? 0}
                    </span>
                  </div>
                  <div class="dd__row">
                    {isSpotUnlocked(ctx.site.entityId, ctx.spot.spotId) ? (
                      <button class="dd__btn" onClick={() => relockSpot(ctx.site.entityId, ctx.spot.spotId)}>
                        Gỡ dấu
                      </button>
                    ) : (
                      <button class="dd__btn dd__btn--go" onClick={() => unlockSpot(ctx.site.entityId, ctx.spot.spotId)}>
                        ✓ Nhận dấu +{ctx.spot.xp}
                      </button>
                    )}
                    {ctx.spot.quiz?.length ? (
                      <button
                        class="dd__btn"
                        onClick={() => recordQuizResult(ctx.site.entityId, ctx.spot.spotId, ctx.spot.quiz!.length, ctx.spot.quiz!.length)}
                      >
                        Đủ quiz
                      </button>
                    ) : null}
                    <a class="dd__btn" href={routeHref.quizAt(ctx.site.entityId, ctx.spot.spotId)} onClick={() => setOpen(false)}>
                      Quiz ▸
                    </a>
                    <button class="dd__btn" onClick={() => replaySiteFinale(ctx.site)}>
                      Finale khu
                    </button>
                  </div>
                </>
              )}
              {ctx.kind === 'site' && (
                <>
                  <div class="dd__ctxtop">
                    <b>{t(ctx.site.name, lang)}</b>
                    <span>
                      {siteUnlockedCount(ctx.site, p)}/{ctx.site.spots.length} điểm
                    </span>
                  </div>
                  <div class="dd__row">
                    <button class="dd__btn dd__btn--go" onClick={() => ctx.site.spots.forEach((sp) => unlockSpot(ctx.site.entityId, sp.spotId))}>
                      Mở hết khu
                    </button>
                    <button class="dd__btn" onClick={() => ctx.site.spots.forEach((sp) => relockSpot(ctx.site.entityId, sp.spotId))}>
                      Gỡ hết
                    </button>
                    <button class="dd__btn" onClick={() => replaySiteFinale(ctx.site)}>
                      Diễn finale
                    </button>
                  </div>
                </>
              )}
              {ctx.kind === 'next' && (
                <>
                  <div class="dd__ctxtop">
                    <b>Bản đồ · điểm kế tiếp</b>
                    <span>
                      {t(ctx.spot.name, lang)} · {t(ctx.site.name, lang)}
                    </span>
                  </div>
                  <div class="dd__row">
                    <button class="dd__btn dd__btn--go" onClick={() => unlockSpot(ctx.site.entityId, ctx.spot.spotId)}>
                      ✓ Mở điểm này +{ctx.spot.xp}
                    </button>
                    <a class="dd__btn" href={routeHref.destination(ctx.site.entityId, ctx.spot.spotId)} onClick={() => setOpen(false)}>
                      Xem điểm ▸
                    </a>
                  </div>
                </>
              )}
              {ctx.kind === 'all-done' && (
                <div class="dd__ctxtop">
                  <b>Bản đồ · 9/9</b>
                  <span>Hành trình hoàn tất — diễn lại finale ở tab Finale.</span>
                </div>
              )}
              {ctx.kind === 'passport' && (
                <div class="dd__ctxtop">
                  <b>Hộ chiếu · {doneSpots}/{totalSpots}</b>
                  <span>{p.xp} XP · {p.badges.length} huy hiệu khu</span>
                </div>
              )}
            </div>
          )}

          <div class="demodock__tabs" role="tablist">
            {(
              [
                ['stamps', 'Dấu'],
                ['quiz', 'Quiz'],
                ['xp', 'XP'],
                ['finale', 'Finale'],
                ['sys', '⚙'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                class={`dd__tab ${tab === id ? 'dd__tab--on' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div class="demodock__body">
            {tab === 'stamps' && (
              <>
                <div class="dd__row">
                  <button class="dd__btn dd__btn--go" onClick={unlockAll}>
                    Mở hết {totalSpots} điểm
                  </button>
                  <button
                    class="dd__btn"
                    onClick={() => {
                      if (confirm('Gỡ dấu mọi điểm? (giữ XP/huy hiệu/quiz)')) relockAll();
                    }}
                  >
                    Gỡ hết dấu
                  </button>
                </div>
                {SITES.map((s) => {
                  const done = siteUnlockedCount(s, p);
                  return (
                    <div key={s.entityId} class="dd__site">
                      <div class="dd__sitehead">
                        <span class="dd__sitename">
                          {t(s.name, lang)} <i>{done}/{s.spots.length}</i>
                        </span>
                        <span class="dd__siteact">
                          <button class="dd__mini" onClick={() => s.spots.forEach((sp) => unlockSpot(s.entityId, sp.spotId))}>
                            Mở hết
                          </button>
                          <button class="dd__mini" onClick={() => s.spots.forEach((sp) => relockSpot(s.entityId, sp.spotId))}>
                            Gỡ hết
                          </button>
                        </span>
                      </div>
                      <div class="dd__chips">
                        {s.spots.map((sp) => {
                          const on = isSpotUnlocked(s.entityId, sp.spotId);
                          return (
                            <button
                              key={sp.spotId}
                              class={`dd__chip ${on ? 'dd__chip--on' : ''}`}
                              onClick={() => (on ? relockSpot(s.entityId, sp.spotId) : unlockSpot(s.entityId, sp.spotId))}
                              title={on ? 'Gỡ dấu để diễn lại check-in' : `Mở ngay (+${sp.xp} XP)`}
                            >
                              {on ? '●' : '○'} {t(sp.name, lang)} <i>+{sp.xp}</i>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab === 'quiz' && (
              <>
                <div class="dd__row">
                  <button class="dd__btn dd__btn--go" onClick={maxQuizAll}>
                    Đặt đủ quiz cả app
                  </button>
                  <button
                    class="dd__btn"
                    onClick={() => {
                      if (confirm('Xóa mọi điểm quiz? (giữ dấu + XP)')) clearQuizResults();
                    }}
                  >
                    Xóa quiz
                  </button>
                </div>
                <p class="dd__note">Đã làm {quizSets} bộ · mỗi câu đúng +5 XP (chỉ tính phần vượt best).</p>
                {SITES.map((s) => (
                  <div key={s.entityId} class="dd__site">
                    <div class="dd__sitehead">
                      <span class="dd__sitename">{t(s.name, lang)}</span>
                      <button
                        class="dd__mini"
                        onClick={() =>
                          s.spots.forEach((sp) => sp.quiz?.length && recordQuizResult(s.entityId, sp.spotId, sp.quiz.length, sp.quiz.length))
                        }
                      >
                        Đủ cả khu
                      </button>
                    </div>
                    <div class="dd__chips">
                      {s.spots.map((sp) => {
                        const total = sp.quiz?.length ?? 0;
                        const best = quizBest(s.entityId, sp.spotId);
                        if (!total) return null;
                        return (
                          <button
                            key={sp.spotId}
                            class={`dd__chip ${best === total ? 'dd__chip--on' : ''}`}
                            onClick={() => recordQuizResult(s.entityId, sp.spotId, total, total)}
                            title="Đặt điểm quiz tối đa"
                          >
                            {t(sp.name, lang)} <i>{best ?? '–'}/{total}</i>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === 'xp' && (
              <>
                <div class="dd__big">{p.xp} XP</div>
                <div class="dd__row">
                  {[30, 100, 500].map((x) => (
                    <button key={x} class="dd__btn dd__btn--go" onClick={() => grantXp(x)}>
                      +{x}
                    </button>
                  ))}
                  <button class="dd__btn" onClick={() => grantXp(-100)}>
                    −100
                  </button>
                </div>
                <p class="dd__note">Huy hiệu khu ({p.badges.length}):</p>
                <div class="dd__chips">
                  {SITES.map((s) => {
                    const got = p.badges.includes(s.gamificationConfig.badge.id);
                    return (
                      <span key={s.entityId} class={`dd__chip dd__chip--static ${got ? 'dd__chip--on' : ''}`}>
                        {got ? '●' : '○'} {t(s.gamificationConfig.badge.name, lang)}
                      </span>
                    );
                  })}
                </div>
                <p class="dd__note">Huy hiệu thành tích:</p>
                <div class="dd__chips">
                  {achievements.map((a) => (
                    <span key={a.id} class={`dd__chip dd__chip--static ${a.unlocked ? 'dd__chip--on' : ''}`} title={t(a.need, lang)}>
                      {a.unlocked ? '●' : '○'} {t(a.name, lang)}
                    </span>
                  ))}
                </div>
              </>
            )}

            {tab === 'finale' && (
              <>
                <p class="dd__note">
                  Diễn lại = tự mở đủ điểm của khu, xóa cờ đã-xem rồi kích hoạt lại — modal ăn mừng chạy ngay trên màn hình.
                </p>
                {SITES.map((s) => (
                  <div key={s.entityId} class="dd__sitehead dd__sitehead--row">
                    <span class="dd__sitename">
                      {t(s.name, lang)} <i>{siteUnlockedCount(s, p)}/{s.spots.length}{finaleSeen(`mdv.sitefin.${s.entityId}`) ? ' · đã xem' : ''}</i>
                    </span>
                    <button class="dd__mini" onClick={() => replaySiteFinale(s)}>
                      Diễn lại
                    </button>
                  </div>
                ))}
                <div class="dd__sitehead dd__sitehead--row">
                  <span class="dd__sitename">
                    <b>Finale 9/9 toàn bộ</b> <i>{finaleSeen('mdv.finale.v1') ? 'đã xem' : ''}</i>
                  </span>
                  <button class="dd__mini dd__mini--on" onClick={replayGrandFinale}>
                    Diễn lại
                  </button>
                </div>
              </>
            )}

            {tab === 'sys' && (
              <>
                <div class="dd__row">
                  <button class="dd__btn" onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>
                    Ngôn ngữ: {lang === 'vi' ? 'VI' : 'EN'}
                  </button>
                  <button class="dd__btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? '☀ Sáng' : '☾ Tối'}
                  </button>
                </div>
                <div class="dd__row">
                  <a class="dd__btn" href={routeHref.map} onClick={() => setOpen(false)}>
                    #/map
                  </a>
                  <a class="dd__btn" href={routeHref.passport} onClick={() => setOpen(false)}>
                    #/passport
                  </a>
                  <a class="dd__btn" href={routeHref.admin} onClick={() => setOpen(false)}>
                    #/admin
                  </a>
                  <a class="dd__btn" href="qr-sheet.html" target="_blank" rel="noreferrer">
                    Tem QR
                  </a>
                </div>
                <div class="dd__row">
                  <button
                    class="dd__btn"
                    onClick={() => {
                      try {
                        localStorage.removeItem(POS_KEY);
                      } catch {
                        /* bộ nhớ riêng tư */
                      }
                      setPos(null);
                    }}
                  >
                    Nút về góc cũ
                  </button>
                  <button
                    class="dd__btn"
                    onClick={() => {
                      disableDemoDock();
                      setOpen(false);
                    }}
                  >
                    Ẩn bảng này
                  </button>
                </div>
                <div class="dd__row">
                  <button
                    class="dd__btn dd__btn--warn"
                    onClick={() => {
                      if (confirm('Xóa TOÀN BỘ tiến độ (dấu + quiz + XP + huy hiệu)?')) resetProgress();
                    }}
                  >
                    Reset hành trình
                  </button>
                </div>
                <p class="dd__note">Giữ nút tròn rồi kéo để đổi vị trí. Bật lại sau khi ẩn: thêm ?admin=1 vào URL hoặc vào #/admin.</p>
              </>
            )}
          </div>
        </div>
      )}
      <button
        class={`demodock__fab ${drag.current?.moved ? 'demodock__fab--drag' : ''}`}
        aria-expanded={open}
        aria-label="Bảng điều khiển demo (chạm: mở, giữ & kéo: di chuyển)"
        title="Bảng điều khiển demo · giữ & kéo để di chuyển"
        onPointerDown={(e) => startDrag(e, () => setOpen((v) => !v))}
      >
        <Icon name="spark" size={18} />
      </button>
    </div>
  );
}
