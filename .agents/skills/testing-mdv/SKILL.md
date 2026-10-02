---
name: testing-mdv
description: E2E test conventions for the Mở Dấu Việt Preact PWA — dev server, CDP emulation, real QR boot, progress module gotchas, offline SW testing, input dispatch quirks.
---

# Testing Mở Dấu Việt (mo-dau-viet PWA)

## Environment
- Repo: `/home/ubuntu/repos/Bainopkhkt`. Dev server: `npm run dev -- --port 5173` (check `curl localhost:5173` first).
- Chrome headful with CDP on `localhost:29229` (`/json` → page ws). Python `websocket-client` (needs `suppress_origin=True`).
- Physical window shows ~561 CSS px at DSF=2 → emulate **390×560** (`Emulation.setDeviceMetricsOverride`) so bottom-anchored UI (sheets/dock/FAB) is visible in recordings. `Page.captureScreenshot` still captures the full emulated viewport.
- Mobile-viewport geometry checks belong at 390px; layout math differs at 844 — measure BOTH before calling something a bug.

## Baseline state
- `localStorage`: `mdv.lang='vi'`, `mdv.seen`, `mdv.hintDone`, `mdv.welcomed` (set BEFORE scanning `?s=`/`?q=` URLs — else ScanConfirm shows the language gate first).
- Reset progress: `import(...).then(m=>m.resetProgress())` — see module-URL gotcha below.

## Module gotchas (important)
- **Progress lives in IndexedDB `mdv-progress`, NOT localStorage.** `localStorage.clear()` does not reset progress.
- **Vite `?t=` versioning splits module instances.** After HMR, the app imports `src/lib/progress.ts?t=<ts>` while a bare `import('/src/lib/progress.ts')` creates a SECOND, empty module record — `getProgress()` then reads a fresh EMPTY state even though the app unlocked spots. Always resolve the app's real URL:
  `performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('src/lib/progress.ts')).filter(n=>n.includes('?t=')).pop()` then `import(that)`. Same for `src/data/content.ts` (`m.getSpot(site,spot).spot` — returns `{site,spot}`, not the spot itself).
- On a **prod build** there are no `/src/*.ts` modules — read progress via IDB or UI only.

## QR testing
- Real tags from `public/qr-sheet.html`: compact `/?q=NN.SIG` (qrId `mdvqNN`) and old `?d=site/spot&s=SIG` — both resolve via `resolveQrRedirect` to `#/d/site/spot?s=sig`. Unknown qrId → no redirect (lands on map).
- ScanConfirm: `.dpick` = valid (aspects + CTA "Nhận dấu & xem tổng quan (+N XP)"); `.dscan--bad` = invalid; missing `s` → no panel. Re-scan → "Bạn đã nhận dấu điểm này rồi — không cộng XP lần nữa" + CTA "Vào trang điểm".
- On a **fresh origin** (e.g. prod build on :8080) expect the language gate inside `.dscan` first.
- Unlock toast `.dtoast__txt` "Đã nhận dấu: <name>+<xp> XP · Tổng <total> XP" (+ possible badge suffix).

## Input dispatch quirks (CDP)
- Clicks at `getBoundingClientRect` centers via `Input.dispatchMouseEvent` (real pointer pipeline).
- **Clicks outside the emulated viewport silently no-op** — `scrollIntoView({block:'center'})`, re-fetch rect, then click.
- **Short-viewport occlusion**: at ≤560px the `.mdv-dock` covers the `.dscan__cta` bottom (dock y478-544 vs CTA y484-524). Scroll `.dpick__panel` to bottom first, then click the CTA's uncovered top sliver (`dock.top - 4`). NOT a bug at 844.
- **Keyboard activation**: Enter/Space on a button fires `click` with `detail===0`. `Input.dispatchKeyEvent` type `rawKeyDown` does NOT run default actions — use `keyDown`. Enter clicks on keyDOWN, Space on keyUP. The demo FAB toggles via `e.detail===0` clicks.

## Offline / prod build
- `npm run build -- --base=/Bainopkhkt/` (base REQUIRED for SW/precache paths) → `ln -sfn dist /tmp/serve/Bainopkhkt` → `python3 -m http.server 8080 -d /tmp/serve`. SW: `getRegistration().active` + `controller` before going offline.
- `Network.emulateNetworkConditions{offline:true}` works fine WITH an active SW — `caches.match` runs inside the worker, not the network. qr-sheet.html serves (precached, 10 inline SVG QRs), `?q=` URLs get index.html via OFFLINE_URL → full scan→verify→stamp works offline (WebCrypto needs no network).
- Block a resource class with `Network.setBlockedURLs` (e.g. `*m4a*` → exercises the audio-error → TTS-fallback path). Unblock with `urls:[]` after.

