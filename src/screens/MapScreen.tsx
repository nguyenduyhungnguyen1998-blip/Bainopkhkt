import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { VietnamMap, buildNodes, type MapFocus, type MapNode } from '../map/VietnamMap';
import { SiteLevelMap } from '../map/SiteLevelMap';
import { MAP_WIDTH, MAP_HEIGHT } from '../map/vietnam-geometry';
import type { Transform } from '../map/geometry-utils';
import { SITES } from '../data/content';
import { computeStatuses, isSpotUnlocked, siteUnlockedCount, unlockSpot, useProgress, type UnlockResult } from '../lib/progress';
import { UI, t, useLang } from '../lib/i18n';
import { navigate, routeHref } from '../lib/router';
import { Icon } from '../components/Icon';
import './map-screen.css';

const FILTERS: { id: MapFocus; label: keyof typeof UI }[] = [
  { id: 'all', label: 'all' },
  { id: 'bac', label: 'north' },
  { id: 'trung', label: 'central' },
  { id: 'nam', label: 'south' },
  { id: 'journey', label: 'myJourney' },
];

const SEEN_KEY = 'mdv.seen';
const HINT_KEY = 'mdv.hintDone';
const SHEET_PEEK = 0.4; // 40% chiều cao màn hình
const SHEET_FULL = 0.9; // 90% khi kéo lên
const SITE_ZOOM_K = 4.6; // zoom sâu hơn mức này vào khu nhiều điểm -> mở sơ đồ cấp 2

