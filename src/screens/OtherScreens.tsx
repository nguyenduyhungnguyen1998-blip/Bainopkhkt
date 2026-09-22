/** Hộ chiếu, Thử tài, Cài đặt – P0 dựng khung; P3/P6 hoàn thiện. */
import { SITES } from '../data/content';
import { UI, t, useLang } from '../lib/i18n';
import { computeAchievements, siteUnlockedCount, useProgress, resetProgress } from '../lib/progress';
import './passport.css';
import { useTheme } from '../lib/theme';
import { Icon } from '../components/Icon';
import { routeHref } from '../lib/router';

export function PassportScreen() {
  const [lang] = useLang();
  const p = useProgress();
  const totalSpots = SITES.reduce((n, s) => n + s.spots.length, 0);
  const doneSpots = Object.keys(p.unlocked).length;
  const pct = totalSpots ? doneSpots / totalSpots : 0;
  const RING_R = 56;
  const RING_C = 2 * Math.PI * RING_R;
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.passport, lang)}</span>
          <h1>{lang === 'vi' ? 'Hộ chiếu di sản' : 'Heritage passport'}</h1>
        </div>
        <div class="mdv-badge mdv-badge--next">
          {p.xp} XP
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

      <section class="mdv-card ppass__quote">“{t(UI.journeyQuote, lang)}”</section>

      <section>
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{t(UI.heritageBadges, lang)}</h2>
        <div class="ppass__badges">
          {computeAchievements(p).map((a) => (
            <div key={a.id} class={`ppass__badge ${a.unlocked ? '' : 'ppass__badge--locked'}`}>
              <Icon name={a.icon} size={26} />
              <b>{t(a.name, lang)}</b>
              <small>{a.unlocked ? t(UI.earned, lang) : t(UI.badgeLocked, lang)}</small>
            </div>
          ))}
        </div>
      </section>
      <div class="ppass__sitelist">
        {SITES.map((s) => {
          const n = siteUnlockedCount(s, p);
          const done = n === s.spots.length;
          return (
            <a key={s.entityId} class="mdv-card" href={routeHref.destination(s.entityId)} style="display:flex;gap:12px;align-items:center;color:inherit">
              <img src={s.heroImage} alt="" width="56" height="56" style="border-radius:12px;object-fit:cover" />
              <div style="flex:1;min-width:0">
                <b>{t(s.name, lang)}</b>
                <div class="mdv-muted" style="font-size:var(--text-sm)">
                  {n}/{s.spots.length} {t(UI.spots, lang)}
                </div>
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
    </main>
  );
}

export function QuizScreen() {
  const [lang] = useLang();
  const quizCount = SITES.reduce((n, s) => n + s.spots.reduce((m, sp) => m + (sp.quiz?.length ?? 0), 0), 0);
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.quiz, lang)}</span>
          <h1>{lang === 'vi' ? 'Thử tài sĩ tử' : 'Scholar challenge'}</h1>
        </div>
      </header>
      <div class="mdv-card">
        <p class="mdv-muted">
          {t(UI.comingSoon, lang)} (P3). {lang === 'vi' ? 'Đã có' : 'Ready:'} {quizCount} {lang === 'vi' ? 'câu hỏi trong dữ liệu.' : 'questions in content.'}
        </p>
      </div>
    </main>
  );
}

export function SettingsScreen() {
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  return (
    <main class="mdv-screen">
      <header class="mdv-screen__header">
        <div>
          <span class="mdv-eyebrow">{t(UI.settings, lang)}</span>
          <h1>{t(UI.settings, lang)}</h1>
        </div>
      </header>
      <div style="display:grid;gap:var(--space-3)">
        <section class="mdv-card">
          <h2 style="font-size:var(--text-md);margin:0 0 10px">{t(UI.theme, lang)}</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="mdv-chip" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Icon name="moon" size={16} /> {t(UI.dark, lang)}
            </button>
            <button class="mdv-chip" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              <Icon name="sun" size={16} /> {t(UI.light, lang)}
            </button>
          </div>
        </section>
        <section class="mdv-card">
          <h2 style="font-size:var(--text-md);margin:0 0 10px">{t(UI.language, lang)}</h2>
          <div style="display:flex;gap:8px">
            <button class="mdv-chip" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
              Tiếng Việt
            </button>
            <button class="mdv-chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
              English
            </button>
          </div>
        </section>
        <section class="mdv-card">
          <h2 style="font-size:var(--text-md);margin:0 0 10px">{lang === 'vi' ? 'Dữ liệu' : 'Data'}</h2>
          <button
            class="mdv-btn mdv-btn--ghost"
            onClick={() => {
              if (confirm(lang === 'vi' ? 'Xóa toàn bộ tiến độ hành trình?' : 'Reset all journey progress?')) resetProgress();
            }}
          >
            {lang === 'vi' ? 'Đặt lại tiến độ' : 'Reset progress'}
          </button>
        </section>
        <p class="mdv-muted" style="font-size:var(--text-xs);text-align:center">
          Mở Dấu Việt v{__APP_VERSION__} · {lang === 'vi' ? 'Thêm ?debug=1 vào địa chỉ để mở Debug HUD' : 'Append ?debug=1 to open the Debug HUD'}
        </p>
      </div>
    </main>
  );
}
