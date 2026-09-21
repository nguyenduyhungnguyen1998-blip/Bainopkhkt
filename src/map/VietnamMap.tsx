/**
 * Bản đồ chữ S – màn hình chính.
 * Lớp vẽ (dưới -> trên): biển, nước láng giềng (mờ), đất liền + viền bờ, hai quần đảo,
 * đường hành trình (nền mờ + phần đã đi), node khu di sản (4 trạng thái), nhãn.
 * Node và nhãn được "counter-scale" theo --k để giữ kích thước màn hình cố định khi zoom.
 */
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { MAP_WIDTH, MAP_HEIGHT, VIETNAM_LAND_PATH, NEIGHBOUR_PATHS } from './vietnam-geometry';
import { project, ARCHIPELAGOS } from './projection';
import { smoothPath, bboxOf, fitBox, type Transform } from './geometry-utils';
import { useMapGestures } from './useMapGestures';
import { SITES } from '../data/content';
import type { Region, Site } from '../data/types';
import type { NodeStatus } from '../lib/progress';
import { t, type Lang } from '../lib/i18n';
import './map.css';

export type MapFocus = 'all' | Region | 'journey';

export interface MapNode {
  site: Site;
  x: number;
  y: number;
  status: NodeStatus;
  /** 0..1 – tỉ lệ điểm QR đã mở trong khu */
  progress: number;
  labelSide: 'left' | 'right';
}

interface Props {
  statuses: Map<string, NodeStatus>;
  progressBySite: Map<string, number>;
  selectedId: string | null;
  focus: MapFocus;
  lang: Lang;
  onSelect(id: string | null): void;
  onTransform?(t: Transform): void;
}

const NODE_R = 15; // bán kính hiển thị (px màn hình ~ ở k=1 và svg vừa khung)
const HIT_R = 22; // bán kính chạm 44px theo WCAG 2.5.5

/** Khung "Toàn quốc": đất liền + Hoàng Sa + Trường Sa (kinh 102–115.5, vĩ 8.3–23.5). */
const ALL_BOX = (() => {
  const [x0, y0] = project(102, 23.5);
  const [x1, y1] = project(115.5, 8.3);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
})();
const ALL_TRANSFORM = fitBox(ALL_BOX, MAP_WIDTH, MAP_HEIGHT, 6);

export function buildNodes(statuses: Map<string, NodeStatus>, progressBySite: Map<string, number>): MapNode[] {
  const pts = SITES.map((s) => ({ s, p: project(s.coords[0], s.coords[1]) }));
  return pts.map(({ s, p }) => {
    // Nhãn đặt bên phải (phía biển); nếu có node khác sát bên phải trong 90px thì đẩy sang trái.
    const crowdedRight = pts.some(
      (o) => o.s !== s && o.p[0] > p[0] && o.p[0] - p[0] < 90 && Math.abs(o.p[1] - p[1]) < 28
    );
    return {
      site: s,
      x: p[0],
      y: p[1],
      status: statuses.get(s.entityId) ?? 'locked',
      progress: progressBySite.get(s.entityId) ?? 0,
      labelSide: crowdedRight ? 'left' : 'right',
    };
  });
}

