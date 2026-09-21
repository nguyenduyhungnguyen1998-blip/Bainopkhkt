/**
 * Trang điểm đến – P0 dựng khung renderer JSON tối giản (P2 hoàn thiện đầy đủ card, TTS, âm thanh).
 */
import { useState } from 'preact/hooks';
import { getSpot, getSite } from '../data/content';
import type { Card, Site } from '../data/types';
import { UI, t, useLang, type Lang } from '../lib/i18n';
import { navigate, routeHref } from '../lib/router';
import { isSpotUnlocked, useProgress } from '../lib/progress';
import { Icon } from '../components/Icon';
import './destination.css';

export function DestinationScreen({ siteId, spotId }: { siteId: string; spotId?: string }) {
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
  const idx = site.spots.indexOf(spot);
  const prev = site.spots[idx - 1];
  const next = site.spots[idx + 1];
  const unlocked = isSpotUnlocked(site.entityId, spot.spotId);

  return (
    <main class="mdv-screen dest">
      <header class="dest__top">
        <a class="mdv-btn mdv-btn--icon" href={routeHref.map} aria-label={t(UI.back, lang)}>
          <Icon name="back" />
        </a>
        <div class="dest__crumb">
          <span class="mdv-eyebrow">{t(site.name, lang)}</span>
          <h1>{t(spot.name, lang)}</h1>
        </div>
        <span class={`mdv-badge ${unlocked ? 'mdv-badge--unlocked' : 'mdv-badge--locked'}`}>
          {unlocked ? `+${spot.xp} XP` : t(UI.locked, lang)}
        </span>
      </header>

      {/* Dải điểm QR trong khu – điều hướng nhanh giữa các điểm */}
      <nav class="dest__spots" aria-label="Các điểm trong khu">
        {site.spots.map((s, i) => (
          <a
            key={s.spotId}
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
          <CardView key={i} card={card} lang={lang} />
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
        <img src={site.heroImage} alt={t(site.name, lang)} />
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
        <div class="dintro__modes" role="radiogroup">
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

function CardView({ card, lang }: { card: Card; lang: Lang }) {
  switch (card.type) {
    case 'hero':
      return (
        <figure class={`dcard dcard--hero dcard--${card.size}`}>
          <img src={card.image} alt={t(card.caption, lang)} />
          {card.caption && <figcaption>{t(card.caption, lang)}</figcaption>}
        </figure>
      );
    case 'aspects':
      return <AspectsCardView card={card} lang={lang} />;
    case 'video':
      return (
        <div class={`dcard dcard--video dcard--${card.size}`}>
          {card.src ? (
            <iframe src={card.src} title={t(card.title, lang)} loading="lazy" allowFullScreen allow="fullscreen; picture-in-picture" />
          ) : (
            <div class="dcard__video-ph" style={card.poster ? { backgroundImage: `url(${card.poster})` } : undefined}>
              <span class="dcard__play">
                <Icon name="play" size={28} />
              </span>
              <b>{t(card.title, lang)}</b>
              <small>{t(UI.videoSoon, lang)}</small>
            </div>
          )}
        </div>
      );
    case 'audio':
      return (
        <div class={`dcard dcard--audio dcard--${card.size}`}>
          <button class="mdv-btn mdv-btn--ghost" disabled title={t(UI.comingSoon, lang)}>
            <Icon name="volume" size={20} /> {t(UI.listen, lang)}
          </button>
          <p class="mdv-muted">{card.script[lang][0]}</p>
        </div>
      );
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
          <img src={card.image} alt={t(card.caption, lang)} loading="lazy" />
          {card.caption && <figcaption>{t(card.caption, lang)}</figcaption>}
        </figure>
      );
  }
}

function AspectsCardView({ card, lang }: { card: Extract<Card, { type: 'aspects' }>; lang: Lang }) {
  const [active, setActive] = useState(card.aspects[0].id);
  const cur = card.aspects.find((a) => a.id === active) ?? card.aspects[0];
  return (
    <div class={`dcard dcard--aspects dcard--${card.size}`}>
      <div class="dcard__tabs" role="tablist">
        {card.aspects.map((a) => (
          <button key={a.id} role="tab" class="mdv-chip" aria-pressed={a.id === cur.id} aria-selected={a.id === cur.id} onClick={() => setActive(a.id)}>
            {t(a.title, lang)}
          </button>
        ))}
      </div>
      <p key={cur.id} class="dcard__body">
        {t(cur.body, lang)}
      </p>
    </div>
  );
}
