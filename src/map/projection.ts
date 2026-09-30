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

/**
 * Các đảo ven biển nổi tiếng — chấm trang trí cho lãnh thổ hình chữ S sống động.
 * Tọa độ thật (kinh/vĩ); chỉ minh họa, không phải điểm chạm/nội dung.
 */
export const ISLES: { lon: number; lat: number }[] = [
  { lon: 107.95, lat: 20.98 }, // Cô Tô
  { lon: 107.05, lat: 20.78 }, // Cát Bà
  { lon: 107.75, lat: 20.13 }, // Bạch Long Vĩ
  { lon: 107.35, lat: 17.18 }, // Cồn Cỏ
  { lon: 108.5, lat: 15.95 }, // Cù Lao Chàm
  { lon: 109.12, lat: 15.38 }, // Lý Sơn
  { lon: 108.95, lat: 10.53 }, // Phú Quý
  { lon: 106.61, lat: 8.68 }, // Côn Đảo
  { lon: 104.42, lat: 9.68 }, // Nam Du
  { lon: 103.48, lat: 9.3 }, // Thổ Chu
  { lon: 104.01, lat: 10.22 }, // Phú Quốc
];
