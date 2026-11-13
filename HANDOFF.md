# Handoff — Bastion waves & cards (2026-10-21)

Read this first, then `AGENTS.md`, `I18N.md` and `C:\Users\User\.claude\CLAUDE.md` (global user rules and project context).

## Repository state
- Project: `C:\Users\User\Documents\ChatGPT\Incremental` · remote `github.com/djsarvaryanbekov/Bastion`.
- `main` = `7ab19fc` (16-language localization), pushed. Do not touch `main`.
- Current branch: **`feat/waves-and-cards`** — all work below is **uncommitted** in the working tree. Commit/push only when the user says "git push".
- `.claude/launch.json` (local static server `bastion-static`, serves `outputs/` on :8765) and the old feedback HTML are untracked on purpose; never commit them.
- Backup of the main HTML before this feature: `outputs/experiments/2026-10-21-waves/backup/`.

## Done on the branch (verified: `npm run check`, `npm test` = 43 checks green, `npm run test:i18n` all ok)
- **Waves mode** (`waves.js` + director in `game.js`): Start run = 20 waves (30–60s), boss waves 5/10/15, final boss wave 20 (×1.3 HP) = win → victory screen (reused `milestoneOverlay`) → "Continue endless" waves 21+ (boss every 5). Endless mode kept as a separate menu button and unchanged (all old tests target it; bare `startRun()` = endless).
- **Wave end = "clear the swarm"** (user decision): timer only stops new spawns; living enemies stay; HUD "WAVE n/20 · N LEFT"; stragglers beyond 760px are pulled in; break starts after the last kill. Boss kill also → sweep.
- **Break (intermission)**: +Matter bonus, 30% hull repair, full shields, pick 1 of 3 cards (free), reroll for Matter, Build allowed (Build also allowed mid-wave — user decision), Start next wave.
- **Enemy scaling in Waves only** (user decision): +8% HP/shield, +4% damage, +3% reward per wave (`waves.enemyScale`). Endless enemies stay fixed.
- **Cards** (`cards.js`): 20 cards, fold/roll/describe, hooks in game.js (`resolveWeaponDefinition`, `cardMod`, damage/fire-rate/matter/drive/hull/damage-taken/boss-damage, volatile blasts). **The user REJECTED this card set** (mostly "+X% stat") and also rejected my first "unique" idea list (see research brief). Keep the system/hooks; the card designs will be replaced.
- Localization: all new strings translated into 15 languages (`locales/*.json`, validated by `tools/check-locales.cjs`).
- Tests: `tools/waves-check.cjs`, `tools/cards-check.cjs` (in `npm test`); test harness `.artifact_build/runtime-check.js` loads waves.js/cards.js.
- Debug API (only with `?debug=1`): `__driftBastion.waveState()`, `advance(seconds)` (steps the sim; needed because the hidden browser pane pauses animation frames), `endWave()`, `jumpToWave(n)` (during a break), `setInvulnerable(true)`.
- Main HTML `outputs/Drift_Bastion_Playtest.html` is rebuilt from the branch (build `2026.10.21-waves-52`). `PLAYTEST_README.txt` updated.
- Not yet human-playtested: all numbers are provisional.

