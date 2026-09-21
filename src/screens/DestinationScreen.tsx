/**
 * Trang điểm đến – P0 dựng khung renderer JSON tối giản (P2 hoàn thiện đầy đủ card, TTS, âm thanh).
 */
import { useState } from 'preact/hooks';
import { getSpot } from '../data/content';
import type { Card } from '../data/types';
import { UI, t, useLang, type Lang } from '../lib/i18n';
import { routeHref } from '../lib/router';
import { isSpotUnlocked, useProgress } from '../lib/progress';
import { Icon } from '../components/Icon';
import './destination.css';

export function DestinationScreen({ siteId, spotId }: { siteId: string; spotId?: string }) {
  const [lang] = useLang();
  useProgress(); // re-render khi mở khóa
  const found = getSpot(siteId, spotId);
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

      {/* Dải điểm QR trong khu – sơ đồ cấp 2 (P1 thay bằng bản đồ nội khu) */}
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
