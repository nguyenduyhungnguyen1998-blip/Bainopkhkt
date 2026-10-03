/** Hộ chiếu, Thử tài, Cài đặt – P3: quiz engine + xuất/nhập hộ chiếu. */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { SITES, getSpot } from '../data/content';
import type { Site, Spot } from '../data/types';
import { UI, t, useLang, type Lang } from '../lib/i18n';
import { computeAchievements, siteUnlockedCount, useProgress, resetProgress, quizBest, recordQuizResult, exportPassportCardHtml, previewPassportJson, applyPassportImport, isSpotUnlocked, unlockSpot, relockSpot, grantXp, sharePassportPayload, decodePassportPayload } from '../lib/progress';
import type { Achievement, Progress } from '../lib/progress';
import { asset } from '../lib/asset';
import './passport.css';
import { useAmbientFlat, useFontScale, useTheme, FLAT_PCT_MAX, FONT_PCT_MAX, FONT_PCT_MIN } from '../lib/theme';
import { IMAGE_CREDITS } from '../data/credits';
import { Icon, BrandMark } from '../components/Icon';
import { HelpMenu } from '../components/Onboarding';
import { PASSPORT_TOUR_STEPS, QUIZ_TOUR_STEPS, goScreenTour } from '../lib/tour';
import { navigate, routeHref } from '../lib/router';
import { siteEmoji } from '../lib/siteEmoji';
import { ConfirmSheet, useConfirm } from '../components/ConfirmSheet';
import './settings.css';
import { enableDemoDock } from '../components/DemoDock';

export function PassportScreen() {
  const [lang] = useLang();
  const p = useProgress();
  const [helpMenu, setHelpMenu] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [openAch, setOpenAch] = useState<Achievement | null>(null);
  const [scanAsk, setScanAsk] = useState(false);
  const achPopRef = useRef<HTMLDivElement>(null);
  // Popover danh hiệu: focus khi mở + Esc/tap nền để đóng.
  useEffect(() => {
    if (!openAch) return;
    achPopRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenAch(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openAch]);
  const totalSpots = SITES.reduce((n, s) => n + s.spots.length, 0);
  const doneSpots = Object.keys(p.unlocked).length;
  const pct = totalSpots ? doneSpots / totalSpots : 0;
  const RING_R = 56;
  const RING_C = 2 * Math.PI * RING_R;
  const achs = computeAchievements(p);
  const nextGoal = achs.find((a) => !a.unlocked);
  const latestKey = Object.entries(p.unlocked).sort((a, b) => b[1] - a[1])[0]?.[0];
  const latestSpot = latestKey ? getSpot(latestKey.split('/')[0], latestKey.split('/')[1]) : null;
  const visibleAchs = badgesOpen ? achs : achs.filter((a) => a.unlocked || a === nextGoal);
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.passport, lang)}</span>
          <h1>{lang === 'vi' ? 'Hộ chiếu di sản' : 'Heritage passport'}</h1>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="mdv-badge mdv-badge--next">
            {p.xp} XP
          </div>
          <button class="mdv-chip" onClick={() => setHelpMenu(true)} aria-label={t(UI.howto, lang)}>
            <Icon name="help" size={16} />
          </button>
        </div>
      </header>
      <section class="mdv-card ppass__ringcard" aria-label={t(UI.yourJourney, lang)}>
        <div class="ppass__ring" role="img" aria-label={`${doneSpots}/${totalSpots}`}>
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle class="ppass__ringbg" cx="66" cy="66" r={RING_R} />
            <circle
              class="ppass__ringval"
              cx="66"
              cy="66"
              r={RING_R}
              stroke-dasharray={RING_C}
              stroke-dashoffset={RING_C * (1 - pct)}
            />
          </svg>
          <div class="ppass__ringtext">
            <b>
              {doneSpots}/{totalSpots}
            </b>
            <small>{t(UI.spots, lang)}</small>
          </div>
        </div>
        <div>
          <span class="mdv-eyebrow">{t(UI.yourJourney, lang)}</span>
          <div class="ppass__pct">{Math.round(pct * 100)}%</div>
          <div class="ppass__pctlabel">{t(UI.unlocked, lang)}</div>
          <div class="ppass__xp">{p.xp} XP</div>
        </div>
      </section>

      {(latestSpot || nextGoal) && (
        <section class={`mdv-card ppass__focus ${latestSpot && nextGoal ? '' : 'ppass__focus--one'}`}>
          {latestSpot && (
            <div class="ppass__focusitem">
              <span class="ppass__focuslbl">
                <Icon name="passport" size={13} /> {t(UI.latestStamp, lang)}
              </span>
              <b>{t(latestSpot.spot.name, lang)}</b>
              <small class="mdv-muted">{t(latestSpot.site.name, lang)}</small>
            </div>
          )}
          {nextGoal && (
            <div class="ppass__focusitem ppass__focusitem--next">
              <span class="ppass__focuslbl">
                <Icon name={nextGoal.icon} size={13} /> {t(UI.nextGoal, lang)}
              </span>
              <b>{t(nextGoal.name, lang)}</b>
              <small class="mdv-muted">{t(nextGoal.need, lang)}</small>
            </div>
          )}
        </section>
      )}

      <section class="mdv-card ppass__quote">“{t(UI.journeyQuote, lang)}”</section>

      <p class="mdv-muted ppass__note">
        <Icon name="passport" size={13} /> {t(UI.storedLocally, lang)}
      </p>

      {doneSpots === 0 && (
        <button class="mdv-btn mdv-btn--primary ppass__cta" onClick={() => setScanAsk(true)}>
          {t(UI.startScanning, lang)}
        </button>
      )}
      {scanAsk && (
        <ScanChooserSheet
          lang={lang}
          onClose={() => setScanAsk(false)}
          onPick={(id) => {
            try {
              localStorage.setItem(SCAN_APP_KEY, id);
            } catch {
              /* bộ nhớ riêng tư */
            }
            setScanAsk(false);
            navigate('map');
          }}
        />
      )}

      <ShareJourney lang={lang} done={doneSpots} total={totalSpots} xp={p.xp} />

      <section>
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{t(UI.heritageBadges, lang)}</h2>
        <div class="ppass__badges">
          {visibleAchs.map((a) => (
            <button
              key={a.id}
              type="button"
              class={`ppass__badge ${a.unlocked ? '' : 'ppass__badge--locked'}`}
              onClick={() => setOpenAch(a)}
              aria-label={`${t(a.name, lang)} — ${a.unlocked ? t(UI.earned, lang) : t(UI.badgeLocked, lang)}`}
            >
              <Icon name={a.icon} size={26} />
              <b>{t(a.name, lang)}</b>
              <small class="ppass__need">{t(a.need, lang)}</small>
              <small>{a.unlocked ? t(UI.earned, lang) : t(UI.badgeLocked, lang)}</small>
            </button>
          ))}
        </div>
        <button class="mdv-chip ppass__badgetoggle" onClick={() => setBadgesOpen(!badgesOpen)}>
          {badgesOpen ? t(UI.badgesHide, lang) : `${t(UI.badgesShowAll, lang)} · ${achs.length}`}
        </button>
      </section>
      <div class="ppass__sitelist">
        {SITES.map((s) => {
          const n = siteUnlockedCount(s, p);
          const done = n === s.spots.length;
          return (
            <a key={s.entityId} class="mdv-card" href={routeHref.destination(s.entityId)} style="display:flex;gap:12px;align-items:center;color:inherit">
              <img src={asset(s.heroImage)} alt="" width="56" height="56" style="border-radius:12px;object-fit:cover" />
              <div style="flex:1;min-width:0">
                <b>{siteEmoji(s)} {t(s.name, lang)}</b>
                <div class="mdv-muted" style="font-size:var(--text-sm)">
                  {n}/{s.spots.length} {t(UI.spots, lang)}
                </div>
                {/* Thanh tiến độ theo điểm – đoạn tô đầy = đã nhận dấu; màu theo mức hoàn thành của khu */}
                <span class={`pprog ${done ? 'pprog--done' : n > 0 ? 'pprog--mid' : 'pprog--none'}`} aria-hidden="true">
                  {s.spots.map((sp) => (
                    <i key={sp.spotId} class={`pprog__seg ${isSpotUnlocked(s.entityId, sp.spotId) ? 'pprog__seg--on' : ''}`} />
                  ))}
                </span>
              </div>
              {done ? (
                <span class="mdv-badge mdv-badge--unlocked">
                  <Icon name="check" size={14} /> {t(s.gamificationConfig.badge.name, lang)}
                </span>
              ) : (
                <span class="mdv-badge mdv-badge--locked">
                  <Icon name="lock" size={14} />
                </span>
              )}
            </a>
          );
        })}
      </div>
      {openAch && (
        <div class="ppass__popwrap" role="dialog" aria-modal="true" aria-label={t(openAch.name, lang)} onClick={() => setOpenAch(null)}>
          <div class="ppass__pop" ref={achPopRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <Icon name={openAch.icon} size={44} />
            <b class="ppass__popname">{t(openAch.name, lang)}</b>
            <span class={`mdv-badge ${openAch.unlocked ? 'mdv-badge--unlocked' : 'mdv-badge--locked'}`}>
              {openAch.unlocked ? t(UI.earned, lang) : t(UI.badgeLocked, lang)}
            </span>
            <p class="mdv-muted ppass__popneed">{t(openAch.need, lang)}</p>
            <button class="mdv-btn mdv-btn--primary" onClick={() => setOpenAch(null)}>
              {t(UI.dismiss, lang)}
            </button>
          </div>
        </div>
      )}
      {helpMenu && (
        <HelpMenu
          lang={lang}
          onClose={() => setHelpMenu(false)}
          onTour={() => {
            setHelpMenu(false);
            goScreenTour(PASSPORT_TOUR_STEPS);
          }}
          tourTitle={UI.helpMenuTourPassport}
          tourSub={UI.helpMenuTourPassportSub}
        />
      )}
    </main>
  );
}

