/**
 * Trang điểm đến – P2 renderer bento đầy đủ (hero/aspects vuốt/video poster/audio TTS/fact/ảnh)
 * + luồng quét QR có chữ ký (P3): `?s=<sig>` hợp lệ -> xác nhận -> mở khóa; sai -> từ chối lịch sự.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { getSpot, getSite } from '../data/content';
import type { Card, HeroCard, ImageCard, Site, Spot, AudioCard, AspectsCard, VideoCard } from '../data/types';
import { UI, t, useLang, type Lang } from '../lib/i18n';
import { navigate, routeHref } from '../lib/router';
import { asset } from '../lib/asset';
import { getProgress, isSpotUnlocked, unlockSpot, useProgress } from '../lib/progress';
import { verifySignature } from '../lib/qr';
import { SpeechPlayer, speechSupported, type SpeechStatus } from '../lib/speech';
import { startAmbient, stopAmbient } from '../lib/ambient';
import { useOnline } from '../lib/theme';
import { IMAGE_CREDITS } from '../data/credits';
import { Icon } from '../components/Icon';
import { HelpMenu } from '../components/Onboarding';
import { DEST_TOUR_STEPS, goScreenTour } from '../lib/tour';
import './destination.css';

export function DestinationScreen({ siteId, spotId, query }: { siteId: string; spotId?: string; query?: URLSearchParams }) {
  const [lang] = useLang();
  useProgress(); // re-render khi mở khóa
  const [bgSrc, setBgSrc] = useState<string | null>(null); // ảnh đang xem -> nền mờ đồng bộ
  const [helpMenu, setHelpMenu] = useState(false);
  const siteOnly = spotId === undefined ? getSite(siteId) : undefined;
  const found = siteOnly ? undefined : getSpot(siteId, spotId);
  if (siteOnly) return <SiteIntro site={siteOnly} />;
  if (!found) {
    return (
      <main class="mdv-screen">
        <p>Không tìm thấy điểm đến.</p>
        <a class="mdv-btn mdv-btn--ghost" href={routeHref.map}>
          {t(UI.back, lang)}
        </a>
      </main>
    );
  }
  const { site, spot } = found;
  const idx = site.spots.indexOf(spot);
  const prev = site.spots[idx - 1];
  const next = site.spots[idx + 1];
  const unlocked = isSpotUnlocked(site.entityId, spot.spotId);
  const sig = query?.get('s');
  const curRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [spot.spotId]);
  // Đến từ panel QR với ?a=<aspect>: đưa chính thẻ khía cạnh đó vào khung nhìn
  // thay vì bắt khách tự cuộn tìm (P0: "bấm Kiến trúc mà không thấy Kiến trúc").
  const wantAspect = query?.get('a');
  useEffect(() => {
    if (!wantAspect) return;
    const id = setTimeout(() => {
      document.querySelector('.dcard--aspects')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 90);
    return () => clearTimeout(id);
  }, [wantAspect, spot.spotId]);

  return (
    <main class="mdv-screen dest">
      <SpotBg src={bgSrc} />
      <header class="dest__top">
        <a class="mdv-btn mdv-btn--icon" href={routeHref.map} aria-label={t(UI.back, lang)}>
          <Icon name="back" />
        </a>
        <a class="dest__crumb dest__crumb--link" href={routeHref.destination(site.entityId)} title={t(UI.backToSite, lang)}>
          <span class="mdv-eyebrow">{t(site.name, lang)}</span>
          <h1>{t(spot.name, lang)}</h1>
        </a>
        <span class={`mdv-badge ${unlocked ? 'mdv-badge--unlocked' : 'mdv-badge--locked'}`}>
          {unlocked ? `+${spot.xp} XP` : t(UI.locked, lang)}
        </span>
        <button class="mdv-chip" onClick={() => setHelpMenu(true)} aria-label={t(UI.howto, lang)}>
          <Icon name="help" size={16} />
        </button>
      </header>
      {helpMenu && (
        <HelpMenu
          lang={lang}
          onClose={() => setHelpMenu(false)}
          onTour={() => {
            setHelpMenu(false);
            goScreenTour(DEST_TOUR_STEPS);
          }}
          tourTitle={UI.helpMenuTourDest}
          tourSub={UI.helpMenuTourDestSub}
        />
      )}

      {/* key spot+sig: remount mỗi QR mới — nếu không, reward/state của điểm trước
          sống sót khi đổi điểm cùng khu (component cha key theo siteId) và che nút xác nhận mới. */}
      {sig && <ScanConfirm key={`${spot.spotId}:${sig}`} site={site} spot={spot} sig={sig} unlocked={unlocked} lang={lang} />}
      {/* Không có sig -> vào bằng điều hướng thường: không hiện panel chọn mục (chỉ áp dụng cho QR/link direct). */}

      {/* Dải điểm QR trong khu – điều hướng nhanh giữa các điểm */}
      <nav class="dest__spots" aria-label="Các điểm trong khu">
        {site.spots.map((s, i) => (
          <a
            key={s.spotId}
            ref={s.spotId === spot.spotId ? curRef : undefined}
            href={routeHref.destination(site.entityId, s.spotId)}
            class={`dest__spot ${s.spotId === spot.spotId ? 'is-current' : ''} ${isSpotUnlocked(site.entityId, s.spotId) ? 'is-unlocked' : ''}`}
            aria-current={s.spotId === spot.spotId ? 'page' : undefined}
          >
            <b>{i + 1}</b>
            <span>{t(s.name, lang)}</span>
          </a>
        ))}
      </nav>

      {/* Một câu mời quan sát – khiến khách nhìn lại vật thật trước khi đọc lịch sử */}
      {spot.hook && (
        <p class="dest__hook">
          <Icon name="spark" size={15} aria-hidden="true" />
          {t(spot.hook, lang)}
        </p>
      )}

      <div class="dest__grid">
        {spot.layoutSchema.map((card, i) => (
          // key theo spotId: đổi điểm cùng khu phải remount card — không thì gallery
          // giữ idx cũ -> vượt độ dài ảnh của điểm mới = khung trống, nền cũng cũ.
          <CardView key={`${spot.spotId}:${i}`} card={card} lang={lang} initialAspect={query?.get('a')} onActiveImage={setBgSrc} />
        ))}
      </div>

      {/* Thông tin tham quan thực tế (địa chỉ/giờ/vé) – trả lời nhanh câu hỏi của khách */}
      {site.visit && (site.visit.address || site.visit.hours || site.visit.tickets) && (
        <section class="dvisit" aria-label={t(UI.visitInfo, lang)}>
          <h2 class="dvisit__h">{t(UI.visitInfo, lang)}</h2>
          {site.visit.address && (
            <div class="dvisit__row"><Icon name="locate" size={16} /><span>{t(site.visit.address, lang)}</span></div>
          )}
          {site.visit.hours && (
            <div class="dvisit__row"><Icon name="clock" size={16} /><span>{t(site.visit.hours, lang)}</span></div>
          )}
          {site.visit.tickets && (
            <div class="dvisit__row"><Icon name="qr" size={16} /><span>{t(site.visit.tickets, lang)}</span></div>
          )}
          <p class="dvisit__note">{t(UI.visitNote, lang)}</p>
        </section>
      )}

      {/* Chuỗi hành động cuối nội dung: thử tài đúng điểm → xem dấu → tiếp trong khu (nav dưới) */}
      <footer class="dchain">
        {spot.quiz?.length ? (
          <a class="mdv-btn mdv-btn--primary dchain__quiz" href={routeHref.quizAt(site.entityId, spot.spotId)}>
            <Icon name="quiz" size={18} /> {t(UI.quizAtSpot, lang)} · {spot.quiz.length} {lang === 'vi' ? 'câu' : 'qs'}
          </a>
        ) : null}
        {unlocked ? (
          <a class="dchain__pass" href={routeHref.passport}>
            <Icon name="passport" size={15} /> {t(UI.viewStamp, lang)}
          </a>
        ) : (
          <span class="dchain__hint">
            <Icon name="qr" size={14} /> {t(UI.stampHint, lang)} (+{spot.xp} XP)
          </span>
        )}
      </footer>

      <div class="dest__nav">
        {prev ? (
          <a class="mdv-btn mdv-btn--ghost" href={routeHref.destination(site.entityId, prev.spotId)}>
            <Icon name="back" size={18} /> {t(prev.name, lang)}
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a class="mdv-btn mdv-btn--primary" href={routeHref.destination(site.entityId, next.spotId)}>
            {t(next.name, lang)} <Icon name="back" size={18} class="flip" />
          </a>
        )}
      </div>
    </main>
  );
}