## Update 2026-10-22
Research is complete: 13 games, with catalogs and notes for each. Added Cobalt Core, Luck be a Landlord, Balatro and DRG: Survivor, and the Backpack Battles catalog (499 rows).
- Written: `patterns.md`, `proposals.md` (ranked shortlist at the end) and `sources.md`.
- Sentiment evidence lives in each `notes/*.md`.
- The user approved the first slice ("ok"), and it is implemented. The main HTML is rebuilt as `2026.10.22-cards-53`. Nothing is committed.
  - **Code:**
    - `cards.js` gains card kinds rule / duo / doctrine, plus `TUNING`, duo gating with a guaranteed first sighting, Doctrine offers and the skip reward.
    - Hooks in `game.js`: `hasActiveEmberNeighbor`, `hasCryoNeighbor`, `weaponCooldownRate`, `damageEnemy`, `firePulse`, laser beams, `updateProjectiles` (Lensing), `updateWeaponStatuses` (Thermal Shock, frost lines), `detachTile`/`destroyTile` and the derelict wrecks (Castaway), `modulePrice` (Gray Market), `assignFlagship`, `enterIntermission`, `skipCard`.
  - **UI:** Skip button, Reroll · free, Duo/Doctrine labels, owned-card chips (dormant duos greyed), 1–4 card layouts.
  - **Retired, never offered** (they still fold for old picks): Volatile Hulls, Glass Cannon, Overtime.
  - **Debug** (`?debug=1`): `grantCard(id)`, `placeModule(type,x,y)`, `destroyModule(x,y)`; `waveState()` now shows doctrine, free rerolls, seen duos, wrecks, frost lines, pairs, flagship and price factors.
  - **Tests:** new `tools/card-effects-check.cjs`; `cards-check` updated. `npm run check`, `npm test` and `npm run test:i18n` all pass. Strings are translated into 15 languages (machine drafts).
  - **Browser check at 1920×1080:** experiment and main HTML; EN and RU text.
  - **Not done:** human playtest; HUD chips during combat; Build-mode highlighting of duo pairs; price arrows for Gray Market.
  - Experiment copy and backup: `outputs/experiments/2026-10-22-cards/`.
- **UI/UX pass (2026-10-22):** break panel centred, with padding and natural height; summary centred; cyan focus ring (gold means picked); a stale sweep toast is cleared when the break opens; bigger owned-card chips; ▲/▼ Gray Market price markers in the Build catalog.
- **User decision:** Build only between waves in Waves mode (reverses "Build mid-wave"). The HUD Build button and the "B Build" hint are hidden in Waves, and B mid-wave shows "Build opens between waves". The Build header reads "Wave break". Endless and Training are unchanged.
- **Signposting (2026-10-22):**
  - **Build:** lime bars between adjacent duo partners (solid if owned, faint if only earned). Empty cells where the selected module would complete an inactive duo get a lime outline and the tooltip "Forms a duo: X".
  - **Combat HUD:** a chip row under the stats for rule, duo and Doctrine cards. Dormant duos are greyed, with a one-time toast "{card} is dormant".
  - **Debug:** `unlockModule(type)`.
  - **Fixed** a duplicate `buildHint` id: the controls hint is now `buildControlHint`.
- **Items 3–6 (2026-10-22):**
  - **Doctrine break:** gold panel accent and gold title, plus pips for the 3-per-run cap.
  - **Card icons:** an SVG symbol for every card without a module; cards.js `icon` key, `CARD_SYMBOLS` in game.js.
  - **Break-screen chips** are buttons: tapping one shows its text, including the dormant reason, below the row.
  - **Flagship crown:** 1.6× in combat, and also shown on the Build cell.
- **Six layout cards (2026-10-22), as rule cards:**
  - Arc Spine (epic): damage line between the farthest-apart weapons, scaled by wave HP.
  - Hollow Strut (rare): **deviation from the proposal**. All Armor Tiles become struts instead of 2 new strut tiles, which avoids a 19th module type. Struts can't be damaged, contacts and shots pass through them, and core HP −10%.
  - Core Conduit (epic): sparks every 4s along the core row/column; resets weapon cooldowns, +10% per cell travelled. No Reactor re-emit yet.
  - Phase Lattice (epic): every 12s, a 3s window where Ember/Cryo/Reactor/Bulkhead/Combined Arms and duos count ship-wide; 1s warning ring.
  - Outrider (rare): the farthest weapons (ties included) echo each attack at 60% after 0.15s; cyan » mark.
  - Return to Sender (rare): Flak-destroyed shots return as ×3 shrapnel, max 6 per burst.
- **Tuning decisions (user: "do what you think is better"):**
  - Hollow Strut stays as the Armor-to-strut version, and enemies passing through struts stay as its cost.
  - Outrider needs distance ≥ 2 from the core (`outriderMinDistance`), so weapons hugging the core never echo.
  - Core Conduit sparks branch sideways once per pulse at each Reactor.
