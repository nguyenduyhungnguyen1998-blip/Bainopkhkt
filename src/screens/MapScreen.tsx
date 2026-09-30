import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { VietnamMap, buildNodes, HOME_ZOOM, type MapFocus, type MapNode } from '../map/VietnamMap';
import { project } from '../map/projection';
import { SiteLevelMap } from '../map/SiteLevelMap';
import { MAP_WIDTH, MAP_HEIGHT } from '../map/vietnam-geometry';
import type { Transform } from '../map/geometry-utils';
import { SITES } from '../data/content';
import { computeStatuses, isSpotUnlocked, siteUnlockedCount, unlockSpot, useProgress, type UnlockResult } from '../lib/progress';
import { UI, t, useLang } from '../lib/i18n';
import { navigate, routeHref } from '../lib/router';
import { Icon } from '../components/Icon';
import { HelpMenu, WelcomeModal } from '../components/Onboarding';
import { HINT_REQ_KEY, TOUR_REQ_KEY, WELCOME_KEY } from '../lib/tour';
import { asset } from '../lib/asset';
import { verifySignature } from '../lib/qr';
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
  const [hintOn, setHintOn] = useState(false); // thẻ 3 bước – chỉ mở từ menu ? (lần đầu đã có màn chào)
  const [welcome, setWelcome] = useState(false);
  const [helpMenu, setHelpMenu] = useState(false);
  const actedRef = useRef(false); // khách đã tương tác trước khi màn chào kịp hiện → không chen vào
  const markActed = () => {
    actedRef.current = true;
  };
  const [cinema] = useState(() => {
    try {
      return !localStorage.getItem(SEEN_KEY);
    } catch {
      return true;
    }
  });
  const [homeSignal, setHomeSignal] = useState(0);
  const [allSignal, setAllSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState({ d: 1, n: 0 });
  const [userLoc, setUserLoc] = useState<{ x: number; y: number } | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [searchOn, setSearchOn] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [codeIn, setCodeIn] = useState('');
  const [codeErr, setCodeErr] = useState(false);

  useEffect(() => {
    if (searchOn) searchInputRef.current?.focus();
  }, [searchOn]);

  // Chuẩn bị trước khi App mở tour: dọn overlay đang mở + bay camera về điểm kế tiếp
  // để spotlight bước 1 soi đúng chỗ, rồi báo App qua 'mdv:tour-start'.
  const prepTour = () => {
    try {
      localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      /* bộ nhớ riêng tư */
    }
    setWelcome(false);
    setHelpMenu(false);
    setHintOn(false);
    setSearchOn(false);
    setSelectedId(null);
    if (siteLevel) exitSiteLevel();
    const next = nodesRef.current.find((n) => n.status === 'next') ?? nodesRef.current.find((n) => n.status === 'active');
    if (next) setFlyReq({ x: next.x, y: next.y, k: Math.max(tRef.current?.k ?? 1, 1.7), n: Date.now() });
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('mdv:tour-start')), next ? 750 : 60);
  };

  // Cờ mở tour / thẻ 3 bước từ màn khác (Trợ giúp, Hộ chiếu, Thử tài → nút ?).
  useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_REQ_KEY)) {
        localStorage.removeItem(TOUR_REQ_KEY);
        prepTour();
      }
      if (localStorage.getItem(HINT_REQ_KEY)) {
        localStorage.removeItem(HINT_REQ_KEY);
        setHintOn(true);
      }
      if (localStorage.getItem('mdv.tourEnd')) {
        localStorage.removeItem('mdv.tourEnd');
        setAllSignal((n) => n + 1);
      }
    } catch {
      /* bộ nhớ riêng tư */
    }
    const onTourReq = () => prepTour();
    const onHintReq = () => setHintOn(true);
    const onTourEnd = () => setAllSignal((n) => n + 1);
    window.addEventListener('mdv:tour-request', onTourReq);
    window.addEventListener('mdv:hint-request', onHintReq);
    window.addEventListener('mdv:tour-end', onTourEnd);
    return () => {
      window.removeEventListener('mdv:tour-request', onTourReq);
      window.removeEventListener('mdv:hint-request', onHintReq);
      window.removeEventListener('mdv:tour-end', onTourEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Màn chào lần đầu: đợi intro camera hạ cánh (~2.8s) rồi mới hỏi — nhưng nếu khách
  // đã tự thao tác trước đó (chạm node/mở search/menu ?) thì không chen vào nữa.
  useEffect(() => {
    let known = true;
    try {
      known = !!localStorage.getItem(WELCOME_KEY);
    } catch {
      /* hiện màn chào cho chắc */
    }
    if (known) return;
    const id = setTimeout(() => {
      if (!actedRef.current) setWelcome(true);
    }, cinema ? 2800 : 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeWelcome = () => {
    try {
      localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      /* bộ nhớ riêng tư */
    }
    setWelcome(false);
    markSeen(); // intro camera nếu còn chạy thì cũng thôi hỏi nữa
  };

  // Thông báo vị trí tự tắt sau 3s.
  useEffect(() => {
    if (!locMsg) return;
    const id = setTimeout(() => setLocMsg(null), 3000);
    return () => clearTimeout(id);
  }, [locMsg]);

  // LBS-lite: chấm "Bạn đang ở đây" + bay về vị trí khách. GPS không bắt buộc cho QR flow.
  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocMsg(t(UI.locDenied, lang));
      return;
    }
    setLocBusy(true);
    setLocMsg(t(UI.locating, lang));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        const [x, y] = project(pos.coords.longitude, pos.coords.latitude);
        const inBox = x >= 0 && x <= MAP_WIDTH && y >= 0 && y <= MAP_HEIGHT;
        if (!inBox) setLocMsg(t(UI.locOutside, lang));
        else setLocMsg(null);
        // Vẫn hiện chấm kể cả ngoài khung (du khách nước ngoài/đang bay)
        setUserLoc({ x: Math.max(0, Math.min(MAP_WIDTH, x)), y: Math.max(0, Math.min(MAP_HEIGHT, y)) });
        setFlyReq({
          x: Math.max(0, Math.min(MAP_WIDTH, x)),
          y: Math.max(0, Math.min(MAP_HEIGHT, y)),
          k: HOME_ZOOM,
          n: Date.now(),
        });
      },
      () => {
        setLocBusy(false);
        setLocMsg(t(UI.locDenied, lang));
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  // Đường cứu demo: mã 16-ký-tự in trên tem QR (= chữ ký). Chấp nhận cả link QR
  // dán nguyên (tách s= ra luôn). Thử verify với mọi điểm — khớp thì mở điểm qua
  // cổng check-in thật (offline vẫn chạy vì cùng secret HMAC).
  const useCode = async () => {
    const c = codeIn.trim().toLowerCase();
    if (!c) return;
    const link =
      c.match(/[?&]d=([\w-]+)\/([\w-]+)[^\s]*?s=([0-9a-f]{16})/) ??
      c.match(/d\/([\w-]+)\/([\w-]+)\?[^\s]*?s=([0-9a-f]{16})/);
    if (link) {
      setSearchOn(false);
      navigate(`d/${link[1]}/${link[2]}?s=${link[3]}`);
      return;
    }
    // Link tem compact ?q=<nn>.<sig>: vòng verify phía dưới tự tìm đúng điểm.
    const sig = c.match(/[?&]q=\d+\.([0-9a-f]{16})/)?.[1] ?? c.match(/[0-9a-f]{16}/)?.[0] ?? c;
    for (const s of SITES)
      for (const sp of s.spots)
        if (await verifySignature(s.entityId, sp.spotId, sig, sp.qrId)) {
          setSearchOn(false);
          navigate(`d/${s.entityId}/${sp.spotId}?s=${sig}`);
          return;
        }
    setCodeErr(true);
  };
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

  const [obSkip, setObSkip] = useState(false); // bỏ qua onboarding camera
  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* bộ nhớ riêng tư */
    }
    setObSkip(true); // tour đã xong → giấu nút Bỏ qua
  };
  // Hint "Chạm điểm sáng" chỉ tắt khi user thật sự tương tác (tap node / bấm ✕) – không chết khi camera hạ cánh.
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
        {/* Ở sơ đồ nội khu: ẩn lọc vùng – hai quy mô (quốc gia / nội khu) không trộn nhau */}
        {!levelSite &&
          FILTERS.map((f) => (
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
        <button class="mdv-chip mscreen__searchbtn" onClick={() => { markActed(); setSearchOn(true); }} aria-label={t(UI.search, lang)}>
          <Icon name="search" size={16} /> {t(UI.search, lang)}
        </button>
        <button class="mdv-chip mscreen__helpbtn" onClick={() => { markActed(); setHelpMenu(true); }} aria-label={t(UI.howto, lang)}>
          <Icon name="help" size={16} />
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
            allSignal={allSignal}
            zoomSignal={zoomSignal}
            flyRequest={flyReq}
            userLoc={userLoc}
            onFlyDone={() => {
              divingNav.current = false;
              flyDone.current();
            }}
            initialTransform={mountT}
            onSelect={(id) => { markActed(); setSelectedId(id); if (hintOn) dismissHint(); }}
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
          {levelSite ? `${siteUnlockedCount(levelSite)}/${levelSite.spots.length}` : `${unlockedSpots}/${totalSpots}`} {t(UI.spots, lang)}
        </div>
        {!levelSite && (
          <div class="mscreen__zoomctl" role="group" aria-label={t(UI.zoomControls, lang)}>
            <button class="mscreen__zoombtn" onClick={() => setZoomSignal({ d: 1.5, n: Date.now() })} aria-label={t(UI.zoomIn, lang)}>
              <Icon name="zoomIn" size={18} />
            </button>
            <button class="mscreen__zoombtn" onClick={() => setZoomSignal({ d: 1 / 1.5, n: Date.now() })} aria-label={t(UI.zoomOut, lang)}>
              <Icon name="zoomOut" size={18} />
            </button>
            <button class="mscreen__zoombtn" onClick={locate} disabled={locBusy} aria-label={t(UI.locateMe, lang)} aria-busy={locBusy}>
              <Icon name="locate" size={18} />
            </button>
            {locMsg && <div class="mscreen__locmsg" role="status">{locMsg}</div>}
          </div>
        )}
        {levelSite && (
          <button class="mscreen__chipbtn mscreen__chipbtn--exit" onClick={exitSiteLevel}>
            <Icon name="map" size={16} /> {t(UI.countryMap, lang)}
          </button>
        )}
        {levelSite && (
          <div class="mscreen__level-title">
            {t(levelSite.name, lang)}
            {(() => {
              // "Kế tiếp" trong ngữ cảnh nội khu: điểm chưa ghé đầu tiên của khu này,
              // không nhầm với điểm kế tiếp quốc gia trên bản đồ toàn cảnh.
              const nxt = levelSite.spots.find((sp) => !isSpotUnlocked(levelSite.entityId, sp.spotId));
              return nxt ? (
                <span class="mscreen__level-next">
                  {t(UI.nextInSite, lang)}: {t(nxt.name, lang)}
                </span>
              ) : null;
            })()}
          </div>
        )}
        {searchOn && (
          <div class="msearch" role="dialog" aria-label={t(UI.search, lang)} onKeyDown={(e) => { if (e.key === 'Escape') setSearchOn(false); }}>
            <div class="msearch__bar">
              <Icon name="search" size={18} />
              <input
                ref={searchInputRef}
                class="msearch__input"
                value={query}
                placeholder={t(UI.searchPlaceholder, lang)}
                onInput={(e) => setQuery(e.currentTarget.value)}
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
            <div class="msearch__manual">
              <label class="msearch__mlabel" htmlFor="mcode">{t(UI.manualCode, lang)}</label>
              <div class="msearch__mrow">
                <input
                  id="mcode"
                  class="msearch__input msearch__code"
                  value={codeIn}
                  placeholder="c9f200…"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellcheck={false}
                  onInput={(e) => { setCodeIn(e.currentTarget.value); setCodeErr(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') void useCode(); }}
                />
                <button class="mdv-chip" onClick={() => void useCode()}>{t(UI.manualCodeUse, lang)}</button>
              </div>
              {codeErr && <span class="msearch__cerr">{t(UI.codeInvalid, lang)}</span>}
            </div>
          </div>
        )}
        {hintOn && (
          <div class="mhint mhint--howto" role="dialog" aria-label={t(UI.howto, lang)}>
            <div class="mhint__steps">
              <span>
                <Icon name="compass" size={15} /> {t(UI.howtoStep1, lang)}
              </span>
              <span>
                <Icon name="qr" size={15} /> {t(UI.howtoStep2, lang)}
              </span>
              <span>
                <Icon name="passport" size={15} /> {t(UI.howtoStep3, lang)}
              </span>
            </div>
            <div class="mhint__row">
              <button class="mdv-chip" onClick={dismissHint}>
                {t(UI.gotIt, lang)}
              </button>
              <button class="mdv-chip" onClick={prepTour}>
                <Icon name="compass" size={14} /> {t(UI.tourDeepLink, lang)}
              </button>
              {cinema && !obSkip && (
                <button class="mhint__skip" onClick={dismissHint}>
                  {t(UI.skipOnboard, lang)}
                </button>
              )}
              <button class="mhint__x" aria-label={t(UI.dismiss, lang)} onClick={dismissHint}>
                <Icon name="close" size={16} />
              </button>
            </div>
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

      {welcome && (
        <WelcomeModal
          lang={lang}
          onKnow={closeWelcome}
          onTour={() => {
            // "Chưa biết" → thẻ 3 bước nhanh (~20s); tour 13 bước chỉ mở từ nút ?
            closeWelcome();
            setHintOn(true);
          }}
        />
      )}
      {helpMenu && (
        <HelpMenu
          lang={lang}
          onTour={prepTour}
          onCard={() => {
            setHelpMenu(false);
            setHintOn(true);
          }}
          onClose={() => setHelpMenu(false)}
        />
      )}
    </main>
  );
}