/** Chia sẻ hành trình bằng LINK: Web Share API nếu có, không thì chép văn bản + link
 *  vào clipboard. Link #/pp/<payload> mở thẻ hộ chiếu chỉ-đọc của người chia sẻ. */
function ShareJourney({ lang, done, total, xp }: { lang: Lang; done: number; total: number; xp: number }) {
  const [copied, setCopied] = useState(false);
  const url = `${location.origin}${location.pathname}#/pp/${sharePassportPayload()}`;
  const text =
    lang === 'vi'
      ? `Mình đã mở ${done}/${total} điểm di sản – ${xp} XP trong Du lịch Việt Nam`
      : `I've unlocked ${done}/${total} heritage spots – ${xp} XP in Travel in Vietnam`;
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: lang === 'vi' ? 'Du lịch Việt Nam' : 'Travel in Vietnam', text, url });
        return;
      }
    } catch {
      /* user hủy share sheet hoặc API lỗi -> fallback copy */
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard bị chặn */
    }
  };
  return (
    <button class="mdv-btn mdv-btn--ghost ppass__share" onClick={() => void share()}>
      <Icon name="share" size={18} /> {copied ? t(UI.shareCopied, lang) : t(UI.sharePassport, lang)}
    </button>
  );
}

/** Sheet hỏi "quét bằng gì?" trước lần quét đầu tiên — danh sách lựa chọn
 *  nhận diện theo máy (Zalo/Lens trên mobile, ẩn Lens trên iOS khi không rõ).
 *  Lựa chọn được nhớ ở mdv.scanApp; lần sau mở sheet đánh dấu "lần trước". */
const SCAN_APP_KEY = 'mdv.scanApp';
type ScanAppId = 'camera' | 'zalo' | 'lens' | 'other';

