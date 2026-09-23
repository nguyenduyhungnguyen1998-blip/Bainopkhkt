/**
 * Trang điểm đến – P2 renderer bento đầy đủ (hero/aspects vuốt/video poster/audio TTS/fact/ảnh)
 * + luồng quét QR có chữ ký (P3): `?s=<sig>` hợp lệ -> xác nhận -> mở khóa; sai -> từ chối lịch sự.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { getSpot, getSite } from '../data/content';
import type { Card, Site, Spot, AudioCard, AspectsCard, VideoCard } from '../data/types';
import { UI, t, useLang, type Lang } from '../lib/i18n';
import { navigate, routeHref } from '../lib/router';
import { asset } from '../lib/asset';
import { isSpotUnlocked, unlockSpot, useProgress } from '../lib/progress';
import { verifySignature } from '../lib/qr';
import { SpeechPlayer, speechSupported, type SpeechStatus } from '../lib/speech';
import { startAmbient, stopAmbient } from '../lib/ambient';
import { useOnline } from '../lib/theme';
import { Icon } from '../components/Icon';
import './destination.css';

export function DestinationScreen({ siteId, spotId, query }: { siteId: string; spotId?: string; query?: URLSearchParams }) {
  const [lang] = useLang();
  useProgress(); // re-render khi mở khóa
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
  const mode = getExploreMode();
  const idx = site.spots.indexOf(spot);
  const prev = site.spots[idx - 1];
  const next = site.spots[idx + 1];
  const unlocked = isSpotUnlocked(site.entityId, spot.spotId);
  const sig = query?.get('s');
  const curRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [spot.spotId]);

  return (
    <main class="mdv-screen dest">
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
      </header>

      {sig && <ScanConfirm site={site} spot={spot} sig={sig} unlocked={unlocked} lang={lang} />}

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

      <div class="dest__grid">
        {spot.layoutSchema.map((card, i) => (
          <CardView key={i} card={card} lang={lang} mode={mode} />
        ))}
      </div>

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
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let live = true;
    void verifySignature(site.entityId, spot.spotId, sig).then((ok) => {
      if (live) setState(ok ? 'ok' : 'bad');
    });
    return () => {
      live = false;
    };
  }, [site.entityId, spot.spotId, sig]);

  if (dismissed || state === 'checking') return null;

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
      <div class="dscan dscan--done" role="status">
        <Icon name="check" size={18} />
        <span>
          +{reward} XP{badgeName ? ` · ${badgeName}` : ''}
        </span>
      </div>
    );
  }

  if (unlocked) {
    return (
      <div class="dscan dscan--done" role="status">
        <Icon name="check" size={18} />
        <span>{t(UI.unlockedDone, lang)}</span>
      </div>
    );
  }

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

type ExploreMode = 'audio' | 'text';
const MODE_KEY = 'mdv.exploreMode';

function getExploreMode(): ExploreMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'text' ? 'text' : 'audio';
  } catch {
    return 'audio';
  }
}

/**
 * Màn giới thiệu khu di sản sau khi quét QR (mockup dự tính):
 * hero 40%, chọn ngôn ngữ, chọn hình thức khám phá, CTA đỏ bắt đầu.
 */
function SiteIntro({ site }: { site: Site }) {
  const [lang, setLang] = useLang();
  const [mode, setMode] = useState<ExploreMode>(getExploreMode);
  const pick = (m: ExploreMode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* bộ nhớ riêng tư */
    }
  };
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

        <h2 class="dintro__h">{t(UI.exploreMode, lang)}</h2>
        <div class="dintro__modes" role="radiogroup" aria-label={t(UI.exploreMode, lang)}>
          <button
            class={`dintro__mode ${mode === 'audio' ? 'dintro__mode--on' : ''}`}
            role="radio"
            aria-checked={mode === 'audio'}
            onClick={() => pick('audio')}
          >
            <Icon name="headphones" size={26} />
            <b>{t(UI.modeAudio, lang)}</b>
            <small>{t(UI.modeAudioDesc, lang)}</small>
          </button>
          <button
            class={`dintro__mode ${mode === 'text' ? 'dintro__mode--on' : ''}`}
            role="radio"
            aria-checked={mode === 'text'}
            onClick={() => pick('text')}
          >
            <Icon name="book" size={26} />
            <b>{t(UI.modeText, lang)}</b>
            <small>{t(UI.modeTextDesc, lang)}</small>
          </button>
        </div>

        <button class="mdv-btn mdv-btn--primary dintro__cta" onClick={() => first && navigate(`d/${site.entityId}/${first.spotId}`)}>
          {t(UI.startExploring, lang)}
        </button>
      </div>
    </main>
  );
}

