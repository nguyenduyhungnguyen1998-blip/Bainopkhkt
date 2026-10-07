/** Lưới ô bản đồ chuẩn XYZ (Web Mercator) — dùng chung cho mọi dịch vụ ô bản đồ trực tuyến. */
export const TILE = 256;

export interface TileProvider {
  id: string;
  name: string;
  url: (z: number, x: number, y: number) => string;
  attribution: string;
}

/** Thứ tự gọi: lỗi hoặc quá hạn thì chuyển nguồn kế tiếp; hết nguồn thì dùng bản đồ offline của app. */
export const TILE_PROVIDERS: TileProvider[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    attribution: '© OpenStreetMap contributors',
  },
  {
    id: 'esri',
    name: 'Esri ArcGIS',
    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
    attribution: 'Tiles © Esri',
  },
];

/** Kinh độ, vĩ độ → tọa độ ô (phần nguyên = số ô, phần lẻ = vị trí trong ô). */
export function lonLatToTile(lon: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n,
  };
}