## TTS / voices
- Box has **0 TTS voices** → real "Nghe" lands in `failed` fallback. For durable `playing`: `speechSynthesis.speak=u=>{window.__utt=u;setTimeout(()=>!u.__dead&&u.onstart&&u.onstart(),30)}; cancel=()=>{if(window.__utt)window.__utt.__dead=true}; pause=resume=()=>{}`.
- Playing state: `.dcard__playbtn` text "Tạm dừng" + aria-pressed, `.dcard__script[data-reading]`, progressbar valuenow>0.

## Demo dock / admin
- Enable: visit `#/admin` (mount calls `enableDemoDock` → `mdv.admin` LS flag). FAB `.demodock__fab` (tap toggles; keyboard via detail===0 click). Panel `.demodock__panel`; ctx `.dd__ctx` + `.dd__fold` (▸/▾, `--fold` class). ConfirmSheet `.confirm__card[role=alertdialog]` — Esc/Hủy/confirm; NOT a browser dialog. Achievements under "XP" tab (`●`/`○` + "Thu hồi"/"Đạt luôn").
- `relockAll` refunds each spot's raw `spot.xp` (NOT badge bonuses) — "Gỡ hết" on N stamped spots → xp drops by sum of raw xp; quizDone + badges kept.
- **Known bug observed 2025-10**: `defaultPos` (innerHeight-156) overlaps the map counter (~32×25px) at 560 AND 844 — verify it got fixed before asserting FAB clears the counter.

## Celebrate / achievements
- `mdv:achievement` → `.mbadge` banner "Huy hiệu mới: <name>" (+ `.celebrate` confetti). Fire order seen: Khởi hành (1st stamp) → Lữ khách (3rd) → Sĩ tử Thăng Long (site complete, +100 bonus XP) → Trạng nguyên (perfect quiz). Site badge bonus counts in toast XP but is NOT refunded by relockAll.
- Quiz UI: `.quiz__opt` (shuffled per play via `orders`), `.quiz__mark` Đúng!/mark, next button `.mdv-card .mdv-btn--primary`, done `.quiz__result` + "Chơi lại" (reshuffles). Record DOM order of a question's options across plays to prove shuffle (4 opts → P(same)=1/24; draw ≥3).