function CardView({ card, lang, mode }: { card: Card; lang: Lang; mode: ExploreMode }) {
  switch (card.type) {
    case 'hero':
      return (
        <figure class={`dcard dcard--hero dcard--${card.size}`}>
          <img src={asset(card.image)} alt={t(card.caption, lang)} />
          {card.caption && <figcaption>{t(card.caption, lang)}</figcaption>}
        </figure>
      );
    case 'aspects':
      return <AspectsCardView card={card} lang={lang} />;
    case 'video':
      // "Văn bản + Hình ảnh": không render thẻ video – lựa chọn hình thức phải thật.
      return mode === 'text' ? null : <VideoCardView card={card} lang={lang} />;
    case 'audio':
      // "Văn bản + Hình ảnh": audio biến thành bản đọc thuần chữ, không nút TTS/ambient.
      return mode === 'text' ? <AudioTextView card={card} lang={lang} /> : <AudioCardView card={card} lang={lang} />;
    case 'fact':
      return (
        <div class={`dcard dcard--fact dcard--${card.size}`}>
          <Icon name={card.icon ?? 'spark'} size={20} />
          <p>{t(card.text, lang)}</p>
        </div>
      );
    case 'image':
      return (
        <figure class={`dcard dcard--hero dcard--${card.size}`}>
          <img src={asset(card.image)} alt={t(card.caption, lang)} loading="lazy" />
          {card.caption && <figcaption>{t(card.caption, lang)}</figcaption>}
        </figure>
      );
  }
}

/** Thẻ video: embed khi có link; poster + gợi ý khi chưa. Offline → báo rõ video cần mạng, gợi nghe audio. */
function VideoCardView({ card, lang }: { card: VideoCard; lang: Lang }) {
  const online = useOnline();
  return (
    <div class={`dcard dcard--video dcard--${card.size}`}>
      {card.src && online ? (
        <iframe src={card.src} title={t(card.title, lang)} loading="lazy" allowFullScreen allow="fullscreen; picture-in-picture" />
      ) : (
        <div
          class={`dcard__video-ph${online ? '' : ' dcard__video-ph--off'}`}
          style={card.poster ? { backgroundImage: `url(${card.poster})` } : undefined}
        >
          <span class="dcard__play">
            <Icon name="play" size={28} />
          </span>
          <b>{t(card.title, lang)}</b>
          <small>{online ? t(UI.videoSoon, lang) : t(UI.videoOffline, lang)}</small>
          <small class="dcard__videotip">{t(UI.listeningTip, lang)}</small>
        </div>
      )}
    </div>
  );
}

/** Bản đọc thuần chữ của thẻ audio – dùng trong chế độ "Văn bản + Hình ảnh". */
function AudioTextView({ card, lang }: { card: AudioCard; lang: Lang }) {
  return (
    <div class={`dcard dcard--audio dcard--${card.size}`}>
      <ol class="dcard__script dcard__script--show">
        {card.script[lang].map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
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
      </div>
      <div class="dcard__progbar" role="progressbar" aria-label={t(UI.audioProgress, lang)} aria-valuenow={Math.round(prog)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${prog}%` }} />
      </div>
      {(status === 'failed' || !speechSupported()) && <p class="dcard__notice">{t(UI.listenFallback, lang)}</p>}
      <ol class="dcard__script" data-reading={status === 'playing' || status === 'paused'}>
        {sentences.map((s, i) => (
          <li key={i} class={i === sent ? 'is-saying' : ''}>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

const SWIPE_PX = 40;

function AspectsCardView({ card, lang }: { card: AspectsCard; lang: Lang }) {
  const [active, setActive] = useState(card.aspects[0].id);
  const cur = card.aspects.find((a) => a.id === active) ?? card.aspects[0];
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
      <div class="dcard__dots" aria-hidden="true">
        {card.aspects.map((a) => (
          <i key={a.id} class={a.id === cur.id ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}
