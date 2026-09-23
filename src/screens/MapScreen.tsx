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
import { asset } from '../lib/asset';
import { isDebug } from '../lib/debug';
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

// Trạng thái bản đồ giữa các lần điều hướng: quay từ trang di tích về đúng zoom/vùng/lựa chọn cũ.
let mapMem: { t: Transform | null; focus: MapFocus; site: string | null; sel: string | null } | null = null;

export function MapScreen() {
  const [lang] = useLang();
  const progress = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(mapMem?.sel ?? null);
  const [focus, setFocus] = useState<MapFocus>(mapMem?.focus ?? 'all');
  const [siteLevel, setSiteLevel] = useState<string | null>(mapMem?.site ?? null); // entityId của khu đang xem sơ đồ
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
  const [searchOn, setSearchOn] = useState(false);
  const [query, setQuery] = useState("");
  // Tìm kiếm địa danh/tỉnh: khách thường biết tên và muốn đi thẳng – bản đồ không phải đường duy nhất.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { siteId: string; spotId?: string; label: string; sub: string }[] = [];
    for (const s of SITES) {
      const siteKey = `${t(s.name, 'vi')} ${t(s.name, 'en')} ${t(s.province, 'vi')} ${t(s.province, 'en')}`.toLowerCase();
      if (!q || siteKey.includes(q))
        out.push({ siteId: s.entityId, label: t(s.name, lang), sub: t(s.province, lang) });
      for (const sp of s.spots) {
        const spotKey = `${t(sp.name, 'vi')} ${t(sp.name, 'en')}`.toLowerCase();
        if (q && spotKey.includes(q))
          out.push({ siteId: s.entityId, spotId: sp.spotId, label: t(sp.name, lang), sub: t(s.name, lang) });
      }
    }
    return out.slice(0, 12);
  }, [query, lang]);
  const [nextOffscreen, setNextOffscreen] = useState(false);
  const [toast, setToast] = useState<{ xp: number; seq: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [flyReq, setFlyReq] = useState<{ x: number; y: number; k: number; n: number } | undefined>();
  const [mountT, setMountT] = useState<Transform | undefined>(mapMem?.t ?? undefined); // transform khi VietnamMap remount sau sơ đồ khu
  const deepExit = useRef(false); // vừa thoát sơ đồ khu: chặn auto-mở lại tới khi k tụt hẳn
  const toastTimer = useRef(0);
  const tRef = useRef<Transform | null>(mapMem?.t ?? null); // transform mới nhất để lưu trạng thái
  const keepMem = useRef(false); // khi dive-then-navigate: mem đã chốt trước lúc bay, unmount không ghi đè
  const divingNav = useRef(false); // đang fly-to để điều hướng -> chặn auto-mở sơ đồ khi k>4.6
  const flyDone = useRef<() => void>(() => {});

  // Lưu trạng thái bản đồ khi rời màn hình (điều hướng sang di tích/quiz/...).
  useEffect(
    () => () => {
      if (keepMem.current) {
        keepMem.current = false;
        return;
      }
      mapMem = { t: tRef.current, focus, site: siteLevel, sel: selectedId };
    },
    [focus, siteLevel, selectedId]
  );

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
  const [obSkip, setObSkip] = useState(false); // bỏ qua onboarding camera
  const dismissHint = () => {
    setHintOn(false);
    setObSkip(true); // đóng hint = bỏ qua luôn phần hướng dẫn camera
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

  // Esc đóng sheet / thoát sơ đồ khu – thói quen của người dùng bàn phím.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedId) {
        setExpanded(false);
        setSelectedId(null);
      } else {
        exitSiteLevel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, siteLevel]);

  // Sheet mở: đưa focus vào sheet, giữ Tab trong sheet, đóng thì trả focus về nút trước đó.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!selected || !sheet) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.hasAttribute('aria-hidden')
      );
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    sheet.addEventListener('keydown', onKey);
    return () => {
      sheet.removeEventListener('keydown', onKey);
      if (prev && document.contains(prev)) prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Phát hiện node "kế tiếp" ra khỏi khung nhìn -> hiện nút Về hành trình;
  // zoom rất sâu vào khu có nhiều điểm -> mở sơ đồ cấp 2.
  const offscreenRef = useRef(false);
  const onMapTransform = (t: Transform) => {
    tRef.current = t;
    if (siteLevel || divingNav.current) return;
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
    if (deepExit.current && t.k <= SITE_ZOOM_K) deepExit.current = false; // đã tụt khỏi ngưỡng -> cho auto-mở lại
    if (t.k > SITE_ZOOM_K) {
      if (deepExit.current) return;
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

  // Thoát sơ đồ khu: kéo camera ngược ra mức vùng tại đúng khu vừa xem (không đổi màn đột ngột,
  // và tránh vòng lặp remount ở zoom sâu -> auto-mở lại sơ đồ).
  const exitSiteLevel = () => {
    if (!siteLevel) return;
    deepExit.current = true;
    // An toàn: nếu user chen ngón tay hủy lượt bay giữa chừng (k vẫn >4.6),
    // latch tự nhả sau 900ms để cơ chế zoom-sâu auto-mở sơ đồ hoạt động lại.
    window.setTimeout(() => {
      deepExit.current = false;
    }, 900);
    const n = nodesRef.current.find((nd) => nd.site.entityId === siteLevel);
    setSiteLevel(null);
    setMountT(tRef.current ?? undefined); // VietnamMap remount đúng độ sâu cũ, rồi zoom-out
    if (n) setFlyReq({ x: n.x, y: n.y, k: 2.4, n: Date.now() });
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
    <main class="mscreen">
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

      <div class="mscreen__filters" role="group" aria-label={t(UI.regionFilter, lang)}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            class="mdv-chip"
            aria-pressed={focus === f.id}
            onClick={() => {
              setSelectedId(null); // đóng sheet để không che vùng vừa bay tới
              deepExit.current = true;
              setMountT(undefined); // remount cảnh toàn quốc rồi focus-anim bay tới vùng
              setFlyReq(undefined); // flyReq cũ không được tái chạy trên remount
              setSiteLevel(null);
              setFocus(f.id);
            }}
          >
            {t(UI[f.label], lang)}
          </button>
        ))}
        <button class="mdv-chip mscreen__searchbtn" onClick={() => setSearchOn(true)} aria-label={t(UI.search, lang)}>
          <Icon name="search" size={16} /> {t(UI.search, lang)}
        </button>
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
            onboard={cinema && !obSkip}
            homeSignal={homeSignal}
            zoomSignal={zoomSignal}
            flyRequest={flyReq}
            onFlyDone={() => {
              divingNav.current = false;
              flyDone.current();
            }}
            initialTransform={mountT}
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
          <div class="mscreen__zoomctl" role="group" aria-label={t(UI.zoomControls, lang)}>
            <button class="mscreen__zoombtn" onClick={() => setZoomSignal({ d: 1.5, n: Date.now() })} aria-label={t(UI.zoomIn, lang)}>
              <Icon name="zoomIn" size={18} />
            </button>
            <button class="mscreen__zoombtn" onClick={() => setZoomSignal({ d: 1 / 1.5, n: Date.now() })} aria-label={t(UI.zoomOut, lang)}>
              <Icon name="zoomOut" size={18} />
            </button>
          </div>
        )}
        {levelSite && (
          <button class="mscreen__chipbtn mscreen__chipbtn--exit" onClick={exitSiteLevel}>
            <Icon name="map" size={16} /> {t(UI.countryMap, lang)}
          </button>
        )}
        {levelSite && <div class="mscreen__level-title">{t(levelSite.name, lang)}</div>}
        {searchOn && (
          <div class="msearch" role="dialog" aria-label={t(UI.search, lang)}>
            <div class="msearch__bar">
              <Icon name="search" size={18} />
              <input
                class="msearch__input"
                value={query}
                autoFocus
                placeholder={t(UI.searchPlaceholder, lang)}
                onInput={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setSearchOn(false); }}
              />
              <button class="mhint__x" aria-label={t(UI.dismiss, lang)} onClick={() => setSearchOn(false)}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <div class="msearch__list">
              {results.length === 0 && <div class="msearch__empty">{t(UI.noResults, lang)}</div>}
              {results.map((r) => (
                <a
                  key={r.siteId + '/' + (r.spotId ?? '')}
                  class="msearch__item"
                  href={routeHref.destination(r.siteId, r.spotId)}
                  onClick={() => setSearchOn(false)}
                >
                  <span class="msearch__name">{r.label}</span>
                  <span class="msearch__sub">{r.sub}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        {hintOn && (
          <div class="mhint" role="status">
            <Icon name="compass" size={18} />
            <span>{t(UI.hintTap, lang)}</span>
            {cinema && !obSkip && (
              <button class="mhint__skip" onClick={dismissHint}>
                {t(UI.skipOnboard, lang)}
              </button>
            )}
            <button class="mhint__x" aria-label={t(UI.dismiss, lang)} onClick={dismissHint}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
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
              <img class="msheet__img" src={asset(selected.heroImage)} alt="" loading="lazy" />
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
              <p class={`msheet__summary${expanded ? '' : ' msheet__summary--clip'}`}>{t(selected.summary, lang)}</p>
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
              <button
                class="mdv-btn mdv-btn--primary"
                onClick={() => {
                  // Fly-to: chốt trạng thái pre-dive rồi camera lao vào node trước khi mở trang di tích.
                  const n = nodes.find((nd) => nd.site.entityId === selected.entityId);
                  if (!n) return navigate(`d/${selected.entityId}`);
                  mapMem = { t: tRef.current, focus, site: siteLevel, sel: selectedId };
                  keepMem.current = true;
                  divingNav.current = true;
                  flyDone.current = () => navigate(`d/${selected.entityId}`);
                  setFlyReq({ x: n.x, y: n.y, k: 5.1, n: Date.now() });
                  try {
                    navigator.vibrate?.(10);
                  } catch {
                    /* bỏ qua */
                  }
                }}
              >
                <Icon name="compass" size={20} /> {t(UI.explore, lang)}
              </button>
              {selected.spots.length > 1 && (
                <button
                  class="mdv-btn mdv-btn--ghost"
                  onClick={() => {
                    // Camera lao sâu vào khu; khi k vượt SITE_ZOOM_K cơ chế zoom sẽ tự mở sơ đồ.
                    const n = nodes.find((nd) => nd.site.entityId === selected.entityId);
                    setSelectedId(null);
                    if (n) setFlyReq({ x: n.x, y: n.y, k: SITE_ZOOM_K + 0.6, n: Date.now() });
                    else setSiteLevel(selected.entityId);
                  }}
                >
                  <Icon name="layers" size={20} /> {t(UI.siteMap, lang)}
                </button>
              )}
              {isDebug() && selectedStatus !== 'done' && (
                <button class="mdv-btn mdv-btn--ghost" onClick={simulateScan} title={t(UI.scanToUnlock, lang)}>
                  <Icon name="qr" size={20} /> {t(UI.simulateScan, lang)}
                </button>
              )}
            </div>
            {selectedStatus === 'locked' && (
              <p class="msheet__scanhint">
                <Icon name="qr" size={14} /> {t(UI.scanToUnlock, lang)}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
