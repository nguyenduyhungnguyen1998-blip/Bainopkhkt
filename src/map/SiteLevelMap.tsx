/**
 * Sơ đồ cấp 2 – "bản đồ nội khu" dạng schematic.
 * Tọa độ thật của các điểm QR trong cùng một khu chỉ cách nhau vài chục mét,
 * chiếu địa lý sẽ dồn về một chấm – nên sơ đồ bố trí các điểm dọc trục hành trình
 * (kiểu mặt bằng di tích: cổng dưới, điểm cuối trên), giữ pan/zoom chung.
 */
import { useMemo, useRef } from 'preact/hooks';
import { useMapGestures } from './useMapGestures';
import { smoothPath } from './geometry-utils';
import { useProgress, type Progress } from '../lib/progress';
import { t, type Lang } from '../lib/i18n';
import type { Site } from '../data/types';
import './map.css';

const W = 720;
const H = 560;
const NODE_R = 17;
const HIT_R = 24;

interface SpotNode {
  spotId: string;
  x: number;
  y: number;
  unlocked: boolean;
  next: boolean;
  labelSide: 'left' | 'right';
}

/**
 * Vị trí riêng theo đúng mặt bằng di tích (C1). Văn Miếu: trục Bắc–Nam
 * Môn -> Khuê Văn -> giếng Thiên Quang + vườn bia -> Đại Thành -> Thái Học;
 * vườn bia nằm sườn giếng chứ không nằm trên trục.
 */
const CUSTOM_POS: Record<string, Record<string, { x: number; y: number; labelSide?: 'left' | 'right' }>> = {
  'van-mieu': {
    'van-mieu-mon': { x: W / 2, y: H - 100 },
    'khue-van-cac': { x: W / 2, y: H - 192 },
    'bia-tien-si': { x: W / 2 + 118, y: H - 284, labelSide: 'left' },
    'dai-thanh-mon': { x: W / 2, y: H - 376 },
    'nha-thai-hoc': { x: W / 2, y: H - 468 },
  },
};

/** Khu có sơ đồ mặt bằng riêng (ví dụ giếng Thiên Quang của Văn Miếu). */
function siteDecors(site: Site, nodes: SpotNode[]) {
  if (site.entityId !== 'van-mieu' || nodes.length < 4) return null;
  // Giếng vuông giữa sân thứ ba: tâm trục ngang, mức y của vườn bia.
  const wellY = nodes[2].y;
  return (
    <g aria-hidden="true">
      <rect class="smap__well" x={W / 2 - 56} y={wellY - 56} width={112} height={112} rx={8} />
      <rect class="smap__well-in" x={W / 2 - 32} y={wellY - 32} width={64} height={64} />
    </g>
  );
}

/** Bố trí điểm dọc trục dưới->trên (mặt bằng kiểu các lớp sân nối nhau). */
export function layoutSpots(site: Site, p: Progress): SpotNode[] {
  const n = site.spots.length;
  const firstLocked = site.spots.findIndex((s) => !(`${site.entityId}/${s.spotId}` in p.unlocked));
  const custom = CUSTOM_POS[site.entityId];
  return site.spots.map((s, i) => {
    const c = custom?.[s.spotId];
    const ratio = n === 1 ? 0.5 : i / (n - 1); // 0 -> 1 dọc hành trình
    return {
      spotId: s.spotId,
      x: c ? c.x : W / 2,
      y: c ? c.y : H - 90 - ratio * (H - 190),
      unlocked: `${site.entityId}/${s.spotId}` in p.unlocked,
      next: firstLocked === -1 ? false : i === firstLocked,
      labelSide: c?.labelSide ?? (i % 2 === 0 ? 'right' : 'left'),
    };
  });
}

interface Props {
  site: Site;
  lang: Lang;
  onOpenSpot(spotId: string): void;
}