function ScanChooserSheet({ lang, onPick, onClose }: { lang: Lang; onPick: (id: ScanAppId) => void; onClose: () => void }) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /android/i.test(ua);
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isMobile = isAndroid || isIos;
  const lastUsed = (() => {
    try {
      return localStorage.getItem(SCAN_APP_KEY) as ScanAppId | null;
    } catch {
      return null;
    }
  })();
  const opts: { id: ScanAppId; emoji: string; name: { vi: string; en: string }; sub: { vi: string; en: string } }[] = [
    {
      id: 'camera',
      emoji: '📷',
      name: { vi: 'Máy ảnh', en: 'Camera app' },
      sub: isIos
        ? { vi: 'Quét trực tiếp trong ứng dụng Camera của iPhone', en: 'Scan straight from the iPhone Camera app' }
        : { vi: 'Chế độ quét QR của camera / trình quét tích hợp trên máy', en: "Your camera's QR mode or the built-in scanner" },
    },
    ...(isMobile
      ? [
          {
            id: 'zalo' as const,
            emoji: '💬',
            name: { vi: 'Zalo', en: 'Zalo' },
            sub: { vi: 'Nút quét QR ở góc phải trên trong Zalo', en: 'The QR button at the top-right in Zalo' },
          },
        ]
      : []),
    {
      id: 'lens',
      emoji: '🔍',
      name: { vi: 'Google Lens', en: 'Google Lens' },
      sub: isIos
        ? { vi: 'Trong ứng dụng Google (nếu máy đã cài)', en: 'Inside the Google app (if installed)' }
        : { vi: 'Lens trong Google Photos / thanh tìm kiếm Google', en: 'Lens in Google Photos or the Google search bar' },
    },
    {
      id: 'other',
      emoji: '⋯',
      name: { vi: 'Ứng dụng quét QR khác', en: 'Another QR app' },
      sub: { vi: 'Bất kỳ app quét QR nào trên máy bạn', en: 'Any QR reader already on your device' },
    },
  ];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="finale confirm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="finale__card confirm__card scanch" role="dialog" aria-modal="true" aria-label={t(UI.scanChooseTitle, lang)}>
        <h2 class="confirm__title">{t(UI.scanChooseTitle, lang)}</h2>
        <p class="confirm__body">{t(UI.scanChooseSub, lang)}</p>
        <div class="scanch__list">
          {opts.map((o) => (
            <button key={o.id} type="button" class="scanch__opt" onClick={() => onPick(o.id)}>
              <span class="scanch__emoji" aria-hidden="true">
                {o.emoji}
              </span>
              <span class="scanch__txt">
                <b>
                  {t(o.name, lang)}
                  {lastUsed === o.id && <em class="scanch__last">· {t(UI.scanLastUsed, lang)}</em>}
                </b>
                <small>{t(o.sub, lang)}</small>
              </span>
            </button>
          ))}
        </div>
        {!isMobile && <p class="confirm__body scanch__desktop">{t(UI.scanDesktopHint, lang)}</p>}
        <p class="confirm__body">{t(UI.scanHint, lang)}</p>
        <div class="confirm__btns">
          <button class="mdv-btn mdv-btn--ghost" onClick={onClose}>
            {t(UI.cancel, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Trang chỉ-đọc khi người nhận bấm link #/pp/<payload>: thấy đúng thẻ hộ chiếu
 *  của người chia sẻ + có thể nhập tiến độ đó vào máy mình. */
export function PassportShareScreen({ payload }: { payload: string }) {
  const lang = useLang()[0];
  const decoded = useMemo(() => decodePassportPayload(payload), [payload]);
  const [imported, setImported] = useState(false);
  const { ask, setAsk } = useConfirm();
  const srcDoc = useMemo(() => (decoded ? exportPassportCardHtml(decoded.progress, decoded.json) : ''), [decoded]);
  const doImport = () =>
    decoded &&
    setAsk({
      title: t(UI.shareImport, lang),
      body: t(UI.shareImportAsk, lang),
      ok: t(UI.shareImport, lang),
      act: () => {
        applyPassportImport(decoded.progress, 'merge');
        setImported(true);
        navigate('passport');
      },
    });
  return (
    <main class="mdv-screen pshare">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow" style="display:inline-flex;align-items:center;gap:6px">
            <BrandMark size={16} /> {t(UI.appName, lang)}
          </span>
          <h1>{t(UI.shareScreenTitle, lang)}</h1>
        </div>
        <a class="mdv-btn mdv-btn--icon" href={routeHref.map} aria-label={t(UI.map, lang)}>
          <Icon name="back" />
        </a>
      </header>
      {decoded ? (
        <>
          <p class="mdv-muted">{t(UI.shareScreenIntro, lang)}</p>
          <iframe class="pshare__card" title={t(UI.shareScreenTitle, lang)} srcDoc={srcDoc} sandbox="" />
          <div class="pshare__actions">
            <button class="mdv-btn mdv-btn--primary" onClick={doImport} disabled={imported}>
              <Icon name="check" /> {imported ? t(UI.shareImported, lang) : t(UI.shareImport, lang)}
            </button>
            <a class="mdv-btn" href={routeHref.map}>
              {t(UI.map, lang)}
            </a>
          </div>
        </>
      ) : (
        <>
          <p class="mdv-muted">{t(UI.shareInvalid, lang)}</p>
          <a class="mdv-btn mdv-btn--primary" href={routeHref.map}>
            {t(UI.map, lang)}
          </a>
        </>
      )}
      <ConfirmSheet ask={ask} lang={lang} onClose={() => setAsk(null)} />
    </main>
  );
}

/** Tem QR không giải được (mờ/sai/không thuộc app) — báo rõ thay vì rơi về bản đồ im lặng. */
export function QrFailScreen() {
  const lang = useLang()[0];
  return (
    <main class="mdv-screen pshare">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow" style="display:inline-flex;align-items:center;gap:6px">
            <BrandMark size={16} /> {t(UI.appName, lang)}
          </span>
          <h1>{t(UI.qrFailTitle, lang)}</h1>
        </div>
        <a class="mdv-btn mdv-btn--icon" href={routeHref.map} aria-label={t(UI.map, lang)}>
          <Icon name="back" />
        </a>
      </header>
      <p class="mdv-muted">
        <Icon name="warn" size={16} /> {t(UI.qrFailBody, lang)}
      </p>
      <div class="pshare__actions">
        <a class="mdv-btn mdv-btn--primary" href="#/map?code=1">
          <Icon name="search" /> {t(UI.qrFailManual, lang)}
        </a>
        <a class="mdv-btn" href={routeHref.map}>
          {t(UI.map, lang)}
        </a>
      </div>
    </main>
  );
}

/** Sao lưu & chuyển thiết bị (nhóm Hành trình trong Cài đặt): xuất/nhập có xem trước + chọn gộp/thay thế. */
function BackupCard({ lang }: { lang: Lang }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ progress: Progress; spots: number; xp: number; exportedAt: string | null } | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2600);
  };

  const doExport = () => {
    const blob = new Blob([exportPassportCardHtml()], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ho-chieu-mo-dau-viet-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    flash(t(UI.backupExported, lang));
  };

  const doPick = async (f: File | undefined) => {
    if (!f) return;
    if (fileRef.current) fileRef.current.value = '';
    const pv = previewPassportJson(await f.text());
    if (!pv) {
      flash(t(UI.importBad, lang));
      return;
    }
    setPreview(pv);
  };

  const apply = (mode: 'merge' | 'replace') => {
    if (preview) applyPassportImport(preview.progress, mode);
    setPreview(null);
    flash(t(UI.importOk, lang));
  };

  return (
    <div>
      <h3 style="font-size:var(--text-sm);margin:0 0 4px">{t(UI.backupTitle, lang)}</h3>
      <p class="mdv-muted" style="margin:0 0 10px;font-size:var(--text-sm)">{t(UI.backupDesc, lang)}</p>
      {preview ? (
        <div class="backup__preview">
          <p class="backup__pvtitle">{t(UI.backupPreviewTitle, lang)}</p>
          <p class="backup__pvmeta">
            {preview.spots}/{SITES.reduce((n, s) => n + s.spots.length, 0)} {t(UI.spots, lang)} · {preview.xp} XP
            {preview.exportedAt ? ` · ${new Date(preview.exportedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}` : ''}
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="mdv-btn mdv-btn--primary" onClick={() => apply('merge')}>
              {t(UI.backupMerge, lang)}
            </button>
            <button class="mdv-btn mdv-btn--ghost" onClick={() => apply('replace')}>
              {t(UI.backupReplace, lang)}
            </button>
            <button class="mdv-btn mdv-btn--ghost" onClick={() => setPreview(null)}>
              {t(UI.cancel, lang)}
            </button>
          </div>
        </div>
      ) : (
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="mdv-btn mdv-btn--ghost" onClick={doExport}>
            {t(UI.exportPassport, lang)}
          </button>
          <button class="mdv-btn mdv-btn--ghost" onClick={() => fileRef.current?.click()}>
            {t(UI.importPassport, lang)}
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".html,.json,application/json,text/html" hidden aria-label={t(UI.importPassport, lang)} onChange={(e) => void doPick((e.target as HTMLInputElement).files?.[0])} />
      {msg && <p class="ppass__toolmsg" role="status">{msg}</p>}
    </div>
  );
}

export function QuizScreen({ at }: { at?: string }) {
  const [lang] = useLang();
  useProgress();
  const [helpMenu, setHelpMenu] = useState(false);
  const [active, setActive] = useState<{ siteId: string; spotId: string } | null>(() => {
    // Deep link #/quiz?at=<site>/<spot> từ CTA "thử tài tại đây" — validate trước khi mở.
    const [siteId, spotId] = at?.split('/') ?? [];
    return siteId && spotId && getSpot(siteId, spotId)?.spot.quiz?.length ? { siteId, spotId } : null;
  });
  const spotsWithQuiz = SITES.flatMap((s) => s.spots.filter((sp) => sp.quiz && sp.quiz.length > 0).map((sp) => ({ site: s, spot: sp })));

  if (active) {
    const found = getSpot(active.siteId, active.spotId);
    if (found?.spot.quiz?.length) {
      return <QuizRun site={found.site} spot={found.spot} lang={lang} onExit={() => setActive(null)} />;
    }
  }
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.quiz, lang)}</span>
          <h1>{lang === 'vi' ? 'Thử tài sĩ tử' : 'Scholar challenge'}</h1>
        </div>
        <button class="mdv-chip" onClick={() => setHelpMenu(true)} aria-label={t(UI.howto, lang)}>
          <Icon name="help" size={16} />
        </button>
      </header>
      <p class="mdv-muted">{t(UI.quizPickSpot, lang)}</p>
      <div class="quiz__list">
        {SITES.map((s) => {
          const withQuiz = s.spots.filter((sp) => sp.quiz && sp.quiz.length > 0);
          if (!withQuiz.length) return null;
          return (
            <section key={s.entityId} class="mdv-card quiz__site">
              <div class="quiz__sitename">
                <b>{t(s.name, lang)}</b>
                <span class="mdv-muted">{t(s.province, lang)}</span>
              </div>
              {withQuiz.map((sp) => {
                const best = quizBest(s.entityId, sp.spotId);
                const locked = !isSpotUnlocked(s.entityId, sp.spotId);
                return (
                  <button key={sp.spotId} class="quiz__row" onClick={() => setActive({ siteId: s.entityId, spotId: sp.spotId })}>
                    <Icon name="quiz" size={18} />
                    <span class="quiz__name">{t(sp.name, lang)}</span>
                    {locked && (
                      <span class="quiz__lock" title={t(UI.quizLockedHint, lang)}>
                        <Icon name="lock" size={11} /> {t(UI.locked, lang)}
                      </span>
                    )}
                    <small class="mdv-muted">
                      {sp.quiz!.length} {lang === 'vi' ? 'câu' : 'qs'}
                      {best !== undefined && ` · ${t(UI.bestScore, lang)} ${best}/${sp.quiz!.length}`}
                    </small>
                    <Icon name="back" size={16} class="flip" />
                  </button>
                );
              })}
            </section>
          );
        })}
        {!spotsWithQuiz.length && <p class="mdv-muted">{t(UI.quizNoData, lang)}</p>}
      </div>
      {helpMenu && (
        <HelpMenu
          lang={lang}
          onClose={() => setHelpMenu(false)}
          onTour={() => {
            setHelpMenu(false);
            goScreenTour(QUIZ_TOUR_STEPS);
          }}
          tourTitle={UI.helpMenuTourQuiz}
          tourSub={UI.helpMenuTourQuizSub}
        />
      )}
    </main>
  );
}

