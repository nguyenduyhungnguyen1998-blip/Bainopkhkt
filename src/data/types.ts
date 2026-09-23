/**
 * Hợp đồng dữ liệu của một khu di sản (Site) và các điểm QR bên trong (Spot).
 * Nguồn sự thật là src/data/schema/site.schema.json – tệp này chỉ là kiểu TypeScript tương ứng.
 */

export type Lang = 'vi' | 'en';
export type Localized = Record<Lang, string>;

export type Region = 'bac' | 'trung' | 'nam';
export type ThemeContext = 'lich-su' | 'tu-nhien' | 'tam-linh';

export type CardSize = 'lg' | 'md' | 'sm';

export interface HeroCard {
  type: 'hero';
  size: CardSize;
  image: string;
  caption?: Localized;
}

export interface AspectsCard {
  type: 'aspects';
  size: CardSize;
  aspects: { id: string; title: Localized; body: Localized }[];
}

export interface VideoCard {
  type: 'video';
  size: CardSize;
  /** Link nhúng (YouTube/Vimeo/MP4). Trống = hiện khung poster "sẽ cập nhật". */
  src?: string;
  poster?: string;
  title: Localized;
}

export interface AudioCard {
  type: 'audio';
  size: CardSize;
  /** Văn bản để Web Speech đọc; mỗi phần tử là một câu để tô sáng theo câu. */
  script: Record<Lang, string[]>;
  ambient?: 'wind-water' | 'temple-bell' | 'garden';
}

export interface FactCard {
  type: 'fact';
  size: CardSize;
  icon?: string;
  text: Localized;
}

export interface ImageCard {
  type: 'image';
  size: CardSize;
  image: string;
  caption?: Localized;
}

export type Card = HeroCard | AspectsCard | VideoCard | AudioCard | FactCard | ImageCard;

export interface Source {
  title: string;
  url?: string;
  /** Đã được giáo viên/chuyên gia duyệt chưa – D2 cảnh báo nếu false. */
  reviewed: boolean;
}

export interface Spot {
  spotId: string;
  name: Localized;
  /** [kinh độ, vĩ độ] – tùy chọn cho sơ đồ cấp 2 */
  coords?: [number, number];
  xp: number;
  layoutSchema: Card[];
  sources: Source[];
  quiz?: { q: Localized; options: Localized[]; answer: number; explain?: Localized }[];
}

export interface Site {
  schemaVersion: 1;
  entityId: string;
  name: Localized;
  province: Localized;
  region: Region;
  themeContext: ThemeContext;
  /** [kinh độ, vĩ độ] – dùng cho bản đồ cấp 1 */
  coords: [number, number];
  /** Thứ tự trên đường hành trình Bắc – Nam (1 = điểm đầu) */
  journeyOrder: number;
  heroImage: string;
  summary: Localized;
  gamificationConfig: {
    badge: { id: string; name: Localized; icon: string };
    completionBonusXp: number;
  };
  spots: Spot[];
}
