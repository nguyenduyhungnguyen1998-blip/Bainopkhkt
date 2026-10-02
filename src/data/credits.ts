/**
 * Sổ ghi công nguồn ảnh — bản chính trong app (Cài đặt → Nguồn tư liệu & hình ảnh)
 * và nút ⓘ dưới mỗi ảnh. Giữ đồng bộ với public/img/ATTRIBUTION.md.
 * Key = đường dẫn ảnh tương đối như trong dữ liệu site ("/img/…webp").
 */
export interface Credit {
  /** Tên tác giả / chủ sở hữu. */
  author: string;
  /** Giấy phép (CC0, CC BY…) hoặc "Tư liệu nội bộ". */
  license: string;
  /** Link tới văn bản giấy phép. */
  licenseUrl?: string;
  /** Nguồn gốc (vd. tên file trên Wikimedia Commons / tên video). */
  source: string;
  /** Link tới trang nguồn gốc (thường là trang File: trên Commons). */
  sourceUrl?: string;
  /** Ghi chú chỉnh sửa/cắt nếu có (yêu cầu của một số giấy phép CC). */
  note?: { vi: string; en: string };
}

const CC = (path: string) => `https://creativecommons.org/licenses/${path}/deed.vi`;
const PD0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

const wm = (author: string, license: string, licenseUrl: string | undefined, file: string, note?: Credit['note']): Credit => ({
  author,
  license,
  licenseUrl,
  source: 'Wikimedia Commons',
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}`,
  note,
});

const khkt = (noteVi: string, noteEn: string): Credit => ({
  author: 'Nhóm KHKT',
  license: 'Tư liệu nội bộ',
  source: 'Video "Kiến trúc" (nhóm dự thi tự quay/biên tập)',
  note: { vi: noteVi, en: noteEn },
});

const khktDoc = (noteVi: string, noteEn: string): Credit => ({
  author: 'Văn Miếu – Quốc Tử Giám',
  license: 'Tư liệu nội bộ',
  source: 'Tài liệu "Kiến Trúc Văn Miếu" (kênh KHKT, nguồn ảnh: ban quản lý di tích)',
  note: { vi: noteVi, en: noteEn },
});

export const IMAGE_CREDITS: Record<string, Credit> = {
  // Dinh Độc Lập
  '/img/dinh-doc-lap/cong-chinh.webp': wm('Balon Greyjoy', 'CC0', PD0, '20190923_Independence_Palace-10.jpg'),
  '/img/dinh-doc-lap/hero.webp': wm('Balon Greyjoy', 'CC0', PD0, '20190923_Independence_Palace-1.jpg'),
  // Vịnh Hạ Long
  '/img/ha-long/hang-sung-sot.webp': wm('YangChen(TW)', 'CC BY 2.0', CC('by/2.0'), 'Hang_s%E1%BB%ADng_s%E1%BB%91t_(41120154705).jpg'),
  '/img/ha-long/hero.webp': wm('Mustang Joe', 'CC0', PD0, 'H%E1%BA%A1_Long_Bay_Panorama,_Vietnam.jpg'),
  // Huế
  '/img/hue/hero.webp': wm('Esmée Winnubst', 'CC BY 2.0', CC('by/2.0'), '4.4_Hue-4_(35792380034).jpg'),
  '/img/hue/ngo-mon.webp': wm('Viault', 'CC BY-SA 3.0', CC('by-sa/3.0'), 'Hue_433.jpg'),
  // Mỹ Sơn
  '/img/my-son/hero.webp': wm('shankar s.', 'CC BY 2.0', CC('by/2.0'), 'A_far_view_of_the_ruins_at_My_Son_(30992152933).jpg'),
  '/img/my-son/nhom-thap-b.webp': wm('Philip Nalangan', 'CC BY 4.0', CC('by/4.0'), 'My_Son_Sanctuary_Vietnam_02.jpg'),
  // Văn Miếu – Quốc Tử Giám (Commons)
  '/img/van-mieu/bia-tien-si.webp': wm('Daderot', 'CC0', PD0, 'Stelae_of_Doctors_-_Temple_of_Literature,_Hanoi_-_DSC04561.JPG'),
  '/img/van-mieu/chu-van-an.webp': wm('shankar s.', 'CC BY 2.0', CC('by/2.0'), 'Display_in_the_upper_chambers_of_the_Temple_of_Literature_(31454117685).jpg', {
    vi: 'Điện thờ Chu Văn An, Nhà Thái Học',
    en: 'Altar of Chu Văn An, Thái Học hall',
  }),
  '/img/van-mieu/hero.webp': wm('Jakub Hałun', 'CC BY 4.0', CC('by/4.0'), 'Main_gate_of_the_Temple_of_Literature,_Hanoi,_Vietnam,_20240123_0929_3068.jpg'),
  '/img/van-mieu/khue-van-cac.webp': wm('Xiquinho Silva', 'CC BY 2.0', CC('by/2.0'), 'Constellation_of_Literature_pavilion_-_Temple_of_Literature,_Hanoi_(32342168616).jpg'),
  '/img/van-mieu/khong-tu.webp': wm('Dennis G. Jarvis', 'CC BY-SA 2.0', CC('by-sa/2.0'), 'DGJ_1722_-_The_main_man_here..._Confucius_(3506507631).jpg', {
    vi: 'Tượng Khổng Tử, điện Đại Thành',
    en: 'Confucius statue, Đại Thành hall',
  }),
  '/img/van-mieu/nha-thai-hoc-altar.webp': wm('Gryffindor', 'CC BY-SA 3.0', CC('by-sa/3.0'), 'Van_Mieu_Hanoi_23.jpg', {
    vi: 'Điện thờ vua Lý Nhân Tông, Nhà Thái Học',
    en: 'Altar of Emperor Lý Nhân Tông, Thái Học hall',
  }),
  '/img/van-mieu/tu-phoi-1.webp': wm('shankar s.', 'CC BY 2.0', CC('by/2.0'), 'Subsidiary_figures_in_the_Confucius_temple_(31083337790).jpg', {
    vi: 'Cắt từ ảnh chụp nhóm tượng phụ trong điện Khổng Tử (nửa trái)',
    en: 'Left half cropped from a photo of the subsidiary statue set',
  }),
  '/img/van-mieu/tu-phoi-2.webp': wm('shankar s.', 'CC BY 2.0', CC('by/2.0'), 'Subsidiary_figures_in_the_Confucius_temple_(31083337790).jpg', {
    vi: 'Cắt từ ảnh chụp nhóm tượng phụ trong điện Khổng Tử (nửa phải)',
    en: 'Right half cropped from a photo of the subsidiary statue set',
  }),
  '/img/van-mieu/van-mieu-mon.webp': wm('Trung geo', 'CC BY-SA 4.0', CC('by-sa/4.0'), 'V%C4%83n_Mi%E1%BA%BFu_M%C3%B4n_VMQTG.jpg'),
  '/img/van-mieu/vuon-giam.webp': wm('Chuhai07', 'CC0', PD0, 'V%C4%83n_Mi%E1%BA%BFu_%E2%80%93_Qu%E1%BB%91c_T%E1%BB%AD_Gi%C3%A1m_(20).jpg'),
  // Văn Miếu – frame trích từ video tư liệu của nhóm
  '/img/van-mieu/vuon-giam-bat-giac.webp': khkt('Nhà bát giác / khuôn viên Vườn Giám', 'Octagonal pavilion / Giám gardens'),
  '/img/van-mieu/vuon-giam-duong-di.webp': khkt('Đường đi trong Vườn Giám', 'Walkway inside the Giám gardens'),
  '/img/van-mieu/vuon-giam-canh-quan.webp': khkt('Cảnh quan cây xanh Vườn Giám', 'Greenery of the Giám gardens'),
  '/img/van-mieu/kvc-gac-cau-doi.webp': khkt('Gác Khuê Văn Các nhìn cận', 'Khuê Văn pavilion close-up'),
  '/img/van-mieu/kvc-qua-dai-trung-mon.webp': khkt('Khuê Văn Các bên giếng Thiên Quang', 'Khuê Văn pavilion beside Thiên Quang well'),
  '/img/van-mieu/toan-canh-tren-cao.webp': khkt('Toàn cảnh Văn Miếu từ trên cao', 'Aerial view of the complex'),
  '/img/van-mieu/toan-canh-truc-chinh.webp': khkt('Toàn cảnh trục chính Văn Miếu', 'Main axis of the complex'),
  '/img/van-mieu/bia-nha-bia-gieng.webp': khkt('Nhà bia và Giếng Văn', 'Stelae house and Văn well'),
  '/img/van-mieu/bia-rua-doc-bia.webp': khkt('Bia rùa đội bia tiến sĩ', 'Turtle stela close-up'),
  '/img/van-mieu/so-do-van-mieu.webp': khktDoc('Sơ đồ tham quan di tích chính thức', 'Official visitor map of the complex'),
  '/img/van-mieu/tien-an-tu-tru.webp': khktDoc('Bốn trụ gạch và bia Hạ mã Khu Tiền Án', 'Tien An brick pillars and dismount steles'),
  '/img/van-mieu/thai-hoc-san.webp': khktDoc('Sân khu Thái Học với nhà chuông – nhà trống', 'Thai Hoc courtyard with bell and drum houses'),
  '/img/van-mieu/dai-thanh-dien.webp': khktDoc('Điện Đại Thành nhìn từ sân Đại Bái', 'Dai Thanh hall from the courtyard'),
  '/img/van-mieu/nhap-dao-duong.webp': khktDoc('Đường Nhập Đạo ra cổng Đại Trung', 'Nhap Dao path toward Dai Trung gate'),
  '/img/van-mieu/ho-van-kim-chau.webp': khktDoc('Hồ Văn – gò Kim Châu và Phương Đình', 'Van Lake, Kim Chau mound and Phuong Dinh'),
  '/img/van-mieu/ba-vua-tang-tren.webp': khkt('Ban thờ ba vua tầng trên Hậu Đường (trích clip Thái Học)', 'Three kings altar, upper floor (Thai Hoc clip frame)'),
};