type SigState = 'checking' | 'ok' | 'bad';

/** Bước "xác nhận" của luồng quét QR (P3): chữ ký hợp lệ -> bấm để mở khóa; sai -> cảnh báo êm. */
function ScanConfirm({ site, spot, sig, unlocked, lang }: { site: Site; spot: Spot; sig: string; unlocked: boolean; lang: Lang }) {
  const [state, setState] = useState<SigState>('checking');
  const [reward, setReward] = useState<number | null>(null);
  const [badgeName, setBadgeName] = useState<string | null>(null);
  const [totalXp, setTotalXp] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, setLang] = useLang();
  // Khách quét QR lần đầu chưa từng chọn ngôn ngữ -> hỏi 1 lần, nhớ luôn (mdv.lang).
  // Tránh rơi thẳng vào nội dung tiếng Việt/audio mặc định cho du khách nước ngoài.
  const [needLang, setNeedLang] = useState(() => {
    try {
      return !localStorage.getItem('mdv.lang');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let live = true;
    void verifySignature(site.entityId, spot.spotId, sig, spot.qrId).then((ok) => {
      if (live) setState(ok ? 'ok' : 'bad');
    });
    return () => {
      live = false;
    };
  }, [site.entityId, spot.spotId, sig]);

  // Esc đóng panel QR như nút ✕ (khách dùng bàn phím/máy chiếu).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Bỏ chữ ký khỏi URL mà giữ lựa chọn aspect ?a= – reload không hồi sinh panel/toast.
  const dropSig = () => {
    const a = new URLSearchParams(location.hash.split('?')[1] ?? '').get('a');
    navigate(`d/${site.entityId}/${spot.spotId}${a ? `?a=${a}` : ''}`, true);
  };

  const doUnlock = () => {
    if (unlocked) return;
    const r = unlockSpot(site.entityId, spot.spotId);
    setReward(r.gainedXp);
    setBadgeName(r.newBadge ? t(r.newBadge.name, lang) : null);
    setTotalXp(getProgress().xp);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  // Sau khi nhận dấu: toast nổi bật vài giây (tên điểm + XP + tổng + đường tới hộ chiếu),
  // rồi tự thu gọn — khoảnh khắc thưởng không thể bị bỏ lỡ.
  useEffect(() => {
    if (reward === null) return;
    const id = setTimeout(() => {
      setDismissed(true);
      dropSig();
    }, 6000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  if (needLang) {
    const pick = (l: Lang) => {
      setLang(l);
      setNeedLang(false);
    };
    return (
      <div class="dscan" role="dialog" aria-label={t(UI.chooseLang, lang)}>
        <span class="dscan__txt">{t(UI.chooseLang, lang)}</span>
        <button class="mdv-chip" onClick={() => pick('vi')}>Tiếng Việt</button>
        <button class="mdv-chip" onClick={() => pick('en')}>English</button>
      </div>
    );
  }

  if (state === 'checking') return null;
  // Đóng modal bằng ✕/backdrop: nếu chưa nhận dấu thì vẫn giữ thanh xác nhận
  // gọn trên đầu trang — không bỏ mất cửa mở khóa cho khách bấm nhầm.
  if (dismissed) {
    if (unlocked) return null;
    return (
      <div class="dscan" role="group" aria-label={t(UI.scanValid, lang)}>
        <Icon name="check" size={18} />
        <span class="dscan__txt">{t(UI.scanValid, lang)}</span>
        <button
          class="mdv-btn mdv-btn--primary dscan__cta"
          onClick={() => {
            const r = unlockSpot(site.entityId, spot.spotId);
            setReward(r.gainedXp);
            setBadgeName(r.newBadge ? t(r.newBadge.name, lang) : null);
            if (navigator.vibrate) navigator.vibrate(30);
          }}
        >
          {t(UI.confirmUnlock, lang)} (+{spot.xp} XP)
        </button>
      </div>
    );
  }

  if (state === 'bad') {
    return (
      <div class="dscan dscan--bad" role="alert">
        <Icon name="warn" size={18} />
        <span>{t(UI.scanInvalid, lang)}</span>
        <button
          class="dscan__x"
          onClick={() => {
            setDismissed(true);
            // Bỏ chữ ký xấu khỏi URL để reload không hồi sinh cảnh báo.
            navigate(`d/${site.entityId}/${spot.spotId}`, true);
          }}
          aria-label={t(UI.dismiss, lang)}
        >
          ✕
        </button>
      </div>
    );
  }

  if (reward !== null) {
    return (
      <div class="dtoast" role="status">
        <Icon name="check" size={22} />
        <div class="dtoast__txt">
          <b>
            {t(UI.gotStamp, lang)}: {t(spot.name, lang)}
          </b>
          <span>
            +{reward} XP · {t(UI.totalXp, lang)} {totalXp} XP{badgeName ? ` · ${badgeName}` : ''}
          </span>
        </div>
        <a class="dtoast__link" href={routeHref.passport}>
          {t(UI.viewStamp, lang)}
        </a>
        <button
          class="dscan__x"
          onClick={() => {
            setDismissed(true);
            dropSig();
          }}
          aria-label={t(UI.dismiss, lang)}
        >
          ✕
        </button>
      </div>
    );
  }

  // Điểm đã có dấu nhưng khách vừa quét lại QR -> vẫn cho chọn mục khám phá.
  const goAspect = (aspectId: string) => {
    doUnlock();
    // Giữ `s` trong URL để toast nhận dấu hiện sau khi cuộn tới aspect đã chọn;
    // replace: back không quay lại panel chọn — khách đã vào điểm.
    navigate(`d/${site.entityId}/${spot.spotId}?s=${sig}&a=${encodeURIComponent(aspectId)}`, true);
  };

  // Mọi khía cạnh của điểm (một điểm có thể nhiều thẻ aspects) — data-driven,
  // di tích nào nhiều tính chất tự liệt kê hết, không hard-code.
  const aspects = spot.layoutSchema
    .filter((c): c is AspectsCard => c.type === 'aspects')
    .flatMap((c) => c.aspects)
    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

  // Modal chặn đầu sau khi quét QR: nền mờ phủ toàn màn, chỉ panel nổi bật;
  // khách buộc tương tác trước khi vào nội dung. ✕ = bỏ qua (về trang điểm).
  return (
    <div class="dpick" role="presentation">
      <div class="dpick__backdrop" onClick={() => setDismissed(true)} aria-hidden="true" />
      <div class="dpick__panel" role="dialog" aria-modal="true" aria-label={t(UI.scanValid, lang)}>
        <button class="dscan__x dpick__x" onClick={() => setDismissed(true)} aria-label={t(UI.dismiss, lang)}>
          ✕
        </button>
        <div class="dscan__langs">
          <span class="dscan__langlbl">{t(UI.chooseLangShort, lang)}</span>
          <button class="mdv-chip" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
            Tiếng Việt
          </button>
          <button class="mdv-chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
        </div>
        <header class="dscan__head">
          <span class="mdv-eyebrow">{t(site.name, lang)}</span>
          <b class="dscan__spot">{t(spot.name, lang)}</b>
          {site.visit?.address && (
            <span class="dscan__addr">
              <Icon name="locate" size={13} /> {t(site.visit.address, lang)}
            </span>
          )}
        </header>
        {aspects.length > 0 && (
          <>
            <p class="dscan__ask">{t(UI.exploreWhat, lang)}</p>
            <div class="dscan__aspects">
              {aspects.map((a) => (
                <button key={a.id} class="dscan__aspect" onClick={() => goAspect(a.id)}>
                  {t(a.title, lang)}
                </button>
              ))}
            </div>
          </>
        )}
        {!unlocked && (
          <p class="dscan__okhint">
            <Icon name="check" size={14} /> {t(UI.scanOkHint, lang)}
          </p>
        )}
        <button
          class="mdv-btn mdv-btn--primary dscan__cta"
          onClick={() => {
            if (unlocked) {
              setDismissed(true);
              dropSig();
            } else {
              doUnlock();
            }
          }}
        >
          {unlocked ? t(UI.exploreSpot, lang) : `${t(UI.confirmUnlock, lang)} (+${spot.xp} XP)`}
        </button>
      </div>
    </div>
  );
}

/**
 * Màn giới thiệu khu di sản sau khi quét QR (mockup dự tính):
 * hero 40%, chọn ngôn ngữ, CTA đỏ bắt đầu. (Một hình thức khám phá duy nhất:
 * nút Nghe + bản đọc gập gọn nằm ngay trong trang điểm.)
 */
function SiteIntro({ site }: { site: Site }) {
  const [lang, setLang] = useLang();
  const first = site.spots[0];
  return (
    <main class="mdv-screen dest dintro">
      <header class="dintro__top">
        <a class="mdv-btn mdv-btn--icon" href={routeHref.map} aria-label={t(UI.back, lang)}>
          <Icon name="back" />
        </a>
      </header>
      <figure class="dintro__hero">
        <img src={asset(site.heroImage)} alt={t(site.name, lang)} />
      </figure>
      <div class="dintro__body">
        <span class="mdv-eyebrow">{t(site.province, lang)}</span>
        <h1>{t(site.name, lang)}</h1>
        <p class="mdv-muted">{t(site.summary, lang)}</p>

        <h2 class="dintro__h">{t(UI.chooseLang, lang)}</h2>
        <div class="dintro__langs">
          <button class="mdv-chip" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
            Tiếng Việt
          </button>
          <button class="mdv-chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
        </div>

        <button class="mdv-btn mdv-btn--primary dintro__cta" onClick={() => first && navigate(`d/${site.entityId}/${first.spotId}`)}>
          {t(UI.startExploring, lang)}
        </button>
      </div>
    </main>
  );
}

function CardView({ card, lang, initialAspect, onActiveImage }: { card: Card; lang: Lang; initialAspect?: string | null; onActiveImage?: (src: string) => void }) {
  switch (card.type) {
    case 'hero':
    case 'image':
      return <GalleryFigure card={card} lang={lang} isHero={card.type === 'hero'} onActive={onActiveImage} />;
    case 'aspects':
      return <AspectsCardView card={card} lang={lang} initial={initialAspect} />;
    case 'video':
      return <VideoCardView card={card} lang={lang} />;
    case 'audio':
      return <AudioCardView card={card} lang={lang} />;
    case 'fact':
      return (
        <div class={`dcard dcard--fact dcard--${card.size}`}>
          <Icon name={card.icon ?? 'spark'} size={20} />
          <p>{t(card.text, lang)}</p>
        </div>
      );
  }
}

/** Gallery ảnh của một điểm: xếp chồng + crossfade, nút ‹ › và vuốt ngang. */
function GalleryFigure({ card, lang, isHero, onActive }: { card: HeroCard | ImageCard; lang: Lang; isHero: boolean; onActive?: (src: string) => void }) {
  const imgs = [card.image, ...(card.images ?? [])];
  const [idx, setIdx] = useState(0);
  const [credOn, setCredOn] = useState(false);
  const credit = IMAGE_CREDITS[imgs[idx]];
  const touched = useRef(false); // chỉ thẻ phụ (không phải hero) sync nền SAU khi khách tự vuốt
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setIdx((i) => (i + d + imgs.length) % imgs.length);
  const userGo = (d: number) => {
    touched.current = true;
    go(d);
  };
  useEffect(() => {
    if (onActive && (isHero || touched.current)) onActive(imgs[idx]);
  }, [idx]);
  const multi = imgs.length > 1;
  return (
    <figure class={`dcard dcard--hero dcard--${card.size} ${multi ? 'dcard--gal' : ''}`}>
      <div
        class="dgal"
        onTouchStart={multi ? (e) => (touchX.current = e.touches[0].clientX) : undefined}
        onTouchEnd={
          multi
            ? (e) => {
                const x0 = touchX.current;
                touchX.current = null;
                if (x0 === null) return;
                const dx = e.changedTouches[0].clientX - x0;
                if (Math.abs(dx) > 42) userGo(dx < 0 ? 1 : -1);
              }
            : undefined
        }
      >
        {imgs.map((s, i) => (
          <img key={s} src={asset(s)} alt={i === idx ? t(card.caption, lang) : ''} class={i === idx ? 'is-on' : ''} />
        ))}
        {multi && (
          <>
            <button class="dgal__nav dgal__nav--prev" onClick={() => userGo(-1)} aria-label={lang === 'vi' ? 'Ảnh trước' : 'Previous photo'}>
              <Icon name="back" size={18} />
            </button>
            <button class="dgal__nav dgal__nav--next" onClick={() => userGo(1)} aria-label={lang === 'vi' ? 'Ảnh kế' : 'Next photo'}>
              <Icon name="forward" size={18} />
            </button>
            <div class="dgal__dots" aria-hidden="true">
              {imgs.map((_, i) => (
                <i key={i} class={i === idx ? 'on' : ''} />
              ))}
            </div>
          </>
        )}
        {credit && (
          <button
            class="dgal__cred"
            aria-label={t(UI.photoCreditAria, lang)}
            aria-pressed={credOn}
            onClick={() => setCredOn((v) => !v)}
          >
            <Icon name="info" size={15} />
          </button>
        )}
      </div>
      {card.caption && <figcaption>{t(card.caption, lang)}</figcaption>}
      {credOn && credit && (
        <p class="dgal__credline">
          {credit.author} ·{' '}
          {credit.licenseUrl ? (
            <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
              {credit.license}
            </a>
          ) : (
            credit.license
          )}
          {' · '}
          {credit.sourceUrl ? (
            <a href={credit.sourceUrl} target="_blank" rel="noreferrer">
              {t(UI.viewSource, lang)}
            </a>
          ) : (
            credit.source
          )}
        </p>
      )}
    </figure>
  );
}

/** Nền đồng bộ mờ: phủ kín viewport phía sau nội dung, crossfade khi đổi ảnh. */
function SpotBg({ src }: { src: string | null }) {
  const [layers, setLayers] = useState<string[]>([]);
  useEffect(() => {
    if (src) setLayers((l) => (l[l.length - 1] === src ? l : [...l.slice(-1), src]));
  }, [src]);
  if (!layers.length) return null;
  return (
    <div class="spotbg" aria-hidden="true">
      {layers.map((s, i) => (
        <img key={s} src={asset(s)} alt="" class={i === layers.length - 1 ? 'is-in' : ''} />
      ))}
    </div>
  );
}

/** Video local (media/*.mp4): cứ render — SW runtime-cache trả bản đã tải khi offline;
 *  chỉ hiện ghi chú ngoại tuyến khi phát thật sự lỗi. */
function LocalVideo({ src, poster, label, lang }: { src: string; poster?: string; label: string; lang: Lang }) {
  const online = useOnline();
  const [err, setErr] = useState(false);
  if (err && !online) {
    return (
      <p class="dcard__vsoon">
        <Icon name="play" size={14} /> {t(UI.videoOffline, lang)}
      </p>
    );
  }
  return (
    <video
      src={asset(src)}
      poster={poster ? asset(poster) : undefined}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      onError={() => setErr(true)}
    />
  );
}

/** Thẻ video: embed khi có link; chưa có link (hoặc video mạng ngoài lúc mất mạng) → gạch chú nhỏ. */
function VideoCardView({ card, lang }: { card: VideoCard; lang: Lang }) {
  const online = useOnline();
  // Chưa có video: bỏ hẳn khỏi luồng — không hứa "đang ghi hình" với giám khảo.
  if (!card.src) return null;
  const local = !card.src.startsWith('http');
  if (!local && !online) {
    return (
      <p class="dcard__vsoon">
        <Icon name="play" size={14} /> {t(UI.videoOffline, lang)}
      </p>
    );
  }
  return (
    <div class={`dcard dcard--video dcard--${card.size}`}>
      {local ? (
        <LocalVideo src={card.src} poster={card.poster} label={t(card.title, lang)} lang={lang} />
      ) : (
        <iframe src={card.src} title={t(card.title, lang)} loading="lazy" allowFullScreen allow="fullscreen; picture-in-picture" />
      )}
    </div>
  );
}


/** Thẻ âm thanh: TTS theo câu với tô sáng + tốc độ + ambient preset. Fallback văn bản khi lỗi. */
function AudioCardView({ card, lang }: { card: AudioCard; lang: Lang }) {
  const playerRef = useRef<SpeechPlayer | null>(null);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [sent, setSent] = useState(-1);
  const [rate, setRate] = useState(1);
  const [ambientOn, setAmbientOn] = useState(false);
  const sentences = card.script[lang];

  useEffect(
    () => () => {
      playerRef.current?.stop();
      // Rời điểm là tắt cả âm nền – không để tiếng chạy lửng lơ không nút tắt ở màn khác.
      if (ambientOn) stopAmbient();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ambientOn]
  );

  const toggle = () => {
    if (!speechSupported()) {
      setStatus('failed');
      return;
    }
    if (!playerRef.current) playerRef.current = new SpeechPlayer();
    const p = playerRef.current;
    if (status === 'playing') return p.pause();
    if (status === 'paused') return p.resume();
    p.play(sentences, lang, {
      onSentence: (i) => setSent(i),
      onStatus: (s) => {
        setStatus(s);
        if (s === 'done' || s === 'failed' || s === 'idle') setSent(-1);
      },
    });
  };

  const toggleAmbient = () => {
    if (ambientOn) {
      stopAmbient();
      setAmbientOn(false);
    } else if (card.ambient) {
      setAmbientOn(startAmbient(card.ambient));
    }
  };

  const prog = status === 'playing' || status === 'paused' ? ((sent + 1) / sentences.length) * 100 : status === 'done' ? 100 : 0;
  // Ước lượng thời lượng từ số từ bản đọc (TTS ~170 từ/phút) — nhãn "≈N phút" gần nút Nghe.
  const totalWords = sentences.join(' ').split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(totalWords / 170));
  const durLabel = lang === 'vi' ? `≈ ${mins} phút` : `≈ ${mins} min`;

  return (
    <div class={`dcard dcard--audio dcard--${card.size}`}>
      <div class="dcard__audio-ctrl">
        <button class="mdv-btn mdv-btn--primary dcard__playbtn" onClick={toggle} aria-pressed={status === 'playing'}>
          <Icon name={status === 'playing' ? 'pause' : 'volume'} size={20} />
          {status === 'playing' ? t(UI.pause, lang) : status === 'paused' ? t(UI.resume, lang) : t(UI.play, lang)}
        </button>
        <button
          class="mdv-chip"
          onClick={() => {
            const r = rate >= 1.4 ? 0.8 : rate + 0.2;
            setRate(r);
            playerRef.current?.setRate(r);
          }}
          aria-label={`${t(UI.playbackSpeed, lang)}: ${rate.toFixed(1)}×`}
        >
          {rate.toFixed(1)}×
        </button>
        {card.ambient && (
          <button class={`mdv-chip ${ambientOn ? 'is-on' : ''}`} aria-pressed={ambientOn} onClick={toggleAmbient}>
            <Icon name="leaf" size={14} /> {ambientOn ? t(UI.ambientOff, lang) : t(UI.ambient, lang)}
          </button>
        )}
        <span class="dcard__dur">
          <Icon name="clock" size={12} /> {durLabel}
        </span>
      </div>
      <div class="dcard__progbar" role="progressbar" aria-label={t(UI.audioProgress, lang)} aria-valuenow={Math.round(prog)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${prog}%` }} />
      </div>
      {(status === 'failed' || !speechSupported()) && <p class="dcard__notice">{t(UI.listenFallback, lang)}</p>}
      <details class="dcard__scriptwrap" open={status === 'playing' || status === 'paused' || status === 'failed' || !speechSupported()}>
        <summary>{t(UI.readScript, lang)}</summary>
        <ol class="dcard__script" data-reading={status === 'playing' || status === 'paused'}>
          {sentences.map((s, i) => (
            <li key={i} class={i === sent ? 'is-saying' : ''}>
              {s}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

const SWIPE_PX = 40;

function AspectsCardView({ card, lang, initial }: { card: AspectsCard; lang: Lang; initial?: string | null }) {
  // Tab mở đầu theo lựa chọn từ panel quét QR (?a=<aspectId>); fallback tab đầu.
  // Phải sync theo param — navigate ?a= đổi query không remount component,
  // useState khởi tạo chỉ chạy lần đầu nên tab sẽ kẹt ở mục đầu tiên.
  const valid = (v?: string | null) => (v && card.aspects.some((a) => a.id === v) ? v : card.aspects[0].id);
  const [active, setActive] = useState(() => valid(initial));
  useEffect(() => {
    setActive(valid(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  const cur = card.aspects.find((a) => a.id === active) ?? card.aspects[0];
  const online = useOnline();
  const idx = card.aspects.indexOf(cur);
  const startX = useRef<number | null>(null);
  // Vuốt ngang trên thân thẻ đổi tab (P2: "tab vuốt ngang")
  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    const next = dx < 0 ? Math.min(idx + 1, card.aspects.length - 1) : Math.max(idx - 1, 0);
    setActive(card.aspects[next].id);
  };
  return (
    <div class={`dcard dcard--aspects dcard--${card.size}`}>
      <div class="dcard__tabs" role="group" aria-label={t(UI.aspects, lang)}>
        {card.aspects.map((a) => (
          <button key={a.id} class="mdv-chip" aria-pressed={a.id === cur.id} onClick={() => setActive(a.id)}>
            {t(a.title, lang)}
          </button>
        ))}
      </div>
      <p key={cur.id} class="dcard__body" onPointerDown={onPointerDown} onPointerUp={onPointerUp} style="touch-action:pan-y">
        {t(cur.body, lang)}
      </p>
      {cur.video && (
        <div class="dcard__avideo">
          {cur.video.src.startsWith('http') ? (
            online ? (
              <iframe src={cur.video.src} title={cur.video.title ? t(cur.video.title, lang) : t(cur.title, lang)} loading="lazy" allowFullScreen allow="fullscreen; picture-in-picture" />
            ) : (
              <p class="dcard__vsoon">
                <Icon name="play" size={14} /> {t(UI.videoOffline, lang)}
              </p>
            )
          ) : (
            <LocalVideo
              src={cur.video.src}
              poster={cur.video.poster}
              label={cur.video.title ? t(cur.video.title, lang) : t(cur.title, lang)}
              lang={lang}
            />
          )}
        </div>
      )}
      <div class="dcard__dots" aria-hidden="true">
        {card.aspects.map((a) => (
          <i key={a.id} class={a.id === cur.id ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}
