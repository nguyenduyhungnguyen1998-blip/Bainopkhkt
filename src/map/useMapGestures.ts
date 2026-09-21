/**
 * Pan / pinch-zoom / wheel cho bản đồ SVG bằng Pointer Events.
 * Transform được ghi trực tiếp lên thuộc tính transform của <g> (không qua state Preact)
 * để mỗi khung hình chỉ tốn một lần cập nhật DOM -> giữ 60 FPS trên Android tầm trung.
 */
import { useEffect, useRef, useCallback } from 'preact/hooks';
import { clampTransform, easeOutCubic, type Transform } from './geometry-utils';

export interface GestureOptions {
  viewW: number;
  viewH: number;
  minK?: number;
  maxK?: number;
  /** Transform ban đầu (mặc định k=1, không dịch). */
  initial?: Transform;
  /** Gọi sau khi transform đổi (đã throttle theo rAF) – dùng để HUD/Inspector đọc. */
  onChange?: (t: Transform) => void;
  /** Phát hiện “tap” (không kéo quá 6px, < 350ms) để phân biệt với pan. */
  onTap?: (svgPt: [number, number]) => void;
}

export function useMapGestures(opts: GestureOptions) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const tRef = useRef<Transform>(opts.initial ?? { k: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ t: Transform; dist: number; mid: [number, number]; time: number; moved: boolean } | null>(null);
  const anim = useRef(0);
  const { viewW, viewH, minK = 1, maxK = 6 } = opts;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  /** Đổi tọa độ client -> tọa độ viewBox (chưa qua transform pan/zoom). */
  const clientToView = useCallback(
    (cx: number, cy: number): [number, number] => {
      const svg = svgRef.current!;
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / viewW, r.height / viewH);
      const ox = (r.width - viewW * s) / 2;
      const oy = (r.height - viewH * s) / 2;
      return [(cx - r.left - ox) / s, (cy - r.top - oy) / s];
    },
    [viewW, viewH]
  );

  /** Tọa độ viewBox -> tọa độ bản đồ (đã bù pan/zoom). */
  const viewToMap = useCallback((vx: number, vy: number): [number, number] => {
    const { k, tx, ty } = tRef.current;
    return [(vx - tx) / k, (vy - ty) / k];
  }, []);

  const apply = useCallback(
    (t: Transform) => {
      tRef.current = clampTransform(t, viewW, viewH, minK, maxK);
      const g = gRef.current;
      if (g) {
        const { k, tx, ty } = tRef.current;
        g.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
        g.style.setProperty('--k', String(k));
      }
      optsRef.current.onChange?.(tRef.current);
    },
    [viewW, viewH, minK, maxK]
  );

  /** Bay mượt tới transform mới (ưu tiên reduced-motion: nhảy thẳng). */
  const animateTo = useCallback(
    (target: Transform, duration = 480) => {
      cancelAnimationFrame(anim.current);
      const from = { ...tRef.current };
      const to = clampTransform(target, viewW, viewH, minK, maxK);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || duration <= 0) return apply(to);
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const e = easeOutCubic(p);
        apply({ k: from.k + (to.k - from.k) * e, tx: from.tx + (to.tx - from.tx) * e, ty: from.ty + (to.ty - from.ty) * e });
        if (p < 1) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
    },
    [apply, viewW, viewH, minK, maxK]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const midAndDist = () => {
      const pts = [...pointers.current.values()];
      if (pts.length >= 2) {
        const [a, b] = pts;
        return { mid: [(a.x + b.x) / 2, (a.y + b.y) / 2] as [number, number], dist: Math.hypot(a.x - b.x, a.y - b.y) };
      }
      const a = pts[0];
      return { mid: [a.x, a.y] as [number, number], dist: 0 };
    };

    const onDown = (e: PointerEvent) => {
      cancelAnimationFrame(anim.current);
      svg.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const { mid, dist } = midAndDist();
      start.current = { t: { ...tRef.current }, dist, mid, time: performance.now(), moved: start.current?.moved ?? false };
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId) || !start.current) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = start.current;
      const { mid, dist } = midAndDist();
      const [mx0, my0] = clientToView(s.mid[0], s.mid[1]);
      const [mx1, my1] = clientToView(mid[0], mid[1]);
      if (Math.hypot(mid[0] - s.mid[0], mid[1] - s.mid[1]) > 6) s.moved = true;

      let k = s.t.k;
      if (pointers.current.size >= 2 && s.dist > 0) k = s.t.k * (dist / s.dist);
      // Giữ điểm giữa hai ngón cố định trên bản đồ khi zoom
      const mapX = (mx0 - s.t.tx) / s.t.k;
      const mapY = (my0 - s.t.ty) / s.t.k;
      apply({ k, tx: mx1 - mapX * k, ty: my1 - mapY * k });
    };

    const onUp = (e: PointerEvent) => {
      const had = pointers.current.delete(e.pointerId);
      if (!had) return;
      const s = start.current;
      if (pointers.current.size === 0 && s) {
        if (!s.moved && performance.now() - s.time < 350) {
          const [vx, vy] = clientToView(e.clientX, e.clientY);
          optsRef.current.onTap?.(viewToMap(vx, vy));
        }
        start.current = null;
      } else if (s) {
        // còn một ngón: bắt đầu lại gốc kéo từ vị trí hiện tại
        const { mid, dist } = midAndDist();
        start.current = { t: { ...tRef.current }, dist, mid, time: s.time, moved: true };
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const [vx, vy] = clientToView(e.clientX, e.clientY);
      const { k, tx, ty } = tRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nk = Math.min(maxK, Math.max(minK, k * factor));
      const mapX = (vx - tx) / k;
      const mapY = (vy - ty) / k;
      apply({ k: nk, tx: vx - mapX * nk, ty: vy - mapY * nk });
    };

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    apply(tRef.current);
    return () => {
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(anim.current);
    };
  }, [apply, clientToView, viewToMap, minK, maxK]);

  return { svgRef, gRef, animateTo, getTransform: () => tRef.current, clientToView, viewToMap };
}