/** Chơi quiz một điểm: chọn đáp án -> hiện đúng/sai -> câu tiếp -> kết quả + XP (phần vượt best). */
function QuizRun({ site, spot, lang, onExit }: { site: Site; spot: Spot; lang: Lang; onExit: () => void }) {
  const quiz = spot.quiz!;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [gained, setGained] = useState<number | null>(null);
  const best = quizBest(site.entityId, spot.spotId);
  // Đáp án luôn cùng vị trí -> khách học thuộc thứ tự chứ không học nội dung.
  // Xáo trộn thứ tự HIỂN THỊ mỗi lượt chơi; đối chiếu qua orders[idx][displayIdx].
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const orders = useMemo(
    () =>
      quiz.map((qq) => {
        const ord = qq.options.map((_, i) => i);
        for (let i = ord.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ord[i], ord[j]] = [ord[j], ord[i]];
        }
        return ord;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quiz, shuffleSeed]
  );

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (orders[idx][i] === quiz[idx].answer) setCorrect((c) => c + 1);
    if (navigator.vibrate) navigator.vibrate(orders[idx][i] === quiz[idx].answer ? 20 : [60, 40, 60]);
  };
  const locked = !isSpotUnlocked(site.entityId, spot.spotId);
  const nextQ = () => {
    if (idx + 1 >= quiz.length) {
      // Điểm chưa check-in: chơi thử được (hội đồng xem trước) nhưng không ghi XP.
      const g = locked ? 0 : recordQuizResult(site.entityId, spot.spotId, correct, quiz.length);
      setGained(g);
      setDone(true);
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  if (done) {
    // Gợi ý điểm có quiz kế tiếp chưa làm — ưu tiên cùng khu (đang đứng trong khu),
    // loại chính điểm vừa chơi (chơi thử không ghi best nên sẽ bị gợi lại nếu không lọc).
    const quizSpots = (s: (typeof SITES)[number]) =>
      s.spots.filter((sp) => sp.quiz?.length).map((sp) => ({ site: s, spot: sp }));
    const isUnplayed = ({ site: s, spot: sp }: { site: Site; spot: Spot }) =>
      !(s.entityId === site.entityId && sp.spotId === spot.spotId) && quizBest(s.entityId, sp.spotId) === undefined;
    const nextQuiz = quizSpots(site).find(isUnplayed) ?? SITES.flatMap(quizSpots).find(isUnplayed);
    return (
      <main class="mdv-screen">
        <div class="mdv-card quiz__result">
          <Icon name="award" size={40} />
          <h2>{t(UI.quizResult, lang)}</h2>
          <div class="quiz__score">
            {correct}/{quiz.length} <small>{t(UI.quizCorrect, lang)}</small>
          </div>
          <p class="quiz__praise">
            {t(correct === quiz.length ? UI.quizPraisePerfect : correct / quiz.length >= 0.6 ? UI.quizPraiseGood : UI.quizPraiseLow, lang)}
          </p>
          {gained !== null && gained > 0 ? (
            <p class="quiz__xp">+{gained} XP</p>
          ) : locked ? (
            <p class="mdv-muted">{t(UI.quizTrial, lang)}</p>
          ) : (
            <p class="mdv-muted">{best !== undefined && `${t(UI.bestScore, lang)}: ${best}/${quiz.length}`}</p>
          )}
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="mdv-btn mdv-btn--ghost" onClick={() => (setIdx(0), setPicked(null), setCorrect(0), setDone(false), setGained(null), setShuffleSeed((s) => s + 1))}>
              {t(UI.quizAgain, lang)}
            </button>
            <button class="mdv-btn mdv-btn--primary" onClick={onExit}>
              {t(UI.back, lang)}
            </button>
          </div>
          {nextQuiz && (
            <a class="quiz__nextlink" href={routeHref.destination(nextQuiz.site.entityId, nextQuiz.spot.spotId)}>
              {t(UI.quizNextSpot, lang)}: {t(nextQuiz.spot.name, lang)} →
            </a>
          )}
        </div>
      </main>
    );
  }

  const q = quiz[idx];
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <button class="mdv-btn mdv-btn--icon" onClick={onExit} aria-label={t(UI.back, lang)}>
          <Icon name="back" size={18} />
        </button>
        <div>
          <span class="mdv-eyebrow">{t(spot.name, lang)}</span>
          <h1>
            {t(UI.quizQuestion, lang)} {idx + 1}/{quiz.length}
          </h1>
        </div>
      </header>
      {/* Báo chơi thử NGAY câu đầu — không để khách bỏ công xong mới biết không có XP. */}
      {locked && <p class="quiz__trialnote">{t(UI.quizTrial, lang)}</p>}
      <div class="mdv-card">
        <div
          class="quiz__prog"
          role="progressbar"
          aria-label={t(UI.quizProgress, lang)}
          aria-valuemin={0}
          aria-valuemax={quiz.length}
          aria-valuenow={idx + (picked !== null ? 1 : 0)}
        >
          <span style={{ width: `${((idx + (picked !== null ? 1 : 0)) / quiz.length) * 100}%` }} />
        </div>
        <p class="quiz__q">{t(q.q, lang)}</p>
        <div class="quiz__opts">
          {orders[idx].map((optIdx, dispIdx) => {
            const o = q.options[optIdx];
            const cls = picked === null ? '' : optIdx === q.answer ? 'is-correct' : dispIdx === picked ? 'is-wrong' : 'is-dim';
            return (
              <button key={optIdx} class={`quiz__opt ${cls}`} onClick={() => pick(dispIdx)} disabled={picked !== null}>
                {t(o, lang)}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div class={`quiz__mark ${orders[idx][picked] === q.answer ? 'ok' : 'bad'}`}>
            {t(orders[idx][picked] === q.answer ? UI.correctMark : UI.wrongMark, lang)}
          </div>
        )}
        {picked !== null && q.explain && (
          <p class="quiz__explain">
            <b>{t(UI.quizExplain, lang)}</b> {t(q.explain, lang)}
          </p>
        )}
        {picked !== null && (
          <button class="mdv-btn mdv-btn--primary" style="width:100%;margin-top:12px" onClick={nextQ}>
            {t(idx + 1 >= quiz.length ? UI.quizResult : UI.quizNext, lang)}
          </button>
        )}
      </div>
    </main>
  );
}

/* Dải màu của thanh %: xám → ngọc → vàng → cam theo mức tăng. */
interface LevelBand {
  to: number;
  color: string;
  name: { vi: string; en: string };
}

const FONT_BANDS: LevelBand[] = [
  { to: 95, color: '#64748b', name: { vi: 'Nhỏ gọn', en: 'Compact' } },
  { to: 108, color: '#0f766e', name: { vi: 'Vừa đọc', en: 'Standard' } },
  { to: 120, color: '#b45309', name: { vi: 'Lớn', en: 'Large' } },
  { to: Number.MAX_SAFE_INTEGER, color: '#c2410c', name: { vi: 'Rất lớn', en: 'Extra large' } },
];

const FLAT_BANDS: LevelBand[] = [
  { to: 25, color: '#64748b', name: { vi: 'Giữ nền mờ', en: 'Keep ambience' } },
  { to: 55, color: '#0f766e', name: { vi: 'Nhẹ', en: 'Subtle' } },
  { to: 85, color: '#b45309', name: { vi: 'Vừa', en: 'Medium' } },
  { to: Number.MAX_SAFE_INTEGER, color: '#c2410c', name: { vi: 'Nền đơn sắc', en: 'Solid' } },
];

/** Thanh trượt % có dải màu theo mức — phần đã kéo tô gradient band, còn lại xám. */
function LevelSlider({
  lang,
  min,
  max,
  value,
  bands,
  onChange,
  aria,
}: {
  lang: Lang;
  min: number;
  max: number;
  value: number;
  bands: LevelBand[];
  onChange: (v: number) => void;
  aria: string;
}) {
  const band = bands.find((b) => value <= b.to) ?? bands[bands.length - 1];
  const fill = ((value - min) / (max - min)) * 100;
  const stops = bands
    .map((b, i) => {
      const from = i === 0 ? 0 : Math.min(100, ((bands[i - 1].to - min) / (max - min)) * 100);
      const to = Math.min(100, ((b.to - min) / (max - min)) * 100);
      return `${b.color} ${from}%, ${b.color} ${to}%`;
    })
    .join(', ');
  return (
    <>
      <span class="lv__meta">
        <span class="lv__zone" style={{ color: band.color }}>
          {t(band.name, lang)}
        </span>
        <span class="lv__val" style={{ background: band.color }}>
          {value}%
        </span>
      </span>
      <input
        class="lv__range"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={aria}
        aria-valuetext={`${value}%`}
        style={{
          '--lv-fill': `${fill}%`,
          '--lv-grad': `linear-gradient(90deg, ${stops})`,
          '--lv-thumb': band.color,
        }}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
      />
    </>
  );
}

export function SettingsScreen() {
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  const [fontPct, setFontPct] = useFontScale();
  const [flatPct, setFlatPct] = useAmbientFlat();
  const { ask, setAsk } = useConfirm();
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.settings, lang)}</span>
          <h1>{t(UI.settings, lang)}</h1>
        </div>
      </header>
      <div class="setgrid" style="display:grid;gap:var(--space-3)">
        <section class="mdv-card">
          <h2 style="font-size:var(--text-md);margin:0 0 12px">{t(UI.groupDisplay, lang)}</h2>
          <div class="setrow">
            <span class="setrow__lbl">{t(UI.theme, lang)}</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="mdv-chip" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
                <Icon name="moon" size={16} /> {t(UI.dark, lang)}
              </button>
              <button class="mdv-chip" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
                <Icon name="sun" size={16} /> {t(UI.light, lang)}
              </button>
            </div>
          </div>
          <div class="setrow">
            <span class="setrow__lbl">{t(UI.language, lang)}</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="mdv-chip" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
                Tiếng Việt
              </button>
              <button class="mdv-chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
                English
              </button>
            </div>
          </div>
          <div class="setrow">
            <span class="setrow__lbl">{t(UI.fontSize, lang)}</span>
            <LevelSlider
              lang={lang}
              min={FONT_PCT_MIN}
              max={FONT_PCT_MAX}
              value={fontPct}
              bands={FONT_BANDS}
              onChange={setFontPct}
              aria={t(UI.fontSize, lang)}
            />
          </div>
          <div class="setrow">
            <span class="setrow__lbl">{t(UI.flatLevel, lang)}</span>
            <LevelSlider
              lang={lang}
              min={0}
              max={FLAT_PCT_MAX}
              value={flatPct}
              bands={FLAT_BANDS}
              onChange={setFlatPct}
              aria={t(UI.flatLevel, lang)}
            />
          </div>
        </section>

        <section class="mdv-card">
          <h2 style="font-size:var(--text-md);margin:0 0 12px">{t(UI.groupJourney, lang)}</h2>
          <p class="mdv-muted" style="font-size:var(--text-sm);margin:0 0 12px">
            {t(UI.storedLocally, lang)}
          </p>
          <BackupCard lang={lang} />
          <div class="setrow" style="margin-top:14px">
            <span class="setrow__lbl">{lang === 'vi' ? 'Đặt lại' : 'Reset'}</span>
            <button
              class="mdv-btn mdv-btn--ghost"
              onClick={() =>
                setAsk({
                  title: lang === 'vi' ? 'Xóa toàn bộ tiến độ hành trình?' : 'Reset all journey progress?',
                  ok: lang === 'vi' ? 'Đặt lại' : 'Reset',
                  danger: true,
                  act: resetProgress,
                })
              }
            >
              {lang === 'vi' ? 'Đặt lại tiến độ' : 'Reset progress'}
            </button>
          </div>
          <div class="setrow setrow--split" style="margin-top:14px">
            <button
              class="mdv-btn mdv-btn--ghost mdv-btn--sm"
              onClick={() =>
                setAsk({
                  title:
                    lang === 'vi'
                      ? 'Xóa bộ nhớ đệm và tải lại? Ảnh/audio sẽ tải lại khi có mạng.'
                      : 'Clear cached content and reload? Media will download again when online.',
                  ok: lang === 'vi' ? 'Xóa & tải lại' : 'Clear & reload',
                  act: () => {
                    void (async () => {
                      try {
                        const keys = await caches.keys();
                        await Promise.all(keys.map((k) => caches.delete(k)));
                        const regs = await navigator.serviceWorker?.getRegistrations();
                        await Promise.all((regs ?? []).map((r) => r.unregister()));
                      } finally {
                        location.reload();
                      }
                    })();
                  },
                })
              }
            >
              {lang === 'vi' ? 'Xóa bộ nhớ đệm' : 'Clear cache'}
            </button>
            <button
              class="mdv-btn mdv-btn--ghost mdv-btn--sm mdv-btn--danger"
              onClick={() =>
                setAsk({
                  title:
                    lang === 'vi'
                      ? 'Xóa TOÀN BỘ dữ liệu? Tiến độ, cài đặt và bộ nhớ đệm sẽ về như lần đầu mở app — không khôi phục được.'
                      : 'Delete ALL data? Progress, settings and cache return to first-launch state — cannot be undone.',
                  ok: lang === 'vi' ? 'Xóa toàn bộ' : 'Delete everything',
                  danger: true,
                  act: () => {
                    void (async () => {
                      try {
                        for (const k of Object.keys(localStorage)) {
                          if (k.startsWith('mdv.')) localStorage.removeItem(k);
                        }
                        await Promise.all(
                          ['mdv'].map(
                            (db) =>
                              new Promise<void>((res) => {
                                const rq = indexedDB.deleteDatabase(db);
                                rq.onsuccess = rq.onerror = rq.onblocked = () => res();
                              })
                          )
                        );
                        const keys = await caches.keys();
                        await Promise.all(keys.map((k) => caches.delete(k)));
                        const regs = await navigator.serviceWorker?.getRegistrations();
                        await Promise.all((regs ?? []).map((r) => r.unregister()));
                      } finally {
                        location.reload();
                      }
                    })();
                  },
                })
              }
            >
              {lang === 'vi' ? 'Xóa toàn bộ dữ liệu' : 'Delete all data'}
            </button>
          </div>
        </section>

        <section class="mdv-card">
          <h2 style="font-size:var(--text-md);margin:0 0 6px">{t(UI.groupHelp, lang)}</h2>
          <a class="setlink" href={routeHref.help}>
            <Icon name="help" size={16} /> {t(UI.howto, lang)}
            <Icon name="forward" size={14} />
          </a>
          <a class="setlink" href={routeHref.sources}>
            <Icon name="info" size={16} /> {t(UI.sourcesTitle, lang)}
            <Icon name="forward" size={14} />
          </a>
          <a class="setlink" href={routeHref.about}>
            <Icon name="passport" size={16} /> {t(UI.about, lang)}
            <Icon name="forward" size={14} />
          </a>
        </section>
        <p class="mdv-muted" style="font-size:var(--text-xs);text-align:center">
          {t(UI.appName, lang)} v{__APP_VERSION__} · {__BUILD_STAMP__}
        </p>
      </div>
      <ConfirmSheet ask={ask} lang={lang} onClose={() => setAsk(null)} />
    </main>
  );
}

