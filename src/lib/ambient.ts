/**
 * Âm thanh không gian bằng Web Audio (P2 khung, P4 tinh chỉnh).
 * Ba preset thủ tục — không cần file nhạc nền, chạy được offline ngay:
 *  - wind-water   : nhiễu trắng qua lowpass có LFO (gió) + oscillator sine thấp (sóng)
 *  - temple-bell  : chuông chùa — cụm sine vang mỗi ~6s + nền noise rất nhẹ
 *  - garden       : vườn — noise highpass nhẹ + tiếng chim ngẫu nhiên (gliss sine)
 * Phải start() từ trong cử chỉ người dùng. D4 đọc graphDescription()/gain để inspect.
 */
import { logError } from '../debug/errorlog';

export type AmbientPreset = 'wind-water' | 'temple-bell' | 'garden';

export interface AmbientState {
  preset: AmbientPreset | null;
  ctxState: string;
  gain: number;
  nodes: string[];
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let graph: AudioNode[] = [];
let timers: number[] = [];
let preset: AmbientPreset | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds = 2): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function bell(c: AudioContext, at: number, out: AudioNode) {
  // Một tiếng chuông: 2 tầng (partial) sine + decay dài.
  for (const [freq, amp] of [
    [196, 0.16],
    [392, 0.07],
    [587, 0.03],
  ] as const) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(amp, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 3.5);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 3.6);
  }
}

function chirp(c: AudioContext, at: number, out: AudioNode) {
  // Tiếng chim: glissando sine ngắn, cao độ ngẫu nhiên.
  const o = c.createOscillator();
  const g = c.createGain();
  const f0 = 2200 + Math.random() * 1800;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f0 * (1.2 + Math.random() * 0.6), at + 0.09);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.05, at + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.25);
}

function build(c: AudioContext, p: AmbientPreset): AudioNode[] {
  const nodes: AudioNode[] = [];
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c);
  noise.loop = true;

  if (p === 'wind-water') {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.6;
    const g = c.createGain();
    g.gain.value = 0.14;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoAmp = c.createGain();
    lfoAmp.gain.value = 160;
    lfo.connect(lfoAmp).connect(lp.frequency);
    const wave = c.createOscillator();
    wave.frequency.value = 68;
    const waveG = c.createGain();
    waveG.gain.value = 0.05;
    noise.connect(lp).connect(g).connect(master!);
    wave.connect(waveG).connect(master!);
    noise.start();
    lfo.start();
    wave.start();
    nodes.push(noise, lp, g, lfo, lfoAmp, wave, waveG);
  } else if (p === 'temple-bell') {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const g = c.createGain();
    g.gain.value = 0.05;
    noise.connect(lp).connect(g).connect(master!);
    noise.start();
    nodes.push(noise, lp, g);
    const ring = () => {
      bell(c, c.currentTime + 0.02, master!);
      timers.push(window.setTimeout(ring, 5000 + Math.random() * 4000));
    };
    ring();
  } else {
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const g = c.createGain();
    g.gain.value = 0.035;
    noise.connect(hp).connect(g).connect(master!);
    noise.start();
    nodes.push(noise, hp, g);
    const bird = () => {
      chirp(c, c.currentTime + 0.01, master!);
      timers.push(window.setTimeout(bird, 1200 + Math.random() * 3200));
    };
    timers.push(window.setTimeout(bird, 400));
  }
  return nodes;
}

export function startAmbient(p: AmbientPreset): boolean {
  const c = ensureCtx();
  if (!c) return false;
  try {
    stopAmbient();
    void c.resume();
    master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    // Fade-in êm để không giật người nghe.
    master.gain.setTargetAtTime(0.9, c.currentTime, 1.2);
    preset = p;
    graph = build(c, p);
    return true;
  } catch (e) {
    logError('manual', `ambient start: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

export function stopAmbient() {
  timers.forEach(clearTimeout);
  timers = [];
  for (const n of graph) {
    try {
      if (n instanceof AudioBufferSourceNode || n instanceof OscillatorNode) n.stop();
    } catch {
      /* đã dừng */
    }
    try {
      n.disconnect();
    } catch {
      /* bỏ qua */
    }
  }
  graph = [];
  if (master) {
    try {
      if (ctx) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
      const m = master;
      window.setTimeout(() => m.disconnect(), 600);
    } catch {
      /* bỏ qua */
    }
    master = null;
  }
  preset = null;
}

export function ambientState(): AmbientState {
  return {
    preset,
    ctxState: ctx?.state ?? 'none',
    gain: master ? Math.round(master.gain.value * 100) / 100 : 0,
    nodes: graph.map((n) => n.constructor.name),
  };
}
