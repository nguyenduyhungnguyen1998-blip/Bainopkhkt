/**
 * Thuyết minh giọng đọc bằng Web Speech API (P2/P4).
 * - Phát theo TỪNG CÂU (mỗi câu một utterance) để tô sáng câu đang đọc chính xác trên mọi máy —
 *   sự kiện onboundary/charIndex không đáng tin trên Android.
 * - Watchdog: nếu câu đầu không vào onstart trong 2 giây -> coi như thất bại im lặng,
 *   hủy và báo UI rơi về văn bản (exit criteria P2: fallback < 1–2 s).
 * - Phải gọi từ trong cử chỉ người dùng (tap) để qua autoplay policy.
 */
import type { Lang } from '../data/types';
import { logError } from '../debug/errorlog';

export type SpeechStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'failed' | 'done';

export interface SpeechCallbacks {
  /** index câu đang đọc; -1 = chưa vào câu nào */
  onSentence?: (index: number, total: number) => void;
  onStatus?: (s: SpeechStatus) => void;
}

const WATCHDOG_MS = 2000;

let voiceCache: SpeechSynthesisVoice[] | null = null;

export function speechSupported(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  if (voiceCache === null) {
    voiceCache = speechSynthesis.getVoices();
    if (voiceCache.length === 0) {
      // Chrome nạp giọng bất đồng bộ — nghe sự kiện để lần sau có đủ.
      speechSynthesis.addEventListener('voiceschanged', () => {
        voiceCache = speechSynthesis.getVoices();
      }, { once: true });
    }
  }
  return voiceCache;
}

/** Chọn giọng theo ngôn ngữ UI: ưu tiên vi-VN/vi_*, fallback default của trình duyệt. */
export function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (voices.length === 0) return null;
  const prefix = lang === 'vi' ? 'vi' : 'en';
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix)) ??
    voices.find((v) => v.default) ??
    voices[0]
  );
}

export class SpeechPlayer {
  private sentences: string[] = [];
  private lang: Lang = 'vi';
  private cb: SpeechCallbacks = {};
  private index = -1;
  private rate = 1;
  private status: SpeechStatus = 'idle';
  private watchdog = 0;
  private cancelled = false;

  get currentIndex() {
    return this.index;
  }
  get total() {
    return this.sentences.length;
  }
  get currentStatus() {
    return this.status;
  }

  private setStatus(s: SpeechStatus) {
    this.status = s;
    this.cb.onStatus?.(s);
  }

  /** Bắt đầu đọc cả đoạn. Gọi trong handler click. */
  play(sentences: string[], lang: Lang, cb: SpeechCallbacks = {}) {
    this.stopInternal();
    if (!speechSupported() || sentences.length === 0) {
      this.cb = cb;
      this.setStatus('failed');
      return;
    }
    this.sentences = sentences;
    this.lang = lang;
    this.cb = cb;
    this.index = -1;
    this.cancelled = false;
    this.setStatus('loading');
    this.speakNext(0);
  }

  private speakNext(i: number) {
    if (this.cancelled || i >= this.sentences.length) {
      if (!this.cancelled) this.setStatus('done');
      return;
    }
    const u = new SpeechSynthesisUtterance(this.sentences[i]);
    const voice = pickVoice(this.lang);
    if (voice) u.voice = voice;
    u.lang = this.lang === 'vi' ? 'vi-VN' : 'en-US';
    u.rate = this.rate;
    const first = i === 0;
    u.onstart = () => {
      if (first) clearTimeout(this.watchdog);
      if (this.cancelled) return;
      this.index = i;
      this.setStatus('playing');
      this.cb.onSentence?.(i, this.sentences.length);
    };
    u.onend = () => {
      if (this.cancelled) return;
      this.speakNext(i + 1);
    };
    u.onerror = (e) => {
      if (this.cancelled) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      logError('manual', `speechSynthesis: ${e.error}`);
      this.setStatus('failed');
    };
    if (first) {
      // Watchdog: trình duyệt nuốt utterance (kẹt audio graph, thiếu giọng) thì fallback.
      this.watchdog = window.setTimeout(() => {
        if (this.index === -1 && !this.cancelled && this.status === 'loading') {
          logError('manual', 'speechSynthesis: watchdog – câu đầu không vào onstart sau 2s');
          this.cancelled = true;
          speechSynthesis.cancel();
          this.setStatus('failed');
        }
      }, WATCHDOG_MS);
    }
    speechSynthesis.speak(u);
  }

  pause() {
    if (this.status === 'playing') {
      speechSynthesis.pause();
      this.setStatus('paused');
    }
  }

  resume() {
    if (this.status === 'paused') {
      speechSynthesis.resume();
      this.setStatus('playing');
    }
  }

  setRate(r: number) {
    this.rate = r;
    // Áp dụng ngay: đọc lại từ câu hiện tại với tốc độ mới.
    if (this.status === 'playing' || this.status === 'paused') {
      const at = Math.max(0, this.index);
      speechSynthesis.cancel();
      this.speakNext(at);
      if (this.status === 'paused') speechSynthesis.pause();
    }
  }

  private stopInternal() {
    this.cancelled = true;
    clearTimeout(this.watchdog);
    if (speechSupported()) speechSynthesis.cancel();
    this.cancelled = false;
  }

  stop() {
    this.stopInternal();
    this.index = -1;
    this.setStatus('idle');
  }
}