- **Requirement gates:** duo pairs must be licensed; new `minWeapons` requirement. A test checks fresh-save offers over 300 rolls. The debug self-tests pass in the browser.

## Update 2026-11-12 — visual pass (build `2026.11.12-visuals-54`)
Promoted to the main HTML at the user's request ("Yes, promote it"), then committed and pushed on "git push".
- **Audit and research:** `research/game-audit-2026-11-11/AUDIT.md` (visual, loop and mechanics audit with the user's decisions), `research/controls-2026-11-11/` (dash and manual-aim research; nothing built), `research/backgrounds-2026-11-11/references.md`.
- **Background:** `space-backdrop.js`, modelled on Space Scavenger: blue field, dark clouds, star dust, faceted rock clusters, grid kept on top. Drawn in code, moves only with the camera at 7-18% of its speed. The streaking stars remain only in Training. Check: `tools/space-backdrop-check.cjs`.
- **Bosses:** sprites through the enemy-art pipeline (`enemy-art-manifest.json`: `bossRing`, `bossPursuer`, `bossStorm`; optional `maxSize`). `BOSS_ART_TYPES` and `drawBossSprite` in `game.js`; `boss.visualFacing` is presentation only. Sources and briefs in `New_Visuals/bosses/`.
- **Card break:** hand layout in `styles.css` (desktop only), card pips and key hints, number keys 1-4, "Buy modules" button (`renderBuyModulesButton`, one new translated string).
- **Combat readability:** ordinary enemy shots and warnings use `SHOT_COLORS.hostile` (pink) with a bright core; brighter hit sparks and kill bursts; larger player shot sprites (`SHOT_SIZE` in `attack-vfx.js`, `RAIL_SHOT` in `game.js`).
- **Bulwark:** 85 HP + 45 shield became 130 HP; no shield ring. `waves-check` and the built-in self-test were updated.
- **Rejected by the user, do not re-propose:** engine flames on the ship, Matter shards flying to the core, edge arrows for enemy groups, five alternative art styles, simplified boss redraws, and every background before the Space Scavenger one. Design changes (loadout cap, dash, manual weapons, merge tiers) are parked as ideas only.
- **Verified:** `npm run check`, `npm test`, `npm run test:i18n`; enemy-art and attack-vfx browser checks; main HTML opened at 1920x1080. With GPU rendering the frame time equals the previous build (60 fps cap, Intel UHD); with software rendering the background roughly doubles it.
- **Not done:** human playtest of this build; the ZIP package and itch.io still hold an older build; `outputs/PLAYTEST_README.txt` (the package copy) is not updated.

## Update 2026-11-12 — UI response pass (build `2026.11.12-ui-feel-55`), merged into `main`
The user asked for a full review of how the UI answers the player (hover, press), with the Build screen in particular, and then a merge into `main`.
- **Review:** `research/ui-feel-2026-11-12/REVIEW.md` with `audit.json` (62 controls on 12 screens, hover and pressed states forced through the debugger) and screenshots.
- **Found:** no pressed state on any primary button; colour-only responses everywhere except wave cards; no purchase feedback inside Build; missing hand cursor on some rows.
- **Changed (presentation only):** last section of `pc-workspaces.css` (hover lift or slide, press push-in, Build cell grow, landing, wallet pulse and shake); `replayAnimation`, `showBuildMatter`, `refuseBuildPurchase` in `game.js`.
- **Not built:** the Build screen layout issues listed in the review (no buy button, "+" on unaffordable cells, bare prices, small ship, tiny help line). They need mockups to choose from first.
- **Verified:** the audit re-run finds an animated hover and press response on every button; a real-pointer run of Build confirms the landing, the wallet pulse and the refusal shake; `npm run check`, `npm test`, `npm run test:i18n`. Not judged by a person.
- **Git:** committed on `feat/waves-and-cards` and merged into `main` locally. `main` was pushed only if the user said "git push" afterwards.

## Update 2026-11-13 — full QA pass and performance fixes (build `2026.11.13-perf-59`)
The user asked for a full test of UI, every module, core gameplay and performance, with a log, and optimization where possible.
- Log, scripts and results: `research/qa-2026-11-13/QA_LOG.md` (re-runnable harness; runs on a hooked copy of the HTML with isolated storage).
- Found nothing broken in UI (30 screens at 1920×1080 and at 1280×720 @150%, 16 languages), modules (all 18) or a 25-wave run with all bosses and victory.
- Fixed: Build purchase cost grew with ship size (inline base64 sprites in every cell; now blob URLs in `module-art.js`, 373 → 62 ms per click at 121 modules); negative frame step could freeze the simulation after a slow click (clamped in `stepFrame`); effects now age during the wave break; `drawShip` overlay skips per-tile style work when it draws nothing.
- Promoted to the main HTML; backup of build 58 in `outputs/experiments/2026-11-13-qa-perf/backup/`. Not committed, ZIP and itch not updated, not playtested by a person.
- Older Playwright suites fail; most only because Chromium here reports Russian (`research/qa-2026-11-13/force-en-locale.cjs`). Triage table in the QA log.

### Follow-up: browser suites updated (build `2026.11.13-art-fallback-60`)
- The user said "Yes, update tests". All 19 browser checks in `test:browser`, `test:pc`, `test:art`, `test:feedback`, `test:training`, `test:controls`, `test:economy-browser` and `test:presentation` were brought to the current game. Each change keeps what the check was originally testing:
  - `tools/english-browser-locale.cjs` is required first in each of them, so English assertions hold on a Russian machine.
  - Checks that open Build mid-fight start Endless (`#startEndlessButton`), because Waves only builds between waves.
  - New research-tree selectors (`data-research-node`, `.research-purchase`). `balance-browser` was rewritten and still asserts the same prices (8/18/36/87/90/162).
  - Build auto-fit with zoom-in scrolling; build id read from `telemetry.js`; sprite blob URL compared byte for byte; star found by marker size behind the space backdrop; reduced-flash sparks compared against normal ones; Training Matter is 30; Training is reached via Settings → advanced.
  - Touch routes in `training-browser` run only with `--touch` (the phone build is archived). Its profiles are 1280×800 and 1280×720 @150%.
- A real bug surfaced in `module-art-browser`'s missing-art check: with no module art, the menu threw errors (`pc-ui.js`, `pc-research.js`, `pc-systems.js`, `game.js` `drawHero` / `icon`). It was the same in build 58. Guarded, then the main HTML was rebuilt. Backup of 59 is in `outputs/experiments/2026-11-13-qa-perf/backup-59/`.

## Update 2026-11-13 — player balance data v3 (build `2026.11.13-balance-data-61`)
The user asked to remake the JSON balance data players export (proposal approved with "Yes, build it"). Delivery is still a manual export (Settings → advanced → Export). Auto-upload was not built: it needs a server and player consent, so it is the user's decision.
- **Attribution in `game.js`:**
  - `Game.damageSource` is set where damage starts (`updateWeapon`, each friendly projectile, fire areas and gravity fields by their emitter tile, burns via `enemy.burnSource`, card effects as `card:<id>`). `damageEnemy` passes it to telemetry.
  - `Game.damageAttacker` is set per enemy in `updateEnemies` and per hostile projectile; ship damage passes it plus the core HP ratio.
  - Both reset each `update()`.
  - Duo cards that amplify a weapon count for that weapon.
- **`telemetry.js` schema/metrics v3:**
  - Per run: `waves[]` rows (time, kills, Matter in and out, damage by source, damage taken by enemy, lowest core HP, modules, purchases, upgrades, peak enemies, min fps); break spending is credited to the wave before the break.
  - `cards[]` (offers incl. rerolls, pick, skip, reroll cost) and `death` (wave, `killedBy` = enemy of the last core hit).
  - Summary adds the source shares, kills by source, upgrade paths and Matter by reason. Wave-clear bonus, skip reward and reroll cost now reconcile (`matterBalanceError` 0, computed on unrounded Matter).
  - Samples every 30 s (was 5 s).
  - v1/v2 history loads unchanged.
- **`tools/balance-report.cjs`** (`npm run balance:report -- <folder or files> --out=report.md --csv=waves.csv [--build=prefix] [--mode=waves] [--include-debug]`):
  - Merges exports and drops duplicate runs from repeated exports and debug runs.
  - Writes a markdown report (outcomes, how far runs get, per-wave medians, deaths and killers, damage share by source, damage taken by enemy, card pick rates, economy) plus a per-wave CSV.
  - Older runs count in totals only.
- **Tests:**
  - `tools/telemetry-balance-check.js` and `tools/balance-report-check.cjs` run in `npm test`.
  - `tools/telemetry-browser-check.cjs` (in `test:browser`) plays 3 real waves in a temporary build: damage by source covers Cannon/Laser/Ember/Missile with nothing unattributed, Matter reconciles, and the death names the enemy.
  - `telemetry-check.js` was updated for schema 3 and 30 s samples.
- **The user's existing exports** (10 files in Downloads, 3 testers, 36 runs) are all pre-Waves builds from 2026-09/10. The report reads them, but they have no wave or card data.
- Verified on build 61:
  - `npm run check`, `npm test`, `test:i18n`, `test:attack-vfx`, `test:steering` and all 20 browser checks pass. `standalone-browser` and `.artifact_build/runtime-check.js` were updated for schema 3 and 30 s samples.
  - `balance-browser` once failed its last check: the `cannon:focus` license was missing after the page reload. It then passed 9 runs in a row. The cause was not found, so treat it as an open question, not as proof the save is fine.
- Backup of build 60: `outputs/experiments/2026-11-13-qa-perf/backup-60/`. Not committed; ZIP and itch not updated.

## Update 2026-11-13 — Missile Pod blast (build `2026.11.13-missile-58`)
The user asked for the missile blast to show its radius, rejected painted and generated fireballs, and chose Nova Drift's explosions as the reference (Steam screenshot, then its launch trailer frame by frame).
- `missile-blast-vfx.js` (new, wired through `attack-vfx.js`, `index.html`, `tools/build-standalone.js`, `package.json` check): a faint sphere at the damage radius that swells slightly and fades; a metaball blob simulated per blast on a 72x72 grid (lobes drift apart unevenly, white-hot then pink); a swelling inner sphere; flickering sparkle; specks with drag. Missile blast effect life is 1 s (`MISSILE_BLAST_LIFE` in `game.js`); damage is unchanged.
- References and measurements: `research/missile-blast-2026-11-12/REFERENCES.md`; comparisons in `outputs/experiments/2026-11-12-missile-blast/`. The two trailer videos in `research/missile-blast-2026-11-12/video/` (~270 MB) are reference only and must not be committed.
- Stars: near stars' tails point opposite the ship's velocity and fade (`drawStarTail` in `game.js`), per user feedback that the old lines looked like tentacles reaching forward.
- Verified: `npm run check`, `npm test`, attack-VFX browser check; 8 Missile Pods into 60 enemies at 150% scaling hold 60 fps, same as build 57. Not committed.
's Opera screenshots (build `2026.11.12-fixes-57`)
The user's screen is 1920x1080 at 150% Windows scaling, so the page is 1280x720 CSS px; the card screen was only ever checked at 1920x1080 at 100%.
- Cards (`game.js`): a click selects (`cardSelection`, tied to the offer array, so a reroll or a new break clears it); `startNextWave` applies the selection with `pickCard`. Skip stays immediate. The game rules (`pickCard`, one card per break) are unchanged.
- Layout (`styles.css`): the break heading starts below the HUD; smaller hand under 860 px and 660 px of height; tighter button bar under 1500 px of width; the flight hint is hidden during the break; side cards no longer dip under the bar.
- Lag (`pc-ui.css`, `game.js`): full-screen overlays had `backdrop-filter: blur(6px)` over a canvas redrawn every frame (Build at ~30 fps at 100%, worse at 150%); the blur is removed and the canvas is drawn once under the desktop Build screen. Build idle now holds 60 fps at both scales. Battle frame time is the same as the build before the visual pass.
- Stars: the backdrop's dust tile is removed; far stars move at 0.22-0.42 of the camera, faster than the rocks (0.18), so none appears to travel forward.
- Missile: `blastRadius: 74` is now on the module (the value it already used), so Build shows "Blast radius" for area weapons and the upgrade tree shows 74 -> 100.
- `run-upgrades.js`: before/after values round to two decimals.
- Verified: `npm run check`, `npm test`, `npm run test:i18n`, attack-VFX and enemy-art browser checks, card/Build/tree script at 1280x720 @1.5 in the installed Chrome. Not committed.

## Update 2026-11-12 — background fix (build `2026.11.12-bg-56`)
User feedback on the rock-field background, with two screenshots: the moving stars were gone, the field looked like "a light around the ship", there was no visible cloud pattern, and there were too many rocks.
- `game.js`: the game's own streaking stars are drawn again on top of the backdrop.
- `space-backdrop.js`: the screen-centred blue wash and the edge vignette are removed (they made the spotlight); an even tint replaces them. The cloud tile is two-tone (dark smoke and lighter blue haze), painted at 768 px and dithered so it does not band, and it moves at the same rate as the near rocks and dust (0.18 of the camera). Fewer rocks per cluster and fewer clusters; dust is thinner.
- Verified in the installed Google Chrome at 1920x1080 and with `npm run check`, `npm test`. Not committed.

## In progress — card redesign through research
- New user skill: **`game-mechanic-research`** (`C:\Users\User\.claude\skills\game-mechanic-research`) — find similar games, mine their fan wikis/communities for the complete catalog + what players love/hate, then design original variants through the game's pillars. Use it.
- Research folder: `research/cards-2026-10-21/`
  - `00-brief.md` — Bastion pillars, code hooks, constraints, what was rejected and why. Read it.
  - Done (catalog + notes): **GUNBOAT-8, Slay the Spire, HoloCure, 20 Minutes Till Dawn, Vampire Survivors, Brotato, Hades, Nova Drift**.
  - Possibly missing if the old chat stopped its agents: **Backpack Battles**. Check `notes/` and `catalog/`; re-run only the missing games with the skill's per-game instructions (one subagent per game, WebSearch/WebFetch, no browser pane; Reddit is blocked for web tools — use Steam threads/wikis).
- Next steps:
  1. Finish missing games.
  2. Write `patterns.md` (taxonomy across all catalogs + sentiment evidence + structural rules: offer cadence, milestone "arcana"-style rule cards, signposted synergies, banish/skip, downsides that steer builds).
  3. Write `proposals.md` (format in the skill; 2–3× more than needed, ranked; each tied to Bastion pillars, evidence, code hook, cost). Flag overlaps with rejected ideas.
  4. Present a short ranked shortlist to the user and get approval **before coding**.
  5. Implement approved cards in `cards.js`/`game.js` (stat cards may stay as commons), simple combat visuals for active rare/epic cards (user said yes, reuse existing VFX), `tr()` text + translations for 15 languages, update `cards-check`, build experiment, verify at 1920×1080 with the layout probe, then promote to the main HTML.
- Strong cross-game lessons so far: rule-changing cards limited to milestones (VS Arcanas: 3/run); synergies enter the pool only when earned and must be offered promptly (Bastion has ~19 picks/run); drawbacks should steer builds, not just weaken (StS boss relics, HoloCure + "Shackles"); show recipes/combos in-game (HoloCure, VS complaints); visible counters (StS); role-changing runes on a weapon (GUNBOAT-8 Lifebuoy); boss rewards that upgrade or recruit.

## Working rules (from the user)
- Concise communication, honest verification labels; don't call untested things done; the user playtests feel himself.
- AGENTS.md: experiments in `outputs/experiments/<date-time>-<name>/` via `node tools/build-standalone.js <path>`; `npm run build:playtest` writes the main HTML (only after verification); browser checks at 1920×1080.
- New player-visible text must use `tr()` (I18N.md) and get translated.
- Known, pre-existing: in `?debug=1` the built-in self-tests report "Opening bodies must approach…" (exists since commit 042d086, not caused by this work); service-worker 404 in the standalone HTML.
