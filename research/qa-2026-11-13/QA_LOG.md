# Bastion — full QA and performance log (2026-11-13)

Build tested: `2026.11.13-missile-58` (main HTML before this pass).
Build shipped by this pass: `2026.11.13-perf-59` (main HTML now; backup of 58 in `outputs/experiments/2026-11-13-qa-perf/backup/`).
Machine: this PC, Intel UHD Graphics (ANGLE D3D11), installed Google Chrome for frame timing, Playwright Chromium for functional runs.
Storage: every run used a fresh browser context (isolated localStorage). The user's save was never touched.

What kind of evidence this is: automated browser runs and scripted simulation. **Nobody played the game by hand.** A bot that stands still is not a player, so the balance numbers below are not playtest balance.

## How to re-run

All scripts live in this folder and work on a *copy* of the HTML with one test hook (`window.__qa`) added.

| Script | What it does |
|---|---|
| `qa-ui.cjs [--viewport=1280x720@1.5] [--languages]` | Walks every screen, audits every visible control, saves screenshots to `screens/` |
| `qa-modules.cjs`, `qa-modules-motion.cjs` | Per-module bench: core + one module, controlled enemies |
| `qa-gameplay.cjs [--mortal]` | Full Waves run by a bot that buys modules between waves through the real purchase code |
| `qa-perf.cjs --sim / --render [--html=… --tag=…]` | Simulation cost per subsystem / real frame times in Chrome + CPU profiles |
| `qa-ablate.cjs`, `qa-effects.cjs`, `qa-timeline.cjs` | Render-layer and effect-type cost studies, per-second frame timeline |
| `force-en-locale.cjs` | Preload for the older test suites (see "Test environment" below) |

`QA_HTML=<path>` points any phase at another build; `QA_TAG=<name>` prefixes its output files. Raw logs are in `logs/`, JSON results next to this file.

## 1. Existing automated tests

| Suite | Result |
|---|---|
| `npm run check` | pass |
| `npm test` (43 checks) | pass |
| `npm run test:i18n` (16 languages) | pass |
| `npm run test:attack-vfx`, `npm run test:steering` | pass |
| Older browser suites (`test:browser`, `test:pc`, `test:art`, `test:feedback`, `test:training`, `test:controls`, `test:economy-browser`, `test:presentation`) | failed on 58/59 (stale); **all 19 files pass after the update in section 6** (`logs/final-tests-summary.log`); mouse-input failed once in its first run, then passed 9 runs in a row |

## 2. UI (every screen, every visible control)

Walk: menu → settings (every slider, toggle, select, UI scale 100/125/150) → Hangar (all 18 module cards, Cores, Calibration, Research) → Range (Build, upgrade tree) → Waves run HUD → pause / pause settings / Escape → Build blocked mid-wave → card break (select, re-select, reroll, keys 1–3) → Build in the break (buy, inspect, upgrade tree) → Start wave 2 (card applied) → wave 5 boss HUD → Doctrine break → wave 20 victory → Continue endless → End run → results → Endless run, B opens Build, death → results → Training → Loadout.

| Check | 1920×1080 @100% | 1280×720 @150% (your Opera setup) |
|---|---|---|
| Steps passed | 15/15 | 15/15 |
| Screens audited | 30 | 30 |
| Controls off-screen / covered / clipped text | 0 | 0 |
| Page errors / console errors | 0 / 0 | 0 / 0 |

Languages: all 16 languages walked at 1280×720 @150% (menu, card break, Build, results) — 0 clipped or covered controls.

Observations (not bugs, worth a look):
- Hangar buy button reads "Buy · 1 Fragments" (plural with 1).
- Results screen header "You can buy · 16 modules in Hangar" lists only 3 of them.
- Unaffordable Build cells are disabled (`aria-disabled`), so a click on them does nothing. That matches the design (refusal shake comes from the module card), noted only because it confused my first test run.

## 3. Every module

Bench: Endless run, spawner off, core + the module, 8 stationary dummies at 60% of the module's range (max 170 px), 12 s at the fixed 30 Hz step. Then 6 scouts must be killed for Matter.

