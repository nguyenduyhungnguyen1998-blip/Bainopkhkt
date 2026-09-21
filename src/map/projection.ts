import { PROJECTION, MAP_WIDTH, MAP_HEIGHT } from './vietnam-geometry';

const { scale, translate } = PROJECTION;
const RAD = Math.PI / 180;

/** Kinh/vĩ độ -> tọa độ SVG, khớp chính xác với phép chiếu Mercator dùng khi sinh geometry. */
export function project(lon: number, lat: number): [number, number] {
  const x = scale * lon * RAD + translate[0];
  const y = -scale * Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) + translate[1];
  return [x, y];
}

/** Tọa độ SVG -> kinh/vĩ độ (dùng cho Map Inspector). */
export function unproject(x: number, y: number): [number, number] {
  const lon = (x - translate[0]) / scale / RAD;
  const lat = (2 * Math.atan(Math.exp(-(y - translate[1]) / scale)) - Math.PI / 2) / RAD;
  return [lon, lat];
}

export const VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;

/** Vị trí ước lệ của hai quần đảo để ghi nhãn trên bản đồ toàn quốc. */
export const ARCHIPELAGOS = [
  { id: 'hoang-sa', name: { vi: 'QĐ. Hoàng Sa', en: 'Paracel Is.' }, lon: 112.0, lat: 16.5 },
  { id: 'truong-sa', name: { vi: 'QĐ. Trường Sa', en: 'Spratly Is.' }, lon: 114.0, lat: 10.0 },
] as const;
