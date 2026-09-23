#!/usr/bin/env python3
"""Chèn `explain` vào quiz JSON giữ nguyên formatting (mỗi câu quiz là 1 dòng)."""
import json, pathlib, re, sys

SITES = pathlib.Path("src/data/sites")
EX_PATH = pathlib.Path(__file__).with_name("quiz-explains.json")

explains = json.loads(EX_PATH.read_text(encoding="utf-8"))

for fname, by_spot in explains.items():
    p = SITES / fname
    lines = p.read_text(encoding="utf-8").splitlines()
    cur_spot = None
    qi = 0
    for i, line in enumerate(lines):
        m = re.search(r'"spotId":\s*"([^"]+)"', line)
        if m:
            cur_spot = m.group(1)
            qi = 0
            continue
        if '"answer":' in line:
            ex = by_spot.get(cur_spot, [])
            if qi >= len(ex):
                sys.exit(f"{fname}:{cur_spot}[{qi}] – thiếu explain cho dòng {i+1}")
            e = json.dumps(ex[qi], ensure_ascii=False)
            lines[i] = re.sub(r'("answer":\s*\d+)\s*}', rf'\1, "explain": {e} }}', line, count=1)
            qi += 1
    # kiểm tra đủ
    used = {s: 0 for s in by_spot}
    data = json.loads("\n".join(lines))
    for spot in data["spots"]:
        n = len(spot.get("quiz") or [])
        exp = len(by_spot.get(spot["spotId"], []))
        if exp != n:
            sys.exit(f"{fname}:{spot['spotId']} – {exp} explains vs {n} questions")
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{fname}: ok")