| Module | Measured DPS | Single-target DPS from stats | Targets hit | Scouts killed |
|---|---|---|---|---|
| Cannon | 22 | 24 | 1 | 6/6 |
| Laser | 18 | 17.1 | 1 | 6/6 |
| Missile | 16.5 | 18.8 | 1 | 6/6 |
| Scatter | 37.5 | 37.5 | 1 | 6/6 |
| Arc | 39.1 | 12.2 | 4 (chains) | 6/6 |
| Rail | 35.4 | 32.7 | 1 | 6/6 |
| Flak | 6.4 | 6.4 | 1 | 6/6 |
| Pulse | 75.3 | 12 | 8 (all) | 6/6 |
| Cryo | 8.3 | 8.2 | 1, slowed | 6/6 |
| Ember | 17.2 | 11.4 (+burn) | 1, burning | 6/6 |
| Gravity | 4 | 2 | field formed | 3/6 |
| Mine | 0 vs. stationary | — | — | — |

Mine and Gravity are designed for moving enemies (mines go into approach lanes; gravity pulls a moving group). Re-tested with a moving group (`modules-motion.json`): mines detonate in the lane, the gravity field forms and damages. Both work.

Support modules:

| Module | Check | Result |
|---|---|---|
| Armor | HP | 120/120 |
| Shield | 30 damage on the core | 30 absorbed, core lost 0; recharges after the delay |
| Repair | core at 50% | +30 HP in 10 s (after the 2 s delay) |
| Bulkhead | 50 damage on a neighbour | 44 taken = 12% reduction |
| Reactor | cannon next to it | ×1.32 damage in 15 s (25% faster fire) |
| Collector | Matter from 6 scout kills | ×1.10 |

Combos: Ember+Cannon burns targets; Cryo+Rail and Cryo+Missile slow targets. Destroying a module mid-fight detaches the cut-off modules and the run continues.

## 4. Core gameplay

Bot: stands still, invulnerable, picks the first card, buys modules between waves through the real purchase code, presses Start wave.

- 25 waves: 1–20, victory screen after wave 20, then endless 21–25. Bosses on 5, 10, 15, 20, 25. Card offered every break; picks applied on Start wave. 0 page errors, no crash.
- Wave length 33–92 s; enemies on screen peak at ~60 (waves 1–10), ~170–300 (11–17), ~360–420 (18–25).
- Mortal bot (same, but can die): dies on wave 12 at 10:37 with 37 Fragments banked. A stationary bot with no upgrades says nothing about human balance.

## 5. Performance

### Simulation (headless, 120 modules, wave 18, 1800 steps)
Average 1.38 ms per 30 Hz step, p95 2.7, p99 3.6, max 5.2 ms. `updateEnemies` 58%, `updateWeapons` 26%. **Simulation is not a bottleneck.** Rendering is.

### Frame times in installed Chrome, 1920×1080, quiet machine

| Scene | Build 58 | Build 59 |
|---|---|---|
| Menu, wave 1, card break, Build (small ship), 8 Missile Pods vs 60 | 60 fps | 60 fps |
| Card break right after 10 purchases | 54.7 fps, p95 33 ms | 60 fps, p95 17 ms |
| Build screen, 120 modules (idle) | 59.4 fps, max 33 ms | 60 fps |
| **One purchase click in Build, 121st module** | **373 ms** | **62 ms** |
| Wave 18 swarm, 120 modules, ~250 enemies | 49 fps, max 83 ms | 53 fps, max 34 ms |
| Wave 20 boss, 120 modules | 57 fps | 52 fps (scene varies; within noise) |

Purchase click cost in Build vs ship size (headless JS time): 20 modules 53→14 ms, 60 → 115→20 ms, 100 → 200→34 ms, 140 → 290→42 ms.

Correction recorded honestly: my first late-game numbers (22–34 fps) were measured while another agent ran browser suites in parallel. On a quiet machine build 58 holds ~49–57 fps there.

### What was found and fixed in build 59

