// Sinh đường viền Việt Nam (SVG path) từ Natural Earth 50m (world-atlas) bằng phép chiếu Mercator.
// Chạy: npm run map:build  -> ghi src/map/vietnam-geometry.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as topojson from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'));
const countries = topojson.feature(topo, topo.objects.countries);
const vn = countries.features.find((f) => f.properties.name === 'Vietnam');
if (!vn) throw new Error('Không tìm thấy Vietnam trong world-atlas');

// Khung bản đồ: kinh độ 101.5–118 (bao gồm Hoàng Sa, Trường Sa), vĩ độ 7–24
const WIDTH = 720, HEIGHT = 1000;
const bbox = { type: 'Polygon', coordinates: [[[101.5, 7], [101.5, 24], [118, 24], [118, 7], [101.5, 7]]] /* chiều kim đồng hồ theo quy ước d3 */ };
const projection = geoMercator().fitSize([WIDTH, HEIGHT], bbox);
projection.clipExtent([[0, 0], [WIDTH, HEIGHT]]);
const path = geoPath(projection);

const round = (s) => s.replace(/(\d+\.\d{2})\d+/g, '$1');
const land = round(path(vn));
const neighbours = countries.features
  .filter((f) => ['Laos', 'Cambodia', 'Thailand', 'China'].includes(f.properties.name))
  .map((f) => ({ name: f.properties.name, d: round(path(f)) }));

const [cx, cy] = projection([105.85, 21.03]);
const out = `// Tệp sinh tự động bởi scripts/build-map.mjs – không sửa tay.
// Phép chiếu: Mercator, fitSize [${WIDTH}, ${HEIGHT}] cho khung kinh độ 101.5–118, vĩ độ 7–24.
export const MAP_WIDTH = ${WIDTH};
export const MAP_HEIGHT = ${HEIGHT};
export const PROJECTION = { scale: ${projection.scale()}, translate: [${projection.translate().join(', ')}] as [number, number] };
export const VIETNAM_LAND_PATH = ${JSON.stringify(land)};
export const NEIGHBOUR_PATHS: { name: string; d: string }[] = ${JSON.stringify(neighbours)};
// Kiểm tra: Hà Nội (105.85, 21.03) -> (${cx.toFixed(1)}, ${cy.toFixed(1)})
`;
writeFileSync('src/map/vietnam-geometry.ts', out);
console.log(`OK: land path ${land.length} ký tự, ${neighbours.length} nước láng giềng, Hà Nội -> ${cx.toFixed(1)},${cy.toFixed(1)}`);
