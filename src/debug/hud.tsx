/**
 * D1 – Debug HUD. Chỉ được tải khi có ?debug=1 (hoặc localStorage mdv.debug=1),
 * nằm trong chunk riêng để không lọt vào đường tải chính của production.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { useOnline, useTheme } from '../lib/theme';
import { useProgress, resetProgress, unlockSpot, computeStatuses } from '../lib/progress';
import { SITES } from '../data/content';
import { clearErrors, exportErrorsJson, getErrors, onErrorsChange, logError } from './errorlog';
import { inspector, useInspector } from './inspector';
import type { NodeStatus } from '../lib/progress';
import { exportPassportJson, importPassportJson } from '../lib/progress';
import { signSpot } from '../lib/qr';
import { SpeechPlayer, listVoices, speechSupported } from '../lib/speech';
import { ambientState, startAmbient, stopAmbient, type AmbientPreset } from '../lib/ambient';
import { navigate } from '../lib/router';
import './hud.css';

function useFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function useSwState(): string {
  const [s, set] = useState('n/a');
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return set('unsupported');
    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return set('none');
      set(r.active ? 'active' : r.installing ? 'installing' : r.waiting ? 'waiting' : 'registered');
    });
  }, []);
  return s;
}

function useErrorCount(): number {
  const [n, set] = useState(getErrors().length);
  useEffect(() => onErrorsChange(() => set(getErrors().length)), []);
  return n;
}

const FORCE_STATUSES: (NodeStatus | '')[] = ['', 'locked', 'next', 'active', 'done'];

/** D9 – Map Inspector: lưới kinh/vĩ, vùng chạm, điểm chạm, ép trạng thái node. */
function InspectorPanel() {
  const insp = useInspector();
  // Poll transform (non-reactive) 4Hz khi inspector đang bật.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!insp.on) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [insp.on]);
  return (
    <div class="hud__inspector">
      <div class="hud__actions">
        <button aria-pressed={insp.on} onClick={() => inspector.toggle()}>
          Inspector {insp.on ? 'on' : 'off'}
        </button>
        <button aria-pressed={insp.showGrid} disabled={!insp.on} onClick={() => inspector.setGrid(!insp.showGrid)}>
          Lưới lon/lat
        </button>
        <button aria-pressed={insp.showHitRings} disabled={!insp.on} onClick={() => inspector.setHitRings(!insp.showHitRings)}>
          Vùng chạm 44px
        </button>
        <button disabled={!insp.on || insp.statusOverrides.size === 0} onClick={() => inspector.clearOverrides()}>
          Bỏ ép trạng thái
        </button>
      </div>
      {insp.on && (
        <>
          <div class="hud__grid">
            <span>zoom</span>
            <b>{insp.transform.k.toFixed(2)}×</b>
            <span>tap</span>
            <b class="hud__mono">
              {insp.lastTap ? `${insp.lastTap.x.toFixed(4)}, ${insp.lastTap.y.toFixed(4)}` : '–'}
            </b>
          </div>
          <div class="hud__forcelist">
            {SITES.map((s) => (
              <label key={s.entityId} class="hud__forcerow">
                <span>{s.entityId}</span>
                <select
                  value={insp.statusOverrides.get(s.entityId) ?? ''}
                  onChange={(e) => inspector.forceStatus(s.entityId, (e.target as HTMLSelectElement).value as NodeStatus | '' || null)}
                >
                  {FORCE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st || 'auto'}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** D3 – Speech Probe: liệt kê giọng, phát thử, đo thời gian đến onstart. */
function SpeechPanel() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [probe, setProbe] = useState<string>('–');
  const playerRef = useRef<SpeechPlayer | null>(null);
  useEffect(() => {
    setVoices(listVoices());
    const id = setInterval(() => setVoices(listVoices()), 1500);
    return () => {
      clearInterval(id);
      playerRef.current?.stop();
    };
  }, []);
  const test = () => {
    if (!speechSupported()) return setProbe('unsupported');
    if (!playerRef.current) playerRef.current = new SpeechPlayer();
    const t0 = performance.now();
    setProbe('đang phát…');
    playerRef.current.play(['Kinh nghiệm du lịch di sản Việt Nam.'], 'vi', {
      onSentence: () => setProbe(`onstart ${Math.round(performance.now() - t0)}ms`),
      onStatus: (s) => {
        if (s === 'failed') setProbe('FAILED – fallback text');
        if (s === 'done') setProbe((v) => `${v} · done`);
      },
    });
  };
  return (
    <div class="hud__inspector">
      <b class="hud__sectitle">D3 Speech</b>
      <div class="hud__grid">
        <span>support</span>
        <b>{speechSupported() ? 'yes' : 'no'}</b>
        <span>voices</span>
        <b>{voices.length}</b>
        <span>vi</span>
        <b>{voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('vi')).map((v) => v.name).join(', ') || 'none'}</b>
        <span>probe</span>
        <b>{probe}</b>
      </div>
      <div class="hud__actions">
        <button onClick={test} disabled={!speechSupported()}>
          Phát thử vi-VN
        </button>
      </div>
    </div>
  );
}

/** D4 – Audio Graph Inspector: trạng thái AudioContext + preset ambient đang chạy. */
function AudioPanel() {
  const [st, setSt] = useState(ambientState());
  useEffect(() => {
    const id = setInterval(() => setSt(ambientState()), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div class="hud__inspector">
      <b class="hud__sectitle">D4 Audio</b>
      <div class="hud__grid">
        <span>ctx</span>
        <b>{st.ctxState}</b>
        <span>preset</span>
        <b>{st.preset ?? 'off'}</b>
        <span>gain</span>
        <b>{st.gain}</b>
        <span>nodes</span>
        <b class="hud__mono">{st.nodes.join(' · ') || '–'}</b>
      </div>
      <div class="hud__actions">
        {(['wind-water', 'temple-bell', 'garden'] as AmbientPreset[]).map((p) => (
          <button key={p} aria-pressed={st.preset === p} onClick={() => (st.preset === p ? stopAmbient() : startAmbient(p))}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/** D6 – Journey Simulator: giả lập quét URL ký thật, sửa chữ ký, tua trạng thái, xuất/nhập hộ chiếu. */
function JourneyPanel() {
  const progress = useProgress();
  const [site, setSite] = useState(SITES[0].entityId);
  const siteObj = SITES.find((s) => s.entityId === site)!;
  const [spot, setSpot] = useState(siteObj.spots[0].spotId);
  const [log, setLog] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const simulate = async (tamper = false) => {
    let sig = await signSpot(site, spot);
    if (tamper) sig = 'f'.repeat(16);
    navigate(`d/${site}/${spot}?s=${sig}`);
  };
  const skipTo = () => {
    // Tua trạng thái: mở hết điểm của các khu trước khu đang chọn + điểm đầu của khu đó.
    const idx = SITES.indexOf(siteObj);
    for (const s of SITES.slice(0, idx)) for (const sp of s.spots) unlockSpot(s.entityId, sp.spotId);
    unlockSpot(site, siteObj.spots[0].spotId);
  };
  const doExport = () => {
    const blob = new Blob([exportPassportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mdv-passport-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div class="hud__inspector">
      <b class="hud__sectitle">D6 Journey Simulator</b>
      <div class="hud__forcelist">
        <label class="hud__forcerow">
          <span>khu</span>
          <select
            value={site}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              setSite(v);
              setSpot(SITES.find((s) => s.entityId === v)!.spots[0].spotId);
            }}
          >
            {SITES.map((s) => (
              <option key={s.entityId} value={s.entityId}>
                {s.entityId}
              </option>
            ))}
          </select>
        </label>
        <label class="hud__forcerow">
          <span>điểm</span>
          <select value={spot} onChange={(e) => setSpot((e.target as HTMLSelectElement).value)}>
            {siteObj.spots.map((sp) => (
              <option key={sp.spotId} value={sp.spotId}>
                {sp.spotId}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div class="hud__actions">
        <button onClick={() => void simulate(false)}>Giả lập quét (ký thật)</button>
        <button onClick={() => void simulate(true)}>Sửa chữ ký</button>
        <button onClick={skipTo}>Tua tới khu này</button>
        <button onClick={() => resetProgress()}>Reset</button>
        <button onClick={doExport}>Xuất hộ chiếu</button>
        <button onClick={() => fileRef.current?.click()}>Nhập hộ chiếu</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) setLog(importPassportJson(await f.text()) ? 'nhập ok' : 'file lạ');
          if (fileRef.current) fileRef.current.value = '';
        }}
      />
      <div class="hud__grid">
        <span>unlocked</span>
        <b>{Object.keys(progress.unlocked).length}</b>
        <span>quizDone</span>
        <b>{Object.keys(progress.quizDone).length}</b>
        <span>log</span>
        <b>{log || '–'}</b>
      </div>
    </div>
  );
}

export function DebugHud() {
  const [open, setOpen] = useState(true);
  const online = useOnline();
  const [theme, setTheme] = useTheme();
  const progress = useProgress();
  const fps = useFps();
  const sw = useSwState();
  const errors = useErrorCount();
  const statuses = computeStatuses(progress);
  const next = SITES.find((s) => statuses.get(s.entityId) === 'next' || statuses.get(s.entityId) === 'active');

  const unlockNext = () => {
    if (!next) return;
    const spot = next.spots.find((sp) => !(`${next.entityId}/${sp.spotId}` in progress.unlocked));
    if (spot) unlockSpot(next.entityId, spot.spotId);
  };

  const download = () => {
    const blob = new Blob([exportErrorsJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mdv-errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fpsClass = fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad';

  return (
    <aside class={`hud ${open ? '' : 'hud--min'}`} aria-label="Debug HUD">
      <button class="hud__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? 'HUD ▾' : `HUD ▸ ${fps}fps ${errors ? `⚠${errors}` : ''}`}
      </button>
      {open && (
        <div class="hud__body">
          <div class="hud__grid">
            <span>net</span>
            <b class={online ? 'ok' : 'bad'}>{online ? 'online' : 'offline'}</b>
            <span>sw</span>
            <b>{sw}</b>
            <span>fps</span>
            <b class={fpsClass}>{fps}</b>
            <span>xp</span>
            <b>{progress.xp}</b>
            <span>unlocked</span>
            <b>{Object.keys(progress.unlocked).length}</b>
            <span>errors</span>
            <b class={errors ? 'bad' : 'ok'}>{errors}</b>
            <span>theme</span>
            <b>{theme}</b>
            <span>route</span>
            <b class="hud__mono">{location.hash || '#/'}</b>
          </div>
          <div class="hud__actions">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Đổi theme</button>
            <button onClick={unlockNext} disabled={!next}>
              Mở điểm kế tiếp
            </button>
            <button onClick={() => resetProgress()}>Reset tiến độ</button>
            <button onClick={() => logError('manual', 'Test error từ HUD')}>Tạo lỗi thử</button>
            <button onClick={download} disabled={!errors}>
              Xuất log
            </button>
            <button onClick={() => clearErrors()} disabled={!errors}>
              Xóa log
            </button>
            <button onClick={() => navigate('/map')}>→ map</button>
          </div>
          <InspectorPanel />
          <JourneyPanel />
          <SpeechPanel />
          <AudioPanel />
        </div>
      )}
    </aside>
  );
}