export function SiteLevelMap({ site, lang, onOpenSpot }: Props) {
  const p = useProgress(); // re-render khi mở khóa điểm trong khu
  const nodes = useMemo(() => layoutSpots(site, p), [site, p]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const { svgRef, gRef, getTransform } = useMapGestures({
    viewW: W,
    viewH: H,
    minK: 0.8,
    maxK: 4,
    initial: { k: 1, tx: 0, ty: 0 },
    onTap: ([mx, my]) => {
      const svg = svgRef.current!;
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / W, r.height / H);
      const k = getTransform().k;
      const hit = HIT_R / s / k;
      let best: SpotNode | null = null;
      let bestD = Infinity;
      for (const nd of nodesRef.current) {
        const d = Math.hypot(nd.x - mx, nd.y - my);
        if (d < hit && d < bestD) {
          best = nd;
          bestD = d;
          continue;
        }
        // Nhãn tên điểm cũng bấm được (cùng cơ chế counter-scale như bản đồ quốc gia).
        const spot = site.spots.find((sp) => sp.spotId === nd.spotId);
        const labelW = (7.5 * (spot ? t(spot.name, lang).length : 12) + 10) / k;
        const lx0 = nd.labelSide === 'right' ? nd.x + (NODE_R + 4) / k : nd.x - (NODE_R + 4) / k - labelW;
        if (mx >= lx0 && mx <= lx0 + labelW && Math.abs(my - nd.y) < 11 / k) {
          if (d < bestD) {
            best = nd;
            bestD = d;
          }
        }
      }
      if (best) onOpenSpot(best.spotId);
    },
  });

  const path = useMemo(() => smoothPath(nodes.map((n) => [n.x, n.y]), 0.35), [nodes]);
  const donePath = useMemo(() => {
    const done = nodes.filter((n) => n.unlocked).map((n) => [n.x, n.y] as [number, number]);
    return done.length > 1 ? smoothPath(done, 0.35) : '';
  }, [nodes]);

  return (
    <svg
      ref={svgRef}
      class="vmap smap"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label={lang === 'vi' ? `Sơ đồ khu ${t(site.name, 'vi')}` : `Site map of ${t(site.name, 'en')}`}
    >
      <g ref={gRef} class="vmap__world">
        {/* Tường khu di tích (schematic) */}
        <rect class="smap__walls" x={90} y={40} width={W - 180} height={H - 80} rx={28} />
        {/* Cổng vào ở cạnh dưới */}
        <g class="smap__gate" transform={`translate(${W / 2} ${H - 52})`}>
          <rect x={-34} y={-12} width={68} height={24} rx={6} />
        </g>
        {/* Ranh giới các lớp sân: vạch ngang giữa hai điểm liên tiếp */}
        {nodes.slice(1).map((nd, i) => {
          const y = (nodes[i].y + nd.y) / 2;
          return <line key={i} class="smap__band" x1={118} x2={W - 118} y1={y} y2={y} />;
        })}
        {siteDecors(site, nodes)}
        {/* Trục hành trình trong khu */}
        <path class="vmap__journey vmap__journey--all" d={path} />
        {donePath && <path class="vmap__journey vmap__journey--done" d={donePath} />}
        {nodes.map((nd, i) => {
          const spot = site.spots[i];
          return (
            <g
              key={nd.spotId}
              class={`vnode ${nd.unlocked ? 'vnode--done' : nd.next ? 'vnode--next' : 'vnode--locked'}`}
              style={{ transform: `translate(${nd.x}px, ${nd.y}px) scale(calc(1 / var(--k, 1)))` }}
            >
              <g
                role="button"
                tabindex={0}
                focusable="true"
                aria-label={t(spot.name, lang)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenSpot(nd.spotId);
                  }
                }}
              >
                <circle class="vnode__hit" r={HIT_R} />
                {nd.next && <circle class="vnode__pulse" r={NODE_R + 4} />}
                {nd.next && <circle class="vnode__pulse vnode__pulse--2" r={NODE_R + 4} />}
                <circle class="vnode__body" r={NODE_R} />
                {nd.unlocked ? (
                  <path class="vnode__glyph" d="M-5 0l3.5 3.5L6-4" />
                ) : nd.next ? null : (
                  <path class="vnode__glyph" d="M-3.5 -1v-2a3.5 3.5 0 0 1 7 0v2M-5 -1h10v6h-10z" />
                )}
                <text
                  class="vnode__label"
                  x={nd.labelSide === 'right' ? NODE_R + 12 : -(NODE_R + 12)}
                  text-anchor={nd.labelSide === 'right' ? 'start' : 'end'}
                  dominant-baseline="central"
                >
                  {t(spot.name, lang)}
                </text>
              </g>
              {nd.next && !nd.unlocked && (
                <text class="vnode__num" text-anchor="middle" dominant-baseline="central" aria-hidden="true" pointer-events="none">
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