1. **Build purchases got slower with ship size (UI freeze up to ~0.4 s per click).** Every Build grid render wrote each module sprite into the cell markup as an inline base64 data URI (~200 KB of text per weapon cell, ~25 MB on a 140-module ship). Fix in `module-art.js`: cells reference the same images through short blob URLs. Same pixels.
2. **Simulation could freeze after a slow click (latent bug).** The frame loop's time step had no lower bound. A handler that sets `lastFrame` (Start wave, close Build) runs after the frame's timestamp was taken, so the next step can be negative and the simulation stalls until it catches up at 0.1 s per frame. With the old Build cost this meant a few frozen frames after closing Build on a big ship; my scripted 120-purchase setup froze it for 19 s. Fix in `game.js`: the step is clamped at ≥ 0.
3. **Purchase flashes froze under the card screen.** Effects only aged during combat, so flashes and wrecks stayed on screen through the whole break and were redrawn every frame with a 14 px canvas blur. Fix in `game.js`: effects keep ageing during the break (presentation only; nothing else moves).
4. **Ship overlay pass did style and path work for every module every frame even when it draws nothing.** Fix in `game.js` `drawShip`: that work is skipped for tiles that draw no frame. Identical output.

### Not changed, candidates if late-game fps matters
- Combat effects with 100+ modules: generic effects (rings, beams, arcs) are stroked with `shadowBlur 14` on High quality. Quality tier 1 removes it (measured −2.7 ms/frame).
- Missile Pod blast blob: re-simulated on a 72×72 grid and re-uploaded per blast per frame (~4% of frame time in the swarm). The math can be tightened without changing the look.
- Ship sprites: ~3 draw calls per module per frame; a cached hull layer would cut them, at some risk to how the ship looks.

## 6. Older browser suites — updated (follow-up, build `2026.11.13-art-fallback-60`)

First triage (build 58/59): 14 of 19 files failed, none because of a game bug — the tests predated intentional changes. On request they were updated so each one still tests what it was written for:

| Test file | What was stale | Update |
|---|---|---|
| all 19 | Chromium here reports Russian | `tools/english-browser-locale.cjs` required first (en-US contexts) |
| standalone, hangar-module, pc-browser, pc-desktop, pc-build-ux, pc-upgrade-details, pc-range-access, module-art, feedback, matter-economy, mouse-input | Open Build mid-fight; Waves only builds between waves | Start Endless (`#startEndlessButton`), which keeps mid-fight Build |
| standalone | Build id hard-coded to an October build | Reads `GAME_BUILD` from `telemetry.js` |
| pc-desktop | Expected the Build grid to scroll for a tall ship; grid now auto-fits | Asserts the fitted ship is fully visible, then zoom-in scrolls |
| pc-build-ux | Guide instruction text is hidden on PC; `.research-state` now also used for pricing | Asserts visible title and hidden copy; narrower selector |
| feedback | Sprite `href` expected as data URI (changed to blob URL in build 59); first star rectangle now drawn after the space backdrop | Compares blob bytes to the source image; finds the star by a marker size |
| balance-browser | Old branch/choice selectors (`data-branch`, `data-choice`), mobile profiles | Rewritten on the research tree; same Fragment cost (300 − 64 − 80) and same Matter charges 8/18/36/87/90/162; profiles 1920×1080 and 1280×720 @150% |
| presentation | Reduced-flash spark width fixed at 4 (now 5 vs 9) | Reduced sparks must be thinner than normal ones |
| training-browser | Matter 20 (game: 30 in every committed version), "tune" upgrade, Training button now under Settings → advanced, touch routes | 30; rank 1 Damage via research tree (16 Matter for 2 copies); opens Settings first; touch routes only with `--touch` (phone build archived) |

**Real bug found by the updated module-art check:** if module art fails to load, the menu throws two errors and stays unusable (`pc-ui.js`, `pc-research.js`, `pc-systems.js`, `game.js` `drawHero`/`icon` used `DriftModuleArt` without a null check). Same in build 58. Guarded; falls back to glyphs. Shipped normally the art is inlined, so players were very unlikely to hit it.

## 7. Test environment note
Headless Chromium on this PC reports Russian, and the game picks the browser language, so English-text assertions fail before reaching what they test. Now handled in the repo by `tools/english-browser-locale.cjs`, required at the top of each browser check (`force-en-locale.cjs` here was the first, preload-only version).
