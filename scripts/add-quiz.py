#!/usr/bin/env python3
"""Chèn câu hỏi quiz (one-line JSON theo style sẵn có) vào src/data/sites/*.json.
Idempotent theo spotId: bỏ qua spot đã đủ câu (>= len(new))."""
import json, re, sys
from pathlib import Path

SITES = Path(__file__).resolve().parent.parent / 'src/data/sites'

def fmt_q(q_vi, q_en, opts, ans):
    o = ', '.join('{ "vi": %s, "en": %s }' % (json.dumps(v, ensure_ascii=False), json.dumps(e, ensure_ascii=False)) for v, e in opts)
    return '        { "q": { "vi": %s, "en": %s }, "options": [%s], "answer": %d }' % (
        json.dumps(q_vi, ensure_ascii=False), json.dumps(q_en, ensure_ascii=False), o, ans)

QUIZZES = {
    'van-mieu': {
        'van-mieu-mon': [
            ("Lối đi giữa của cổng Văn Miếu Môn xưa dành cho ai?", "Who was the central path of the Great Portico reserved for?",
             [("Quan lại", "Mandarins"), ("Vua", "The king"), ("Học trò", "Students"), ("Sư thầy", "Monks")], 1),
            ("Đôi rồng đá hai bên cổng mang phong cách thời nào?", "Which dynasty's style are the stone dragons beside the gate?",
             [("Lý", "Ly"), ("Trần", "Tran"), ("Lê", "Le"), ("Nguyễn", "Nguyen")], 2),
            ("Khu di tích Văn Miếu – Quốc Tử Giám rộng khoảng bao nhiêu?", "Roughly how large is the Temple of Literature complex?",
             [("5.400 m²", "5,400 m²"), ("54.000 m²", "54,000 m²"), ("540.000 m²", "540,000 m²"), ("5.400.000 m²", "5,400,000 m²")], 1),
            ("Khu di tích được chia thành mấy lớp sân?", "How many successive courtyards is the complex divided into?",
             [("3", "3"), ("4", "4"), ("5", "5"), ("7", "7")], 2),
        ],
        'khue-van-cac': [
            ("Khuê Văn Các được xây dựng vào năm nào?", "When was Khue Van Pavilion built?",
             [("1070", "1070"), ("1484", "1484"), ("1805", "1805"), ("1945", "1945")], 2),
            ("Tên Khuê Văn Các lấy từ đâu?", "What does the name Khue Van Cac refer to?",
             [("Sao Khuê chủ về văn học", "Khue, the star of literature"), ("Tên một vị vua", "A king's name"), ("Tên học giả", "A scholar's name"), ("Tên dòng sông", "A river's name")], 0),
            ("Bốn cửa sổ tròn của Khuê Văn Các tượng trưng cho điều gì?", "What do the four round windows symbolise?",
             [("Ánh sáng tri thức tỏa bốn phương", "The light of knowledge radiating in all directions"), ("Bốn mùa", "Four seasons"), ("Bốn hướng đền", "Four shrine directions"), ("Bốn vị vua", "Four kings")], 0),
            ("Khuê Văn Các xuất hiện trên mệnh giá tiền nào?", "On which banknote does Khue Van Pavilion appear?",
             [("10.000 đồng", "10,000 dong"), ("50.000 đồng", "50,000 dong"), ("100.000 đồng", "100,000 dong"), ("500.000 đồng", "500,000 dong")], 2),
        ],
        'bia-tien-si': [
            ("Bia Tiến sĩ đầu tiên được dựng năm nào?", "When was the first doctor's stele erected?",
             [("1070", "1070"), ("1484", "1484"), ("1805", "1805"), ("1945", "1945")], 1),
            ("Mỗi tấm bia được đặt trên lưng con vật nào?", "Each stele rests on which animal?",
             [("Rồng", "A dragon"), ("Rùa", "A turtle"), ("Nghê", "A nghe"), ("Phượng", "A phoenix")], 1),
            ("82 tấm bia ghi tên bao nhiêu tiến sĩ?", "How many laureates are recorded on the 82 steles?",
             [("82", "82"), ("304", "304"), ("1.304", "1,304"), ("2.304", "2,304")], 2),
            ("Vì sao khách không nên xoa đầu rùa?", "Why should visitors not rub the turtles' heads?",
             [("Vì rùa linh thiêng", "Turtles are sacred"), ("Vì làm mòn di sản hàng trăm năm tuổi", "It erodes centuries-old heritage"), ("Vì mất may mắn", "It brings bad luck"), ("Vì quy định tôn giáo", "Religious rules")], 1),
        ],
        'dai-thanh-mon': [
            ("Điện Đại Thành là nơi thờ ai?", "Who is worshipped in the Dai Thanh Sanctuary?",
             [("Vua Lý Thánh Tông", "King Ly Thanh Tong"), ("Khổng Tử", "Confucius"), ("Chu Văn An", "Chu Van An"), ("Phật Thích Ca", "Buddha")], 1),
            ("'Tứ Phối' là gì?", "What is 'Tu Phoi' (the Four Sages)?",
             [("Bốn học trò xuất sắc của Khổng Tử", "Confucius' four most distinguished disciples"), ("Bốn vị vua nhà Lý", "Four Ly kings"), ("Bốn vị quan triều Lê", "Four Le mandarins"), ("Bốn khoa thi", "Four exams")], 0),
            ("Hệ cột của Điện Đại Thành làm bằng gỗ gì?", "What wood are the sanctuary's pillars made of?",
             [("Gỗ lim", "Ironwood"), ("Gỗ dổi", "Dau wood"), ("Gỗ mít", "Jackfruit wood"), ("Gỗ sến", "Sindora")], 0),
            ("Kiến trúc điện Đại Thành theo lối thời nào?", "Which dynasty's style is the sanctuary built in?",
             [("Lý", "Ly"), ("Trần", "Tran"), ("Hậu Lê", "Later Le"), ("Nguyễn", "Nguyen")], 2),
            ("Học sinh Hà Nội đến Điện Đại Thành dâng hương khi nào?", "When do Hanoi students offer incense here?",
             [("Tết Nguyên Đán", "Lunar New Year"), ("Trước mỗi mùa thi", "Before each exam season"), ("Rằm hằng tháng", "Every full moon"), ("Ngày Quốc khánh", "National Day")], 1),
        ],
        'nha-thai-hoc': [
            ("Khu Thái Học xưa là nơi đặt trường nào?", "Which school stood in the Thai Hoc area?",
             [("Trường Sùng Chính", "Sung Chinh school"), ("Quốc Tử Giám", "Quoc Tu Giam (Imperial Academy)"), ("Trường Giảng võ", "Giang Vo hall"), ("Trường Hải đồ", "Hai Dong school")], 1),
            ("Nhà Thái Học hiện nay được xây lại năm nào?", "When was the current Thai Hoc house rebuilt?",
             [("1076", "1076"), ("1805", "1805"), ("1954", "1954"), ("2000", "2000")], 3),
            ("Tầng trên nhà Thái Học thờ mấy vị vua?", "How many kings are worshipped upstairs?",
             [("2", "2"), ("3", "3"), ("4", "4"), ("5", "5")], 1),
            ("Tầng dưới thờ ai – người thầy tiêu biểu của nền giáo dục Việt?", "Who is worshipped downstairs, Vietnam's exemplary teacher?",
             [("Chu Văn An", "Chu Van An"), ("Nguyễn Trãi", "Nguyen Trai"), ("Lê Quý Đôn", "Le Quy Don"), ("Nguyễn Bỉnh Khiêm", "Nguyen Binh Khiem")], 0),
            ("Chu Văn An từng giữ chức gì ở Quốc Tử Giám?", "What post did Chu Van An hold at the Imperial Academy?",
             [("Tế tửu", "Libationer (rector)"), ("Tư nghiệp", "Director (Tu nghiep)"), ("Chưởng ấn", "Seal keeper"), ("Hàn lâm", "Hanlin academician")], 1),
        ],
    },
    'ha-long': {
        'hang-sung-sot': [
            ("Hang Sửng Sốt nằm trên đảo nào?", "Which island is Sung Sot Cave on?",
             [("Đảo Bồ Hòn", "Bo Hon Island"), ("Đảo Cát Bà", "Cat Ba Island"), ("Đảo Tuần Châu", "Tuan Chau Island"), ("Đảo Cô Tô", "Co To Island")], 0),
            ("Hang Sửng Sốt rộng khoảng bao nhiêu?", "Roughly how large is Sung Sot Cave?",
             [("1.000 m²", "1,000 m²"), ("10.000 m²", "10,000 m²"), ("100.000 m²", "100,000 m²"), ("1.000.000 m²", "1,000,000 m²")], 1),
            ("Tên Hạ Long nghĩa là gì?", "What does 'Ha Long' mean?",
             [("Rồng bay lên", "Ascending dragon"), ("Rồng hạ xuống", "Descending dragon"), ("Rồng nằm nghỉ", "Resting dragon"), ("Rồng đá", "Stone dragon")], 1),
        ],
    },
    'hue': {
        'ngo-mon': [
            ("Ngọ Môn được xây năm nào, dưới triều vua nào?", "When was Ngo Mon built, under which king?",
             [("1802 – Gia Long", "1802 – Gia Long"), ("1833 – Minh Mạng", "1833 – Minh Mang"), ("1945 – Bảo Đại", "1945 – Bao Dai"), ("1070 – Lý Thánh Tông", "1070 – Ly Thanh Tong")], 1),
            ("Sự kiện nào diễn ra tại Ngọ Môn ngày 30/8/1945?", "What happened at Ngo Mon on 30 August 1945?",
             [("Vua Bảo Đại đọc chiếu thoái vị", "King Bao Dai read the abdication edict"), ("Khánh thành Ngọ Môn", "Inauguration of Ngo Mon"), ("Lễ mở hội", "A festival"), ("Đăng quang vua mới", "A coronation")], 0),
            ("Lầu Ngũ Phụng trên Ngọ Môn có bao nhiêu cột?", "How many columns does the Five Phoenix Pavilion have?",
             [("50", "50"), ("82", "82"), ("100", "100"), ("120", "120")], 2),
        ],
    },
    'my-son': {
        'nhom-thap-b': [
            ("Mỹ Sơn là trung tâm tôn giáo của vương quốc nào?", "My Son was the religious centre of which kingdom?",
             [("Chăm Pa", "Champa"), ("Khmer", "Khmer Empire"), ("Đại Việt", "Dai Viet"), ("Phù Nam", "Funan")], 0),
            ("Các tháp Mỹ Sơn thờ thần nào?", "Which deity are the My Son towers dedicated to?",
             [("Vishnu", "Vishnu"), ("Shiva (Bhadresvara)", "Shiva (Bhadresvara)"), ("Phật", "Buddha"), ("Brahma", "Brahma")], 1),
            ("Điều đặc biệt trong kỹ thuật xây tháp Mỹ Sơn là gì?", "What is special about My Son's construction technique?",
             [("Gạch nung không thấy mạch vữa", "Fired bricks with invisible mortar"), ("Toàn đá ong", "All basalt stone"), ("Toàn gỗ lim", "All ironwood"), ("Cột đồng", "Bronze pillars")], 0),
        ],
    },
    'dinh-doc-lap': {
        'cong-chinh': [
            ("Dinh Độc Lập hiện nay do kiến trúc sư nào thiết kế?", "Who designed the current Independence Palace?",
             [("Ngô Viết Thụ", "Ngo Viet Thu"), ("Võ Trọng Nghĩa", "Vo Trong Nghia"), ("Ernest Hébrard", "Ernest Hebrard"), ("Nguyễn Cao Luyện", "Nguyen Cao Luyen")], 0),
            ("Dinh khánh thành năm nào?", "When was the palace inaugurated?",
             [("1954", "1954"), ("1966", "1966"), ("1975", "1975"), ("1945", "1945")], 1),
            ("Trưa 30/4/1975, điều gì xảy ra tại cổng chính?", "What happened at the main gate at noon on 30 April 1975?",
             [("Xe tăng Quân Giải phóng tiến qua", "Liberation Army tanks crashed through"), ("Lễ khánh thành", "An inauguration"), ("Cuộc diễu hành", "A parade"), ("Mít tinh", "A rally")], 0),
        ],
    },
}