/** Trợ giúp (#/help): hướng dẫn dùng app cho người mới + FAQ ngắn. */
export function HelpScreen() {
  const [lang] = useLang();
  const vi = lang === 'vi';
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.help, lang)}</span>
          <h1>{t(UI.howto, lang)}</h1>
        </div>
        <a class="mdv-btn mdv-btn--icon" href={routeHref.settings} aria-label={t(UI.back, lang)}>
          <Icon name="back" />
        </a>
      </header>
      <button
        class="mdv-btn mdv-btn--primary"
        style="width:100%;justify-content:center;margin-bottom:12px"
        onClick={() => {
          try {
            localStorage.setItem('mdv.tourReq', '1');
          } catch {
            /* bộ nhớ riêng tư */
          }
          navigate('map');
        }}
      >
        ▶ {t(UI.tourWatch, lang)}
      </button>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Bắt đầu trong 30 giây' : 'Start in 30 seconds'}</h2>
        <ol class="steplist">
          <li>
            <Icon name="compass" size={16} /> {t(UI.howtoStep1, lang)}
          </li>
          <li>
            <Icon name="qr" size={16} /> {t(UI.howtoStep2, lang)}
          </li>
          <li>
            <Icon name="passport" size={16} /> {t(UI.howtoStep3, lang)}
          </li>
        </ol>
      </section>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Quét tem QR' : 'Scanning a tag'}</h2>
        <p class="steptext">
          {vi
            ? 'Mở camera điện thoại, hướng vào mã trên tem tại điểm di sản — link mở thẳng trang điểm. Khi mã hợp lệ, chọn một chủ đề muốn khám phá (hoặc nút Nhận dấu) — dấu và XP được lưu ngay.'
            : 'Open your phone camera at a tag at the site — the link opens the spot page directly. Once the code checks out, pick a topic to explore (or the Stamp button) — your stamp and XP are saved instantly.'}
        </p>
        <p class="steptext">
          {vi
            ? 'Camera không quét được? Vào bản đồ → Tìm kiếm → nhập mã 16 ký tự in dưới tem.'
            : 'Camera trouble? On the map → Search → type the 16-character code printed under the tag.'}
        </p>
      </section>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Mất mạng & đổi máy' : 'Offline & switching devices'}</h2>
        <p class="steptext">
          {vi
            ? 'Sau lần mở đầu, app chạy kể cả khi không có mạng. Dấu và XP lưu ngay trên thiết bị — không cần tài khoản.'
            : 'After the first open, the app works fully offline. Stamps and XP stay on the device — no account needed.'}
        </p>
        <p class="steptext">
          {vi
            ? 'Đổi máy: Cài đặt → Sao lưu → tải thẻ hộ chiếu (.html) → máy mới mở app → Khôi phục → chọn file đó.'
            : 'New phone: Settings → Backup → download the passport card (.html) → on the new device open the app → Restore → pick that file.'}
        </p>
      </section>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Câu hỏi thường gặp' : 'FAQ'}</h2>
        <details class="steptext">
          <summary>{vi ? 'Quét lại điểm đã có dấu?' : 'Re-scan a stamped spot?'}</summary>
          <p>
            {vi
              ? 'Vẫn được — nội dung mở lại bình thường, chỉ không cộng thêm dấu/XP.'
              : 'Fine — the content reopens normally; no extra stamp or XP is added.'}
          </p>
        </details>
        <details class="steptext">
          <summary>{vi ? 'Máy không đọc thuyết minh?' : 'No narration voice?'}</summary>
          <p>
            {vi
              ? 'Một số máy thiếu giọng đọc — bản văn đầy đủ luôn nằm ngay dưới nút Nghe để đọc tay.'
              : 'Some devices lack a speech voice — the full script sits right under the Play button to read.'}
          </p>
        </details>
        <details class="steptext">
          <summary>{vi ? 'Dữ liệu có gửi lên mạng không?' : 'Is my data uploaded?'}</summary>
          <p>
            {vi
              ? 'Không. Toàn bộ hành trình chỉ nằm trong máy của bạn.'
              : 'No. Your whole journey stays on your device.'}
          </p>
        </details>
      </section>
    </main>
  );
}

