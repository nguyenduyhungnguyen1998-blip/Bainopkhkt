---
name: testing-mdv
description: How to run & UI-test the Mở Dấu Việt Preact PWA in this repo (dev server, hash routes, CDP mobile emulation, map hit-testing, localStorage state keys)
---

# Testing "Mở Dấu Việt" (Preact PWA) on this box

## Run
- Dev server: `npm run dev -- --port 5173` (Vite; often already running in a background shell — check `curl -s localhost:5173` first). Serves `src/` live — no rebuild needed for UI testing.
- No login/secrets needed. All state is localStorage.

## URLs & flags
- Hash router: `#/map`, `#/passport`, `#/quiz`, `#/settings`, `#/d/<siteId>[/<spotId>]`. `#/d/<site>` (no spot) = destination intro; with spot = spot page.
- Query params go BEFORE the hash: `?debug=1#/map`, `?theme=dark#/map`. `?debug=1` persists via `localStorage mdv.debug` — clean up with `?debug=0`.
- NO `?lang=` param exists — language only via UI chips / `mdv.lang`.

## localStorage keys (reset between runs)
`mdv.seen` (onboarding gate), `mdv.progress.v1` (unlocks/XP/badges), `mdv.lang`, `mdv.theme`, `mdv.debug`, `mdv.exploreMode`. Clear via CDP `Runtime.evaluate` `localStorage.clear()` then reload to replay onboarding.

## Mobile viewport via CDP (browser on :29229)
Chrome headful min width ~500px — for 390px mobile use CDP emulation:
- `websocket-client` python pkg needed (`pip3 install websocket-client`); MUST pass `suppress_origin=True` to `create_connection` or Chrome 403s the WS handshake.
- `Emulation.setDeviceMetricsOverride {width:390, height:844, deviceScaleFactor:1, mobile:true}` → page renders top-left of window.
- `Page.captureScreenshot` returns clean phone-frame PNGs (better evidence than desktop screenshots); `Input.dispatchMouseEvent` coords are CSS px of the emulated viewport.

## Map-specific gotchas
- Node tap targets: use `.vnode__hit` circle's `getBoundingClientRect()` center — the `<g>` bbox includes the label text, its center is NOT on the node.
- Tap detection: <350ms and <6px move → tap; longer = pan. Sheet grip: drag up>60px→expand 90dvh, down>120px from full→peek, down>90px from peek→close. Plain tap on grip = expand.
- Zooming beyond k=4.6 near a multi-spot site auto-opens the level-2 site map — avoid deep zoom when testing pan/"Về hành trình" on level 1.
- Transient anims (onboarding draw ~1.6s, unlock ripple ~1.4s, toast ~2.4s): screenshot latency of the computer tool may miss them — use `Page.captureScreenshot` at timed offsets instead.
- Journey "draw-in" uses `pathLength={1}` + `stroke-dasharray`/`strokeDashoffset` (path-space units, not px). To verify it live: sample `getComputedStyle(p).strokeDashoffset` right after an unlock via `p.getAnimations()[0].currentTime` — mid-animation values ≠0 prove the draw is rendering (screenshots alone can be ambiguous at low zoom).

## Evidence
- Console stays clean (vite HMR logs only). HUD polls at 4Hz; inspector toggles add `.vmap__grid`/`.vmap__hitring`/`.vmap__tapmark` elements — assert via DOM counts + screenshot.
