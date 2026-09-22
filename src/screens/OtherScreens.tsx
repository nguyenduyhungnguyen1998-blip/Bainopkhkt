/** Hộ chiếu, Thử tài, Cài đặt – P3: quiz engine + xuất/nhập hộ chiếu. */
import { useRef, useState } from 'preact/hooks';
import { SITES, getSpot } from '../data/content';
import type { Site, Spot } from '../data/types';
import { UI, t, useLang, type Lang } from '../lib/i18n';
import { computeAchievements, siteUnlockedCount, useProgress, resetProgress, quizBest, recordQuizResult, exportPassportJson, importPassportJson } from '../lib/progress';
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

      {doneSpots === 0 && (
        <a class="mdv-btn mdv-btn--primary ppass__cta" href={routeHref.map}>
          {t(UI.startScanning, lang)}
        </a>
      )}

      <PassportTools lang={lang} />

      <section>
        <h2 style="font-size:var(--text-md);margin:0 0 10px">{t(UI.heritageBadges, lang)}</h2>
        <div class="ppass__badges">
          {computeAchievements(p).map((a) => (
            <div key={a.id} class={`ppass__badge ${a.unlocked ? '' : 'ppass__badge--locked'}`} title={t(a.need, lang)}>
              <Icon name={a.icon} size={26} />
              <b>{t(a.name, lang)}</b>
              <small class="ppass__need">{t(a.need, lang)}</small>
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

/** Xuất/nhập hộ chiếu JSON (P3): lưu tiến độ ra file và khôi phục trên máy khác. */
function PassportTools({ lang }: { lang: Lang }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([exportPassportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ho-chieu-mo-dau-viet-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (f: File | undefined) => {
    if (!f) return;
    const ok = importPassportJson(await f.text());
    setMsg(t(ok ? UI.importOk : UI.importBad, lang));
    if (fileRef.current) fileRef.current.value = '';
    window.setTimeout(() => setMsg(null), 2600);
  };

  return (
    <section class="mdv-card ppass__tools">
      <button class="mdv-btn mdv-btn--ghost" onClick={doExport}>
        {t(UI.exportPassport, lang)}
      </button>
      <button class="mdv-btn mdv-btn--ghost" onClick={() => fileRef.current?.click()}>
        {t(UI.importPassport, lang)}
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void doImport((e.target as HTMLInputElement).files?.[0])} />
      {msg && <p class="ppass__toolmsg" role="status">{msg}</p>}
    </section>
  );
}

export function QuizScreen() {
  const [lang] = useLang();
  useProgress();
  const [active, setActive] = useState<{ siteId: string; spotId: string } | null>(null);
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
                return (
                  <button key={sp.spotId} class="quiz__row" onClick={() => setActive({ siteId: s.entityId, spotId: sp.spotId })}>
                    <Icon name="quiz" size={18} />
                    <span class="quiz__name">{t(sp.name, lang)}</span>
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
    </main>
  );
}

/** Chơi quiz một điểm: chọn đáp án -> hiện đúng/sai -> câu tiếp -> kết quả + XP (phần vượt best). */
function QuizRun({ site, spot, lang, onExit }: { site: Site; spot: Spot; lang: Lang; onExit: () => void }) {
  const quiz = spot.quiz!;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [gained, setGained] = useState<number | null>(null);
  const best = quizBest(site.entityId, spot.spotId);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === quiz[idx].answer) setCorrect((c) => c + 1);
    if (navigator.vibrate) navigator.vibrate(i === quiz[idx].answer ? 20 : [60, 40, 60]);
  };
  const nextQ = () => {
    if (idx + 1 >= quiz.length) {
      const g = recordQuizResult(site.entityId, spot.spotId, correct, quiz.length);
      setGained(g);
      setDone(true);
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  if (done) {
    // Gợi ý điểm có quiz kế tiếp chưa làm – tránh màn kết quả thành ngõ cụt.
    const nextQuiz = SITES.flatMap((s) => s.spots.filter((sp) => sp.quiz?.length).map((sp) => ({ site: s, spot: sp }))).find(
      ({ site: s, spot: sp }) => quizBest(s.entityId, sp.spotId) === undefined
    );
    return (
      <main class="mdv-screen">
        <div class="mdv-card quiz__result">
          <Icon name="award" size={40} />
          <h2>{t(UI.quizResult, lang)}</h2>
          <div class="quiz__score">
            {correct}/{quiz.length} <small>{t(UI.quizCorrect, lang)}</small>
          </div>
          {gained !== null && gained > 0 ? (
            <p class="quiz__xp">+{gained} XP</p>
          ) : (
            <p class="mdv-muted">{best !== undefined && `${t(UI.bestScore, lang)}: ${best}/${quiz.length}`}</p>
          )}
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="mdv-btn mdv-btn--ghost" onClick={() => (setIdx(0), setPicked(null), setCorrect(0), setDone(false), setGained(null))}>
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
      <div class="mdv-card">
        <p class="quiz__q">{t(q.q, lang)}</p>
        <div class="quiz__opts">
          {q.options.map((o, i) => {
            const cls = picked === null ? '' : i === q.answer ? 'is-correct' : i === picked ? 'is-wrong' : 'is-dim';
            return (
              <button key={i} class={`quiz__opt ${cls}`} onClick={() => pick(i)} disabled={picked !== null}>
                {t(o, lang)}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div class={`quiz__mark ${picked === q.answer ? 'ok' : 'bad'}`}>{t(picked === q.answer ? UI.correctMark : UI.wrongMark, lang)}</div>
        )}
        {picked !== null && (
          <button class="mdv-btn mdv-btn--primary" style="width:100%;margin-top:12px" onClick={nextQ}>
            {t(UI.quizNext, lang)}
          </button>
        )}
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