/** Về sản phẩm (#/about): đội ngũ, mục đích, phạm vi thực — không quảng bá. */
export function AboutScreen() {
  const [lang] = useLang();
  const vi = lang === 'vi';
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.about, lang)}</span>
          <h1 style="display:flex;align-items:center;gap:10px">
            <BrandMark size={30} /> {t(UI.appName, lang)}
          </h1>
        </div>
        <a class="mdv-btn mdv-btn--icon" href={routeHref.settings} aria-label={t(UI.back, lang)}>
          <Icon name="back" />
        </a>
      </header>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Sản phẩm này là gì?' : 'What is this?'}</h2>
        <p class="steptext">
          {vi
            ? 'Đề tài khoa học kỹ thuật cấp thành phố của nhóm học sinh: biến mỗi điểm di sản thành một hướng dẫn viên số hai ngôn ngữ — quét tem QR là nghe được câu chuyện, nhận dấu vào hộ chiếu và tự kiểm tra bằng quiz. Chạy ngay trên web, không cần cài app, dùng được cả khi mất mạng.'
            : 'A city-level science fair project by a student team: it turns every heritage stop into a bilingual digital guide — scan a tag to hear the story, collect a passport stamp and self-check with a quiz. Runs on the web, no install, works offline.'}
        </p>
      </section>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Phạm vi hiện tại' : 'Current scope'}</h2>
        <p class="steptext">
          {vi
            ? 'Đây là một hành trình mẫu 10 điểm, làm sâu nhất tại Văn Miếu – Quốc Tử Giám (6 điểm trong khu), cùng 4 điểm mở rộng ở Dinh Độc Lập, Vịnh Hạ Long, Cố đô Huế và Thánh địa Mỹ Sơn. Chưa phải bản phủ đều cả nước.'
            : 'This is a 10-stop sample journey, deepest at the Temple of Literature (6 in-site stops), plus single showcase stops at the Independence Palace, Ha Long Bay, Hue and My Son — not nationwide coverage.'}
        </p>
        <p class="steptext">
          {vi
            ? 'Bản thử nghiệm: hành trình lưu trên thiết bị, chưa có tài khoản đồng bộ; dùng Sao lưu để chuyển máy.'
            : 'Preview build: journeys live on the device — no account sync yet; use Backup to move phones.'}
        </p>
      </section>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Tư liệu & ảnh' : 'Sources & photos'}</h2>
        <p class="steptext">
          {vi
            ? 'Nội dung Văn Miếu biên soạn theo tư liệu nhóm sưu tầm và đang đối chiếu — mục chưa đối chiếu xong được ghi nhãn "đang đối chiếu" ngay trong app. Ảnh lấy từ Wikimedia Commons (ghi rõ tác giả & giấy phép) và khung hình trích từ video do nhóm tự quay.'
            : 'Temple of Literature content is compiled from material the team gathered and is still cross-checking — unchecked items are labeled "cross-checking" in-app. Photos come from Wikimedia Commons (author & license credited) plus frames from footage shot by the team.'}
        </p>
        <a class="mdv-btn mdv-btn--ghost" href={routeHref.sources}>
          <Icon name="info" size={16} /> {t(UI.sourcesTitle, lang)}
        </a>
      </section>
      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{vi ? 'Xác minh & phản hồi' : 'Verification & feedback'}</h2>
        <p class="steptext">
          {vi
            ? 'Toàn bộ mã nguồn, tem QR và danh mục tư liệu mở công khai để đối chiếu. Mọi góp ý/sai sót xin gửi qua mục Issues của kho mã.'
            : 'All code, QR tags and the media ledger are public for verification. Feedback or corrections go to the repository’s Issues page.'}
        </p>
        <a class="mdv-btn mdv-btn--ghost" href="https://github.com/nguyenduyhungnguyen1998-blip/Bainopkhkt" target="_blank" rel="noreferrer">
          <Icon name="share" size={16} /> github.com/nguyenduyhungnguyen1998-blip/Bainopkhkt
        </a>
        <p class="mdv-muted" style="font-size:var(--text-xs);margin:8px 0 0">
          {vi ? 'Cập nhật tháng 9/2026 · ' : 'Updated September 2026 · '}
          {t(UI.appName, lang)} v{__APP_VERSION__} · {__BUILD_STAMP__}
        </p>
      </section>
      <p class="mdv-muted" style="font-size:var(--text-xs);text-align:center">
        {t(UI.appName, lang)} v{__APP_VERSION__} · {__BUILD_STAMP__}
      </p>
    </main>
  );
}

