import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { UI, t, useLang, type Localized } from '../lib/i18n';
import { asset } from '../lib/asset';
import { Icon } from './Icon';
import './tour.css';

export interface TourStep {
  /** Selector mục tiêu; chuỗi = 1 selector, mảng = thử theo thứ tự. Bỏ trống = thẻ giữa màn hình. */
  sel?: string | string[];
  icon: string;
  title: Localized;
  body: Localized;
  /** 'finale' = thẻ kết có mascot + CTA lớn */
  kind?: 'finale';
  /** Chạy khi bước này hiện — vd. điều hướng vào trong điểm để soi tính năng bên trong. */
  enter?: () => void;
}

const PAD = 9;
const GAP = 14;
const TIP_MAX = 320;
const MOVE = 'transform 460ms cubic-bezier(0.32, 0.72, 0.24, 1), width 460ms cubic-bezier(0.32, 0.72, 0.24, 1), height 460ms cubic-bezier(0.32, 0.72, 0.24, 1)';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function findTarget(sel?: string | string[]): Element | null {
  if (!sel) return null;
  for (const s of Array.isArray(sel) ? sel : [sel]) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

/** Tour spotlight: 4 tấm dim ôm khung sáng (tay vẫn chạm được nút đang được soi). */
export function GuidedTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [lang] = useLang();
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [tipH, setTipH] = useState(170);
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  // Đo khung sáng mỗi khi đổi bước: kéo mục tiêu vào vùng nhìn (chip tìm kiếm nằm
  // ngoài khung cuộn ngang), rồi đọc rect ở frame sau. Vòng đo lặp 350ms giữ ring
  // dính mục tiêu kể cả lúc camera bản đồ còn đang bay về điểm kế tiếp.
  useLayoutEffect(() => {
    step.enter?.();
    let raf1 = 0;
    let raf2 = 0;
    const measure = () => {
      const el = findTarget(step.sel);
      if (!el) {
        setBox(null);
        return;
      }
      el.scrollIntoView({ block: 'nearest', inline: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        setBox(null);
        return;
      }
      setBox({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
    };
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    const tick = window.setInterval(measure, 350);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearInterval(tick);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, step.sel]);

  // Chiều cao tooltip thật (đổi theo bước/lang) để neo trên/dưới không bị lệch.
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (el) setTipH(el.offsetHeight);
  }, [i, box, lang]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        setI((v) => Math.min(v + 1, steps.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setI((v) => Math.max(v - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone, steps.length]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Ẩn banner "có bản cập nhật"/offline khỏi màn hướng dẫn — không được chen khoảnh khắc này.
    document.documentElement.dataset.overlay = '1';
    return () => {
      document.body.style.overflow = prev;
      delete document.documentElement.dataset.overlay;
    };
  }, []);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = Math.min(TIP_MAX, vw - 28);

  // Neo tooltip: ưu tiên dưới khung sáng; thiếu chỗ thì lật lên trên; không có mục tiêu → giữa màn.
  let tipX: number;
  let tipY: number;
  if (box) {
    const cx = Math.min(Math.max(box.x + box.w / 2, tipW / 2 + 14), vw - tipW / 2 - 14);
    tipX = cx - tipW / 2;
    const below = vh - (box.y + box.h) >= tipH + GAP + 10 || vh - (box.y + box.h) >= box.y;
    tipY = below ? box.y + box.h + GAP : box.y - GAP - tipH;
    tipY = Math.min(Math.max(tipY, 10), vh - tipH - 10);
  } else {
    tipX = (vw - tipW) / 2;
    tipY = (vh - tipH) / 2;
  }

  const dims = box
    ? [
        { x: 0, y: 0, w: vw, h: Math.max(0, box.y) },
        { x: 0, y: box.y, w: Math.max(0, box.x), h: box.h },
        { x: box.x + box.w, y: box.y, w: Math.max(0, vw - (box.x + box.w)), h: box.h },
        { x: 0, y: box.y + box.h, w: vw, h: Math.max(0, vh - (box.y + box.h)) },
      ]
    : [{ x: 0, y: 0, w: vw, h: vh }];

  // Portal ra body: .mscreen{z-index:1} là stacking context — overlay trong đó
  // luôn thua dock(z80). Render ở root thì z95 áp toàn màn như thiết kế.
  return createPortal(
    <div class="tour" role="dialog" aria-modal="true" aria-label={t(UI.howto, lang)}>
      {dims.map((d, k) => (
        <div
          key={k}
          class="tour__dim"
          style={{
            transform: `translate(${d.x}px, ${d.y}px)`,
            width: d.w,
            height: d.h,
            transition: MOVE,
          }}
        />
      ))}
      {box && (
        <div
          class="tour__ring"
          aria-hidden="true"
          style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h, transition: MOVE }}
        />
      )}
      <div
        ref={tipRef}
        class={`tour__tip ${step.kind === 'finale' ? 'tour__tip--finale' : ''}`}
        style={{ transform: `translate(${tipX}px, ${tipY}px)`, width: tipW, transition: 'transform 460ms cubic-bezier(0.32, 0.72, 0.24, 1)' }}
      >
        <div class="tour__tipin" key={i}>
          {step.kind === 'finale' && <img class="tour__mascot" src={asset('img/mascot.webp')} alt="" />}
          <div class="tour__tiphead">
            <span class="tour__tipicon" aria-hidden="true">
              <Icon name={step.icon} size={19} />
            </span>
            <b class="tour__tiptitle">{t(step.title, lang)}</b>
            <span class="tour__tipcount" aria-hidden="true">
              {i + 1}/{steps.length}
            </span>
          </div>
          <p class="tour__tipbody">{t(step.body, lang)}</p>
          <div class="tour__dots" aria-hidden="true">
            {steps.map((_, d) => (
              <span key={d} class={`tour__dot ${d === i ? 'tour__dot--on' : d < i ? 'tour__dot--done' : ''}`} />
            ))}
          </div>
          <div class="tour__ctl">
            {i > 0 && (
              <button class="tour__btn tour__btn--ghost" onClick={() => setI(i - 1)}>
                <Icon name="back" size={15} /> {t(UI.tourBack, lang)}
              </button>
            )}
            {last ? (
              <button ref={nextRef} class="tour__btn tour__btn--primary" onClick={onDone}>
                {t(UI.tourGo, lang)} <Icon name="forward" size={15} />
              </button>
            ) : (
              <button ref={nextRef} class="tour__btn tour__btn--primary" onClick={() => setI(i + 1)}>
                {t(UI.tourNext, lang)} <Icon name="forward" size={15} />
              </button>
            )}
          </div>
          <button class="tour__skip" onClick={onDone}>
            {t(UI.tourSkip, lang)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}