export function VietnamMap({ statuses, progressBySite, selectedId, focus, lang, onSelect, onTransform }: Props) {
  const nodes = useMemo(() => buildNodes(statuses, progressBySite), [statuses, progressBySite]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const { svgRef, gRef, animateTo, getTransform } = useMapGestures({
    viewW: MAP_WIDTH,
    viewH: MAP_HEIGHT,
    minK: 0.9,
    maxK: 6,
    initial: ALL_TRANSFORM,
    onChange: onTransform,
    onTap: ([mx, my]) => {
      const svg = svgRef.current!;
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / MAP_WIDTH, r.height / MAP_HEIGHT);
      const hit = HIT_R / s / getTransform().k; // 22px màn hình -> đơn vị bản đồ
      let best: MapNode | null = null;
      let bestD = Infinity;
      for (const n of nodesRef.current) {
        const d = Math.hypot(n.x - mx, n.y - my);
        if (d < hit && d < bestD) {
          best = n;
          bestD = d;
        }
      }
      onSelect(best ? best.site.entityId : null);
    },
  });

  // Bay tới vùng lọc (lần mount đầu không animate – đã đặt initial)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (focus === 'all') return;
    }
    if (focus === 'all') {
      animateTo(ALL_TRANSFORM);
      return;
    }
    let pts: [number, number][];
    if (focus === 'journey') {
      const touched = nodes.filter((n) => n.status !== 'locked');
      pts = (touched.length ? touched : nodes).map((n) => [n.x, n.y]);
    } else pts = nodes.filter((n) => n.site.region === focus).map((n) => [n.x, n.y]);
    if (pts.length === 0) return;
    const box = bboxOf(pts, 70);
    // chừa thêm bên phải cho nhãn
    animateTo(fitBox({ ...box, x: box.x - 40, w: box.w + 120 }, MAP_WIDTH, MAP_HEIGHT, 3.2));
  }, [focus, animateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đường hành trình
  const journeyAll = useMemo(() => smoothPath(nodes.map((n) => [n.x, n.y])), [nodes]);
  const touchedIdx = nodes.reduce((last, n, i) => (n.status === 'active' || n.status === 'done' ? i : last), -1);
  const journeyDone = touchedIdx > 0 ? smoothPath(nodes.slice(0, touchedIdx + 1).map((n) => [n.x, n.y])) : '';
  const nextIdx = nodes.findIndex((n) => n.status === 'next');
  // Đoạn "mời gọi" từ khu đã chạm xa nhất tới khu gợi ý kế tiếp (dash chạy)
  const journeyNext =
    touchedIdx >= 0 && nextIdx > touchedIdx
      ? smoothPath(nodes.slice(touchedIdx, nextIdx + 1).map((n) => [n.x, n.y]))
      : '';

  const archi = ARCHIPELAGOS.map((a) => ({ ...a, p: project(a.lon, a.lat) }));

  return (
    <svg
      ref={svgRef}
      class="vmap"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label={lang === 'vi' ? 'Bản đồ hành trình di sản Việt Nam' : 'Vietnam heritage journey map'}
    >
      <defs>
        <radialGradient id="vmap-sea" cx="60%" cy="45%" r="80%">
          <stop offset="0" stop-color="var(--color-sea)" stop-opacity="0.35" />
          <stop offset="1" stop-color="var(--color-sea)" />
        </radialGradient>
        <pattern id="vmap-waves" width="36" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 9c6-6 12-6 18 0s12 6 18 0" fill="none" stroke="currentColor" stroke-opacity="0.07" stroke-width="1" />
        </pattern>
        <pattern id="vmap-land-tex" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="0.8" fill="currentColor" fill-opacity="0.12" />
        </pattern>
      </defs>

      <rect class="vmap__sea" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#vmap-sea)" />
      <rect class="vmap__waves" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#vmap-waves)" />

      <g ref={gRef} class="vmap__world">
        {NEIGHBOUR_PATHS.map((n) => (
          <path key={n.name} class="vmap__neighbour" d={n.d} />
        ))}

        <path class="vmap__coast-glow" d={VIETNAM_LAND_PATH} />
        <path class="vmap__land" d={VIETNAM_LAND_PATH} />
        <path class="vmap__land-tex" d={VIETNAM_LAND_PATH} fill="url(#vmap-land-tex)" />

        {/* Hoàng Sa – Trường Sa */}
        {archi.map((a) => (
          <g key={a.id} class="vmap__archi" transform={`translate(${a.p[0]} ${a.p[1]})`}>
            {[
              [-10, -6],
              [4, -12],
              [12, 2],
              [-2, 8],
              [-14, 10],
              [8, 14],
            ].map(([dx, dy], i) => (
              <circle key={i} cx={dx} cy={dy} r={1.6 + (i % 3) * 0.5} />
            ))}
            <text class="vmap__archi-label" y={30} text-anchor="middle">
              {a.name[lang]}
            </text>
          </g>
        ))}

        {/* Đường hành trình */}
        <path class="vmap__journey vmap__journey--all" d={journeyAll} />
        {journeyDone && <path class="vmap__journey vmap__journey--done" d={journeyDone} />}
        {journeyNext && <path class="vmap__journey vmap__journey--next" d={journeyNext} />}

        {/* Node */}
        {nodes.map((n, i) => (
          <MapNodeView key={n.site.entityId} node={n} index={i + 1} lang={lang} selected={selectedId === n.site.entityId} onSelect={onSelect} />
        ))}
      </g>
    </svg>
  );
}

function MapNodeView({
  node,
  index,
  lang,
  selected,
  onSelect,
}: {
  node: MapNode;
  index: number;
  lang: Lang;
  selected: boolean;
  onSelect(id: string): void;
}) {
  const { x, y, status, progress, labelSide, site } = node;
  const C = 2 * Math.PI * (NODE_R + 5);
  const labelX = labelSide === 'right' ? NODE_R + 12 : -(NODE_R + 12);
  return (
    <g
      class={`vnode vnode--${status} ${selected ? 'vnode--selected' : ''}`}
      style={{ transform: `translate(${x}px, ${y}px) scale(calc(1 / var(--k, 1)))` }}
      role="button"
      tabIndex={0}
      aria-label={`${t(site.name, lang)} – ${status}`}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(site.entityId);
        }
      }}
    >
      {/* vùng chạm 44px (ẩn) */}
      <circle class="vnode__hit" r={HIT_R} />
      {status === 'next' && <circle class="vnode__pulse" r={NODE_R + 4} />}
      {status === 'next' && <circle class="vnode__pulse vnode__pulse--2" r={NODE_R + 4} />}
      {selected && <circle class="vnode__ring" r={NODE_R + 7} />}
      {status === 'active' && (
        <circle
          class="vnode__progress"
          r={NODE_R + 5}
          stroke-dasharray={`${C * progress} ${C}`}
          transform="rotate(-90)"
        />
      )}
      <circle class="vnode__body" r={NODE_R} />
      {status === 'done' ? (
        <path class="vnode__glyph" d="M-5 0l3.5 3.5L6-4" />
      ) : status === 'locked' ? (
        <path class="vnode__glyph" d="M-3.5 -1v-2a3.5 3.5 0 0 1 7 0v2M-5 -1h10v6h-10z" />
      ) : (
        <text class="vnode__num" text-anchor="middle" dominant-baseline="central">
          {index}
        </text>
      )}
      <text class="vnode__label" x={labelX} text-anchor={labelSide === 'right' ? 'start' : 'end'} dominant-baseline="central">
        {t(site.name, lang)}
      </text>
    </g>
  );
}