## Phase-F additions (verified on prod build)
- **DemoDock FAB rendering**: FAB (.demodock__fab) only mounts when localStorage `mdv.admin` is set (via #/admin or manually) — `?debug=1` works ONLY before the hash (`/?debug=1#/map`), not inside (`#/map?debug=1` silently does nothing). FAB also mounts ~200ms after the map renders — wait before measuring rects.
- **ExploreDirectory narration**: intro-page chips are `.xplr__item .mdv-chip` ("Nghe"/"Tạm dừng"), but the spot-page narration button is a plain `<button>` inside `.dcard--audio` — different selector.
- **Settings "Xóa bộ nhớ đệm"**: opens a ConfirmSheet first ("Xóa bộ nhớ đệm và tải lại?" → Hủy / Xóa & tải lại); confirm posts CLEAR_CACHES → drops ALL versioned caches down to just current `mdv-pre-*` + reloads.
- **SW update toast**: "Có bản cập nhật mới / Cập nhật" appears when a new sw.js is detected while an old worker controls; clicking activates+reloads; toast self-clears once new worker is active. Old-version caches only purge on activate.
- **Full-page screenshots**: `Page.captureScreenshot{captureBeyondViewport:true}` stitches fixed elements (dock, toasts) into one mid-page position — that's a capture artifact, not a layout bug. Slice tall PNGs with PIL (`im.crop`) into ~viewport-height chunks to eyeball.
- **Spot-page aspect tabs**: aria-pressed marks the active tab in `.dcard--aspects`/`dcard__tabs` buttons; `?a=<id>` in the URL deep-links to that tab (ExploreDirectory "Đến điểm QR" links rely on it).
- **QR stamp check**: real sig `?q=NN.SIG` → dpick → "Vào trang điểm" CTA stamps immediately (IDB-verified); plain spot visits with no `?s=` never stamp (verified IDB-identical before/after).

## Phase-G additions (verified on prod build)
- **Grid overflow bug pattern**: `display:grid` with implicit `auto` columns or `1fr` tracks + a `white-space:nowrap` descendant → the track min bound is `auto`/`min-content` = the ENTIRE nowrap line → rows overflow at EVERY viewport. `1fr` means `minmax(auto,1fr)`; the fix needs `minmax(0,1fr)` tracks plus `min-width:0` on children. Diagnostic: compare `document.documentElement.scrollWidth` vs `innerWidth`, then list the widest elements via `[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().width>innerWidth-30)`.
- **Occlusion debugging**: when a dispatched click inside a button's rect doesn't fire, `document.elementFromPoint(x,y)` shows what actually receives it (e.g. `.mdv-dock` covered the ScanConfirm CTA at 560px — click the sliver above `dock.top` (~y470), not the button center).
- **scrollY after DOM swap is the clamped value**: reading `window.scrollY` in a post-commit effect returns scrollY clamped to the NEW document's max — a "save scroll then restore" pattern that saves inside the same commit as the layout change saves the wrong (clamped) value. Verify restores by measuring scrollY at the click moment.
- **`?q=NN.sig` resolves qrId `mdvqNN` globally** — a sig belonging to another site's tag number lands on that site's spot with `.dscan--bad` (correct refusal). Brief/task QR shorthand like "?q=03" may not match the intended spot — always map via `src/data/sites/*.json` qrId fields.
- **`?lang=en` URL param does NOT switch language** — lang comes from `mdv.lang` localStorage or the `.dintro__langs` header chips (Tiếng Việt/English). Test EN equivalence by clicking the chip, not the URL.
- **CDP emulation flake**: `Emulation.setDeviceMetricsOverride` can silently not apply (innerWidth stays at window size, or is left from a previous override) — always verify `innerWidth` after emul and re-apply per ws session; websockets also time out on long navigate sequences — reconnect and retry.
- **ScanConfirm sig lifecycle**: on unlock the toast keeps `?s` in the URL (sig drops only via the toast's ✕ `dropSig`), while the bad-sig ✕/Esc drops it immediately. Reloading with `?s` retained shows the "đã nhận" variant — expected.
- **Stale-asset verification trap**: python http.server + heuristic HTTP cache can serve an OLD index.html, and a WAITING service worker keeps the OLD runtime cache → the page runs the previous build entirely (css hash mismatch proves it: check `document.styleSheets` hrefs vs `dist/assets/`). Always verify-fix with a cache-busting navigation (`?cb=<ts>` before the hash) or clear SW+caches first — otherwise you'll report a fixed bug as still broken.
- **Grid fix can leave residual spill**: bounding the track with `minmax(0,1fr)` doesn't stop flex children overflowing the row — non-shrinkable chips (`flex:none`) + long nowrap titles still spill past the row edge at narrow widths. Also check row-level `overflow`/`min-width:0`+ellipsis on the title, and re-check `scrollWidth` per-branch (widest chip variant = worst case).
- **Mobile viewport shrink-to-fit**: when content overflows a `width=device-width` page, `innerWidth` can report > device width (browser zooms out to fit) — scrollW==innerW at an inflated value still means overflow happened; compare against the emulated width, not innerWidth.
- **CDP ws flake/restart**: page-target websockets stall intermittently after many navigate+emul cycles (navigate lands but response never arrives — zombie ws with Page/Runtime enabled flood the pipe). Recover via browser-level ws (`/json/version` → flat `Target.attachToTarget` + sessionId-scoped commands) or `PUT /json/new?url` to open a fresh target. Do NOT `GET /json/close` on every page — closing the last tab KILLS Chrome entirely. Relaunch: `/opt/.devin/chrome/chrome/linux-*/chrome-linux64/chrome --user-data-dir=/home/ubuntu/.browser_data_dir --remote-debugging-port=29229 --no-first-run --start-maximized <url>` — profile keeps IDB/localStorage (stamps persist).
- **z-index stacking-context trap (mdv app)**: `.mdv-screen` is `position:relative;z-index:1` — ANY overlay rendered inside it (like `.dpick`) is capped at z:1 vs root-level siblings (`.mdv-dock` z:50, toasts, celebrate z:80+). Raising the child's z-index is useless; the overlay must portal to body root or the dock must drop/hide while the modal is open. Verify occlusion with `elementFromPoint` at the control's center, not just computed z-index.
- **Two different "docks" in mdv**: `.mdv-dock` = the bottom tab nav (Bản đồ/Hộ chiếu/Thử tài/Cài đặt — always mounted, z:50 root level, occludes fixed modals inside `.mdv-screen` z:1). `.demodock` = the floating debug FAB (only with `?debug=1`/`mdv.admin` — often unmounted). Occlusion fixes must target `.mdv-dock`, not `.demodock`. Confirm sheets render as `.finale.confirm` / `.finale__card.confirm__card` + `role=alertdialog`.

## Media clip stalls on test preview (false-negative trap)
- `python3 -m http.server` has NO Range support → returns 200 to Range requests. Under the app's SW (`e.respondWith(fetch(req))` / `caches.match→200-to-range-req`), Chrome's media loader can stall forever on a COLD mp4: readyState 0, networkState 2, no error, poster shows, duration NaN, and the `m:ss` label never renders. Clips previously fetched may still work (runtime/HTTP cache hits), so ONE clip can look broken while others play.
- Diagnose: curl the mp4 (healthy ≠ enough — check server Range support via `curl -H "Range: bytes=0-99"`, want 206), check server access log (requests arrive + 200 but page never resolves = env stall), ffprobe moov position.
- Fix for testing: serve dist on a Range-capable server (a ~25-line node http server emitting 206/Content-Range, or any proper static host) on a NEW port/origin — fresh origin also avoids the old SW entirely. GitHub Pages/nginx send 206 so prod is unaffected.
