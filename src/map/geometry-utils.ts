export type Pt = [number, number];

/** Đường cong Catmull-Rom -> Bezier bậc 3 đi qua mọi điểm (đường hành trình mềm, không gãy khúc). */
export function smoothPath(points: Pt[], tension = 0.5): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2, p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2, p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function bboxOf(points: Pt[], pad = 0): Box {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

export interface Transform {
  k: number;
  tx: number;
  ty: number;
}

/** Transform để khung nhìn (viewW x viewH) bao trọn box, giới hạn zoom tối đa. */
export function fitBox(box: Box, viewW: number, viewH: number, maxK: number): Transform {
  const k = Math.min(maxK, viewW / box.w, viewH / box.h);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return { k, tx: viewW / 2 - cx * k, ty: viewH / 2 - cy * k };
}

export function clampTransform(t: Transform, viewW: number, viewH: number, minK: number, maxK: number): Transform {
  const k = Math.min(maxK, Math.max(minK, t.k));
  // Không cho kéo bản đồ ra khỏi khung quá 40% kích thước
  const slackX = viewW * 0.4;
  const slackY = viewH * 0.4;
  const minTx = viewW - viewW * k - slackX;
  const maxTx = slackX;
  const minTy = viewH - viewH * k - slackY;
  const maxTy = slackY;
  return {
    k,
    tx: Math.min(maxTx, Math.max(minTx, t.tx)),
    ty: Math.min(maxTy, Math.max(minTy, t.ty)),
  };
}

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