def insert_into_spot(lines, spot_id, new_lines):
    # Tìm block spot: '      "spotId": "<id>"' -> dòng '    }' tiếp theo.
    start = next(i for i, l in enumerate(lines) if f'"spotId": "{spot_id}"' in l)
    end = next(i for i in range(start, len(lines)) if lines[i].startswith('    }'))
    quiz_idx = next((i for i in range(start, end) if '"quiz"' in lines[i]), None)
    if quiz_idx is not None:
        close = next(i for i in range(quiz_idx, end) if lines[i].strip() in (']', '],'))
        # phần tử cuối hiện có cần thêm comma
        last_item = next(i for i in range(close - 1, quiz_idx, -1) if lines[i].strip().startswith('{'))
        lines[last_item] = lines[last_item].rstrip() + ','
        lines[close:close] = [l + ',' if k < len(new_lines) - 1 else l for k, l in enumerate(new_lines)]
        return
    # chưa có quiz: thêm sau mảng "sources" của spot — dòng chứa key (có thể one-line)
    src = next(i for i in range(start, end) if '"sources"' in lines[i])
    if lines[src].rstrip().endswith((']', '],')):
        src_close = src
    else:
        src_close = next(i for i in range(src, end) if lines[i].strip() in (']', '],'))
    lines[src_close] = lines[src_close].rstrip().rstrip(',') + ','
    body = ['      "quiz": ['] + [l + ',' if k < len(new_lines) - 1 else l for k, l in enumerate(new_lines)] + ['      ]']
    lines[src_close + 1:src_close + 1] = body

for fname, spots in QUIZZES.items():
    path = SITES / f'{fname}.json'
    lines = path.read_text(encoding='utf8').splitlines()
    for spot_id, qs in spots.items():
        new_lines = [fmt_q(*q) for q in qs]
        insert_into_spot(lines, spot_id, new_lines)
    path.write_text('\n'.join(lines) + '\n', encoding='utf8')
    print(fname, 'updated')

# kiểm lại json hợp lệ
for fname in QUIZZES:
    d = json.loads((SITES / f'{fname}.json').read_text(encoding='utf8'))
    for s in d['spots']:
        print(fname, s['spotId'], 'quiz =', len(s.get('quiz', [])))
