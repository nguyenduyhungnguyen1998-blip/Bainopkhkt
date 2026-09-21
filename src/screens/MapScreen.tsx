import { useMemo, useState } from 'preact/hooks';
import { VietnamMap, type MapFocus } from '../map/VietnamMap';
import { SITES } from '../data/content';
import { computeStatuses, siteUnlockedCount, unlockSpot, useProgress } from '../lib/progress';
import { UI, t, useLang } from '../lib/i18n';
import { routeHref } from '../lib/router';
import { Icon } from '../components/Icon';
import './map-screen.css';

const FILTERS: { id: MapFocus; label: keyof typeof UI }[] = [
  { id: 'all', label: 'all' },
  { id: 'bac', label: 'north' },
  { id: 'trung', label: 'central' },
  { id: 'nam', label: 'south' },
  { id: 'journey', label: 'myJourney' },
];

export function MapScreen() {
  const [lang] = useLang();
  const progress = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus>('all');

  const statuses = useMemo(() => computeStatuses(progress), [progress]);
  const progressBySite = useMemo(
    () => new Map(SITES.map((s) => [s.entityId, siteUnlockedCount(s, progress) / s.spots.length])),
    [progress]
  );

  const selected = selectedId ? SITES.find((s) => s.entityId === selectedId) : undefined;
  const selectedStatus = selected ? statuses.get(selected.entityId) : undefined;
  const unlockedSpots = Object.keys(progress.unlocked).length;
  const totalSpots = SITES.reduce((n, s) => n + s.spots.length, 0);

  // Demo: mô phỏng quét QR tại điểm đầu tiên chưa mở của khu đang chọn (P3 thay bằng camera + xác thực).
  const simulateScan = () => {
    if (!selected) return;
    const spot = selected.spots.find((sp) => !(`${selected.entityId}/${sp.spotId}` in progress.unlocked));
    if (spot) unlockSpot(selected.entityId, spot.spotId);
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
              setFocus(f.id);
            }}
          >
            {t(UI[f.label], lang)}
          </button>
        ))}
      </div>

      <div class="mscreen__map">
        <VietnamMap
          statuses={statuses}
          progressBySite={progressBySite}
          selectedId={selectedId}
          focus={focus}
          lang={lang}
          onSelect={setSelectedId}
        />
        <div class="mscreen__legend" aria-hidden="true">
          <span class="lg lg--done" /> {t(UI.unlocked, lang)}
          <span class="lg lg--next" /> {t(UI.next, lang)}
          <span class="lg lg--locked" /> {t(UI.locked, lang)}
        </div>
        <div class="mscreen__counter">
          {unlockedSpots}/{totalSpots} {t(UI.spots, lang)}
        </div>
      </div>

      <section class={`msheet ${selected ? 'msheet--open' : ''}`} aria-live="polite" aria-hidden={!selected}>
        {selected && (
          <>
            <div class="msheet__handle" />
            <button class="msheet__close mdv-btn mdv-btn--icon" aria-label={t(UI.back, lang)} onClick={() => setSelectedId(null)}>
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
            <p class="msheet__summary">{t(selected.summary, lang)}</p>
            <div class="msheet__actions">
              <a class="mdv-btn mdv-btn--primary" href={routeHref.destination(selected.entityId)}>
                <Icon name="compass" size={20} /> {t(UI.explore, lang)}
              </a>
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
