/**
 * D9 – Map Inspector: trạng thái bật/tắt và dữ liệu quan trắc bản đồ.
 * Store nằm trong bundle chính (nhẹ); chỉ HUD (chunk debug) mới bật được.
 * VietnamMap đọc store để vẽ lớp phủ lưới/vùng chạm và áp trạng thái ép.
 */
import { useEffect, useState } from 'preact/hooks';
import type { NodeStatus } from '../lib/progress';
import type { Transform } from '../map/geometry-utils';

export interface InspectorState {
  on: boolean;
  showGrid: boolean;
  showHitRings: boolean;
  /** Ép trạng thái hiển thị của node (không ghi vào tiến độ thật). */
  statusOverrides: Map<string, NodeStatus>;
  lastTap: { x: number; y: number } | null;
  transform: Transform;
}

const EMPTY: InspectorState = {
  on: false,
  showGrid: true,
  showHitRings: true,
  statusOverrides: new Map(),
  lastTap: null,
  transform: { k: 1, tx: 0, ty: 0 },
};

let state: InspectorState = { ...EMPTY };
const listeners = new Set<() => void>();

function set(patch: Partial<InspectorState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const inspector = {
  get: () => state,
  toggle(on = !state.on) {
    set({ on });
  },
  setGrid(v: boolean) {
    set({ showGrid: v });
  },
  setHitRings(v: boolean) {
    set({ showHitRings: v });
  },
  setTap(x: number, y: number) {
    set({ lastTap: { x, y } });
  },
  /** Transform hiện tại của bản đồ – cập nhật mỗi frame pan nên KHÔNG notify
   * (HUD đọc qua inspector.get().transform theo nhịp riêng). */
  setTransform(t: Transform) {
    state.transform = t;
  },
  /** Ép trạng thái một node; null = bỏ ép. */
  forceStatus(siteId: string, s: NodeStatus | null) {
    const m = new Map(state.statusOverrides);
    if (s) m.set(siteId, s);
    else m.delete(siteId);
    set({ statusOverrides: m });
  },
  clearOverrides() {
    set({ statusOverrides: new Map() });
  },
};

export function useInspector(): InspectorState {
  const [s, setS] = useState(state);
  useEffect(() => {
    const l = () => setS(state);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return s;
}