/** Nguồn (#/sources): sổ ghi công từng ảnh + tư liệu nội dung từng điểm. */
export function SourcesScreen() {
  const [lang] = useLang();
  const vi = lang === 'vi';
  const entries = Object.entries(IMAGE_CREDITS);
  // Ảnh → điểm đang dùng nó (để hiện tên điểm thay tên file .webp).
  const spotOf = new Map<string, Spot>();
  for (const s of SITES) {
    for (const sp of s.spots) {
      for (const m of JSON.stringify(sp).matchAll(/\/img\/[A-Za-z0-9._%\/-]+/g)) {
        if (!spotOf.has(m[0])) spotOf.set(m[0], sp);
      }
    }
  }
  // Nhóm theo khu (thư mục /img/<site>/), khu nào trước theo thứ tự hành trình.
  const groups = new Map<string, [string, (typeof entries)[number][1]][]>();
  for (const e of entries) {
    const key = e[0].split('/')[2] ?? 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const orderedKeys = [...SITES.map((s) => s.entityId).filter((k) => groups.has(k)), ...[...groups.keys()].filter((k) => !SITES.some((s) => s.entityId === k))];
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.about, lang)}</span>
          <h1>{t(UI.sourcesTitle, lang)}</h1>
        </div>
        <a class="mdv-btn mdv-btn--icon" href={routeHref.settings} aria-label={t(UI.back, lang)}>
          <Icon name="back" />
        </a>
      </header>
      <p class="mdv-muted" style="font-size:var(--text-xs)">
        {vi
          ? 'Ảnh Wikimedia Commons ghi kèm tác giả & giấy phép; phần còn lại là frame video do nhóm tự quay (nhóm giữ tư liệu gốc).'
          : 'Wikimedia Commons photos carry author & license; the rest are frames from footage the team shot itself (originals kept on file).'}
      </p>
      {orderedKeys.map((key) => {
        const site = SITES.find((s) => s.entityId === key);
        const list = groups.get(key)!;
        return (
          <section key={key} class="mdv-card">
            <h2 style="font-size:var(--text-md);margin:0 0 10px">
              {t(UI.photoSources, lang)} — {site ? t(site.name, lang) : vi ? 'Khác' : 'Other'}
            </h2>
            {list.map(([path, c]) => {
              const sp = spotOf.get(path);
              const label = sp
                ? t(sp.name, lang)
                : path
                    .split('/')
                    .pop()!
                    .replace('.webp', '')
                    .replace(/-/g, ' ');
              return (
                <div key={path} class="srcrow">
                  <img class="srcrow__thumb" src={asset(path)} alt="" loading="lazy" />
                  <span class="srcrow__txt">
                    <span class="srcrow__file">{label}</span>
                    <span class="srcrow__meta">
                      {c.author} ·{' '}
                      {c.licenseUrl ? (
                        <a href={c.licenseUrl} target="_blank" rel="noreferrer">
                          {c.license}
                        </a>
                      ) : (
                        c.license
                      )}
                      {c.sourceUrl ? (
                        <>
                          {' '}
                          ·{' '}
                          <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                            {t(UI.viewSource, lang)}
                          </a>
                        </>
                      ) : (
                        <> · {c.source}</>
                      )}
                      {c.note ? (
                        <>
                          {' '}
                          · <i>{t(c.note, lang)}</i>
                        </>
                      ) : null}
                    </span>
                  </span>
                </div>
              );
            })}
          </section>
        );
      })}
      {SITES.map((s) => {
        const spots = s.spots.filter((sp) => sp.sources?.length);
        if (!spots.length) return null;
        return (
          <section key={s.entityId} class="mdv-card">
            <h2 style="font-size:var(--text-md);margin:0 0 10px">
              {t(UI.contentSources, lang)} — {t(s.name, lang)}
            </h2>
            {spots.map((sp) => (
              <div key={sp.spotId} style="margin-bottom:10px">
                <b style="font-size:var(--text-sm)">{t(sp.name, lang)}</b>
                <ul class="srclist">
                  {sp.sources!.map((src) => (
                    <li key={src.title}>
                      {src.url ? (
                        <a href={src.url} target="_blank" rel="noreferrer">
                          {src.title}
                        </a>
                      ) : (
                        src.title
                      )}
                      {src.reviewed === false && (
                        <span class="srclist__pending">{t(UI.crossChecking, lang)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}

/**
 * Bảng điều khiển demo (#/admin) – dựng kịch bản trình diễn mà không cần quét QR thật:
 * mở/khóa từng điểm, mở cả khu, đặt điểm quiz, cộng XP, reset cờ finale.
 * Mở khóa đi qua unlockSpot thật nên confetti + finale cấp khu tự chạy -> demo được cả màn ăn mừng.
 */
export function AdminScreen() {
  const p = useProgress();
  const [lang] = useLang();
  const { ask, setAsk } = useConfirm();
  const [, forceTick] = useState(0); // re-render sau thao tác cục bộ (finale flags)
  // Mở trang admin = có ý định demo -> bật luôn nút điều khiển nổi (DemoDock).
  useEffect(() => enableDemoDock(), []);
  const totalSpots = SITES.reduce((n, s) => n + s.spots.length, 0);
  const doneSpots = Object.keys(p.unlocked).length;

  const unlockSite = (site: Site) => site.spots.forEach((sp) => unlockSpot(site.entityId, sp.spotId));
  const unlockAll = () => SITES.forEach(unlockSite);
  const clearFinaleFlags = () => {
    try {
      localStorage.removeItem('mdv.finale.v1');
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('mdv.sitefin.')) localStorage.removeItem(k);
      }
    } catch {
      /* bộ nhớ riêng tư */
    }
    forceTick((n) => n + 1);
  };

  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">Demo admin</span>
          <h1>Bảng điều khiển trình diễn</h1>
        </div>
      </header>
      <p class="mdv-muted">
        Dựng kịch bản cho giám khảo: mở khóa từng điểm/khu, đặt điểm thử tài, cộng XP. Mọi thao tác đi qua hệ
        tiến độ thật — confetti và finale cấp khu tự hiện. Trang này không nằm trong điều hướng; mở qua{' '}
        <code>#/admin</code>. Đang có {doneSpots}/{totalSpots} điểm · {p.xp} XP.
      </p>

      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">Mở khóa nhanh</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="mdv-btn mdv-btn--primary" onClick={unlockAll}>
            <Icon name="check" size={16} /> Mở hết {totalSpots} điểm
          </button>
          {SITES.map((s) => (
            <button key={s.entityId} class="mdv-chip" onClick={() => unlockSite(s)}>
              Mở hết {t(s.name)} ({siteUnlockedCount(s, p)}/{s.spots.length})
            </button>
          ))}
        </div>
      </section>

      {SITES.map((s) => (
        <section key={s.entityId} class="mdv-card">
          <h2 style="font-size:var(--text-md);margin:0 0 10px">
            {t(s.name)} <span class="mdv-muted" style="font-weight:400">({siteUnlockedCount(s, p)}/{s.spots.length})</span>
          </h2>
          <div class="adm__rows">
            {s.spots.map((sp) => {
              const on = isSpotUnlocked(s.entityId, sp.spotId);
              const best = quizBest(s.entityId, sp.spotId);
              return (
                <div key={sp.spotId} class="adm__row">
                  <span class={`adm__name ${on ? 'adm__name--on' : ''}`}>{t(sp.name)}</span>
                  <button class="mdv-chip" aria-pressed={on} onClick={() => (on ? relockSpot(s.entityId, sp.spotId) : unlockSpot(s.entityId, sp.spotId))}>
                    {on ? 'Đã nhận dấu — gỡ lại' : `Mở (+${sp.xp} XP)`}
                  </button>
                  {sp.quiz?.length ? (
                    <button
                      class="mdv-chip"
                      aria-pressed={best === sp.quiz.length}
                      onClick={() => recordQuizResult(s.entityId, sp.spotId, sp.quiz!.length, sp.quiz!.length)}
                    >
                      Quiz {best ?? '–'}/{sp.quiz.length} → đặt đủ
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">XP &amp; cờ ăn mừng</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          {[30, 100, 500].map((x) => (
            <button key={x} class="mdv-chip" onClick={() => grantXp(x)}>
              +{x} XP
            </button>
          ))}
          <button class="mdv-chip" onClick={clearFinaleFlags}>
            Cho xem lại finale (reset cờ)
          </button>
        </div>
      </section>

      <section class="mdv-card">
        <h2 style="font-size:var(--text-md);margin:0 0 10px">Tiện ích</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="mdv-btn mdv-btn--primary" onClick={() => enableDemoDock()}>
            <Icon name="spark" size={16} /> Hiện nút điều khiển nổi (góc phải màn)
          </button>
          <a class="mdv-chip" href="qr-sheet.html" target="_blank" rel="noreferrer">
            Trang in tem QR
          </a>
          <a class="mdv-chip" href={routeHref.map}>
            Về bản đồ
          </a>
          <button
            class="mdv-btn mdv-btn--ghost"
            onClick={() =>
              setAsk({
                title: 'Xóa toàn bộ tiến độ hành trình?',
                ok: 'Xóa hết',
                danger: true,
                act: resetProgress,
              })
            }
          >
            Reset hành trình
          </button>
        </div>
      </section>
      <ConfirmSheet ask={ask} lang={lang} onClose={() => setAsk(null)} />
    </main>
  );
}