export function MapScreen() {
  const [lang] = useLang();
  const progress = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus>('all');
  const [siteLevel, setSiteLevel] = useState<string | null>(null); // entityId của khu đang xem sơ đồ
  const [hintOn, setHintOn] = useState(() => {
    try {
      return !localStorage.getItem(HINT_KEY);
    } catch {
      return true;
    }
  });
  const [cinema] = useState(() => {
    try {
      return !localStorage.getItem(SEEN_KEY);
    } catch {
      return true;
    }
  });
  const [homeSignal, setHomeSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState({ d: 1, n: 0 });
  const [nextOffscreen, setNextOffscreen] = useState(false);
  const [toast, setToast] = useState<{ xp: number; seq: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const toastTimer = useRef(0);

  const statuses = useMemo(() => computeStatuses(progress), [progress]);
  const progressBySite = useMemo(
    () => new Map(SITES.map((s) => [s.entityId, siteUnlockedCount(s, progress) / s.spots.length])),
    [progress]
  );
  const nodes = useMemo(() => buildNodes(statuses, progressBySite), [statuses, progressBySite]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const selected = selectedId ? SITES.find((s) => s.entityId === selectedId) : undefined;
  const levelSite = siteLevel ? SITES.find((s) => s.entityId === siteLevel) : undefined;
  const selectedStatus = selected ? statuses.get(selected.entityId) : undefined;
  const unlockedSpots = Object.keys(progress.unlocked).length;
  const totalSpots = SITES.reduce((n, s) => n + s.spots.length, 0);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* bộ nhớ riêng tư */
    }
  };
  // Hint "Chạm điểm sáng" chỉ tắt khi user thật sự tương tác (tap node / bấm ✕) – không chết khi camera hạ cánh.
  const dismissHint = () => {
    setHintOn(false);
    markSeen();
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* bộ nhớ riêng tư */
    }
  };

  // Toast XP sau mỗi lần mở khóa (chuỗi ăn mừng phần hình ảnh nằm trong bản đồ).
  useEffect(() => {
    const onUnlock = (e: Event) => {
      const d = (e as CustomEvent<UnlockResult>).detail;
      if (d.gainedXp <= 0) return;
      clearTimeout(toastTimer.current);
      setToast({ xp: d.gainedXp, seq: Date.now() });
      toastTimer.current = window.setTimeout(() => setToast(null), 2400);
    };
    window.addEventListener('mdv:unlock', onUnlock);
    return () => window.removeEventListener('mdv:unlock', onUnlock);
  }, []);

  // Phát hiện node "kế tiếp" ra khỏi khung nhìn -> hiện nút Về hành trình;
  // zoom rất sâu vào khu có nhiều điểm -> mở sơ đồ cấp 2.
  const offscreenRef = useRef(false);
  const onMapTransform = (t: Transform) => {
    if (siteLevel) return;
    const next: MapNode | undefined =
      nodesRef.current.find((n) => n.status === 'next') ?? nodesRef.current.find((n) => n.status === 'active');
    let off = false;
    if (next) {
      const sx = next.x * t.k + t.tx;
      const sy = next.y * t.k + t.ty;
      off = sx < -40 || sy < -40 || sx > MAP_WIDTH + 40 || sy > MAP_HEIGHT + 40;
    }
    if (off !== offscreenRef.current) {
      offscreenRef.current = off;
      setNextOffscreen(off);
    }
    if (t.k > SITE_ZOOM_K) {
      const cx = (MAP_WIDTH / 2 - t.tx) / t.k;
      const cy = (MAP_HEIGHT / 2 - t.ty) / t.k;
      let best: MapNode | null = null;
      let bestD = Infinity;
      for (const n of nodesRef.current) {
        const d = Math.hypot(n.x - cx, n.y - cy);
        if (d < bestD) {
          best = n;
          bestD = d;
        }
      }
      if (best && best.site.spots.length > 1) {
        setSelectedId(null);
        setSiteLevel(best.site.entityId);
      }
    }
  };

  // Demo: mô phỏng quét QR tại điểm đầu tiên chưa mở của khu đang chọn (P3 thay bằng camera + xác thực).
  const simulateScan = () => {
    if (!selected) return;
    const spot = selected.spots.find((sp) => !(`${selected.entityId}/${sp.spotId}` in progress.unlocked));
    if (spot) unlockSpot(selected.entityId, spot.spotId);
  };

  // Kéo bottom sheet: 40% <-> 90%, kéo xuống mạnh từ mức thấp để đóng.
  const sheetDrag = useRef<{ y0: number; base: number; moved: boolean } | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const onSheetPointerDown = (e: PointerEvent) => {
    sheetDrag.current = { y0: e.clientY, base: expanded ? SHEET_FULL : SHEET_PEEK, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onSheetPointerMove = (e: PointerEvent) => {
    const d = sheetDrag.current;
    if (!d || !sheetRef.current) return;
    const dy = e.clientY - d.y0;
    if (Math.abs(dy) > 6) d.moved = true;
    sheetRef.current.style.transform = `translate(-50%, ${Math.max(dy, -sheetRef.current.offsetHeight)}px)`;
    sheetRef.current.style.transition = 'none';
  };
  const onSheetPointerUp = (e: PointerEvent) => {
    const d = sheetDrag.current;
    sheetDrag.current = null;
    if (!d || !sheetRef.current) return;
    sheetRef.current.style.transform = '';
    sheetRef.current.style.transition = '';
    const dy = e.clientY - d.y0;
    if (!d.moved) {
      if (d.base === SHEET_PEEK) setExpanded(true); // chạm handle khi đang thấp -> mở rộng
      return;
    }
    if (d.base === SHEET_PEEK && dy > 90) setSelectedId(null); // vuốt xuống đóng
    else if (d.base === SHEET_PEEK && dy < -60) setExpanded(true);
    else if (d.base === SHEET_FULL && dy > 120) setExpanded(false);
  };

  return (
    <div class="mscreen">
      <header class="mscreen__top">
        <div class="mscreen__title">
          <span class="mdv-eyebrow">Mở Dấu Việt</span>
          <h1>{lang === 'vi' ? 'Hành trình di sản' : 'Heritage journey'}</h1>
        </div>
        <div class="mscreen__xp" aria-label={`${progress.xp} ${t(UI.xp, lang)}`}>
          <Icon name="spark" size={16} />
          <b>{progress.xp}</b>
          <span>XP</span>
        </div>
      </header>

      <div class="mscreen__filters" role="tablist" aria-label={lang === 'vi' ? 'Lọc vùng' : 'Filter region'}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            class="mdv-chip"
            role="tab"
            aria-pressed={focus === f.id}
            aria-selected={focus === f.id}
            onClick={() => {
              setSelectedId(null); // đóng sheet để không che vùng vừa bay tới
              setSiteLevel(null);
              setFocus(f.id);
            }}
          >
            {t(UI[f.label], lang)}
          </button>
        ))}
      </div>

      <div class="mscreen__map">
        {levelSite ? (
          <SiteLevelMap
            site={levelSite}
            lang={lang}
            onOpenSpot={(spotId) => navigate(`d/${levelSite.entityId}/${spotId}`)}
          />
        ) : (
          <VietnamMap
            statuses={statuses}
            progressBySite={progressBySite}
            selectedId={selectedId}
            focus={focus}
            lang={lang}
            onboard={cinema}
            homeSignal={homeSignal}
            zoomSignal={zoomSignal}
            onSelect={(id) => { setSelectedId(id); if (hintOn) dismissHint(); }}
            onTransform={onMapTransform}
            onOnboardDone={markSeen}
          />
        )}
        <div class="mscreen__legend" aria-hidden="true">
          <span class="lg lg--done" /> {t(UI.unlocked, lang)}
          <span class="lg lg--next" /> {t(UI.next, lang)}
          <span class="lg lg--locked" /> {t(UI.locked, lang)}
        </div>
        <div class="mscreen__counter">
          {unlockedSpots}/{totalSpots} {t(UI.spots, lang)}
        </div>
        {!levelSite && (
          <div class="mscreen__zoomctl" role="group" aria-label="zoom">
            <button class="mscreen__zoombtn" onClick={() => setZoomSignal({ d: 1.5, n: Date.now() })} aria-label={t(UI.zoomIn, lang)}>
              <Icon name="zoomIn" size={18} />
            </button>
            <button class="mscreen__zoombtn" onClick={() => setZoomSignal({ d: 1 / 1.5, n: Date.now() })} aria-label={t(UI.zoomOut, lang)}>
              <Icon name="zoomOut" size={18} />
            </button>
          </div>
        )}
        {levelSite && (
          <button class="mscreen__chipbtn mscreen__chipbtn--exit" onClick={() => setSiteLevel(null)}>
            <Icon name="map" size={16} /> {t(UI.countryMap, lang)}
          </button>
        )}
        {levelSite && <div class="mscreen__level-title">{t(levelSite.name, lang)}</div>}
        {!levelSite && nextOffscreen && (
          <button
            class="mscreen__chipbtn mscreen__chipbtn--home"
            onClick={() => {
              setHomeSignal((n) => n + 1);
              setNextOffscreen(false);
              offscreenRef.current = false;
            }}
          >
            <Icon name="locate" size={16} /> {t(UI.backToJourney, lang)}
          </button>
        )}
      </div>

      {hintOn && (
        <div class="mhint" role="status">
          <Icon name="compass" size={18} />
          <span>{t(UI.hintTap, lang)}</span>
          <button class="mhint__x" aria-label={t(UI.back, lang)} onClick={dismissHint}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {toast && (
        <div class="mtoast" key={toast.seq} role="status">
          <Icon name="spark" size={18} />
          <b>+{toast.xp} XP</b>
          <span>{t(UI.unlockedToast, lang)}</span>
        </div>
      )}

      <section
        ref={sheetRef}
        class={`msheet ${selected ? 'msheet--open' : ''} ${expanded ? 'msheet--full' : ''}`}
        aria-live="polite"
        aria-hidden={!selected}
      >
        {selected && (
          <>
            <div
              class="msheet__grip"
              onPointerDown={onSheetPointerDown}
              onPointerMove={onSheetPointerMove}
              onPointerUp={onSheetPointerUp}
              onPointerCancel={onSheetPointerUp}
            >
              <div class="msheet__handle" />
            </div>
            <button class="msheet__close mdv-btn mdv-btn--icon" aria-label={t(UI.back, lang)} onClick={() => { setExpanded(false); setSelectedId(null); }}>
              <Icon name="close" size={20} />
            </button>
            <div class="msheet__head">
              <img class="msheet__img" src={selected.heroImage} alt="" loading="lazy" />
              <div>
                <span class={`mdv-badge mdv-badge--${selectedStatus === 'locked' ? 'locked' : selectedStatus === 'next' ? 'next' : 'unlocked'}`}>
                  {selectedStatus === 'locked'
                    ? t(UI.locked, lang)
                    : selectedStatus === 'next'
                      ? t(UI.next, lang)
                      : `${siteUnlockedCount(selected, progress)}/${selected.spots.length} ${t(UI.spots, lang)}`}
                </span>
                <h2>{t(selected.name, lang)}</h2>
                <p class="mdv-muted">{t(selected.province, lang)}</p>
              </div>
            </div>
            <div class="msheet__body">
              <p class="msheet__summary msheet__summary--clip">{t(selected.summary, lang)}</p>
              {expanded &&
                selected.spots.map((sp, i) => {
                  const ok = isSpotUnlocked(selected.entityId, sp.spotId);
                  return (
                    <a key={sp.spotId} class="msheet__spot" href={routeHref.destination(selected.entityId, sp.spotId)}>
                      <span class={`msheet__spotidx ${ok ? 'msheet__spotidx--ok' : ''}`}>
                        {ok ? <Icon name="check" size={14} /> : i + 1}
                      </span>
                      <span class="msheet__spotname">{t(sp.name, lang)}</span>
                      <span class="msheet__spotxp">+{sp.xp} XP</span>
                    </a>
                  );
                })}
            </div>
            <div class="msheet__actions">
              <a class="mdv-btn mdv-btn--primary" href={routeHref.destination(selected.entityId)}>
                <Icon name="compass" size={20} /> {t(UI.explore, lang)}
              </a>
              {selected.spots.length > 1 && (
                <button class="mdv-btn mdv-btn--ghost" onClick={() => { setSelectedId(null); setSiteLevel(selected.entityId); }}>
                  <Icon name="layers" size={20} /> {t(UI.siteMap, lang)}
                </button>
              )}
              {selectedStatus !== 'done' && (
                <button class="mdv-btn mdv-btn--ghost" onClick={simulateScan} title={t(UI.scanToUnlock, lang)}>
                  <Icon name="qr" size={20} /> {t(UI.simulateScan, lang)}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
