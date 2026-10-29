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

## Update 2026-10-29 — phone build and Android APK
- **User decisions:** the phone build runs **fullscreen**, **landscape only** ("альбомная, like watching a movie"), and ships **English, Russian and Uzbek only**. The PC game keeps 16 languages and is unchanged (canonical HTML not rebuilt).
- `npm run build:apk` → `outputs/Drift_Bastion_Mobile.html` (phone browser) + `outputs/Bastion_Android.apk` (id `com.nightforge.bastion`, minSdk 24, target 35, sensorLandscape, immersive, cutouts letterboxed, Android back = Escape, app pauses a run when backgrounded).
- New `mobile-landscape.css` fixes the phone landscape layout: Hangar tab rail (a desktop `24px 1fr` grid pushed labels out of their tabs), single-row Build header and floating status (Build cells 28 → 63 px at 844×390), Build library as one vertical list (grouped rows had made every module after the first of its group unreachable), wave break and doctrine panels always show title and Start wave, Victory text no longer under its buttons, upgrade purchase buttons pinned in scrolling detail panels, no fullscreen button on top of Settings, test-range lab no longer over the health bar, ≥9 px text, text-size setting hidden (layout tuned for 100%).
- `mobile-share.js`: translated labels, fullscreen re-entered on the next tap after Android's back gesture, landscape lock, rotate prompt + auto-pause when held upright, `[B]`/`[P]` hints stripped on touch, `bastionHandleBack` / `bastionAppHidden` hooks for the app.
- Two new strings ("Turn your phone sideways", "Hold & drag to steer · Release to coast") are in all 15 locales; the mobile export packs only `ru`/`uz` from `locales/*.json`.
- Evidence: Chromium phone emulation (touch, `pointer: coarse`) at 640×360 … 932×430 and 1024×768 / 1280×800, EN/RU/UZ, every screen; `npm run test:mobile`. **Not done:** running the APK on a real device or emulator (none attached), human playtest on a phone.
- Known limits: the playtest-log export is hidden in the app (WebView cannot save the file); if Android kills the app while it is in the background mid-run, that run is lost (the PC game banks on tab close).
- Branch `feat/mobile` (from `feat/waves-and-cards`) carries this work plus the built `outputs/Drift_Bastion_Mobile.html` and `outputs/Bastion_Android.apk`. The signing key `android/playtest.keystore` is git-ignored (public repository) and exists only on the PC that built it.

## Working rules (from the user)
- Concise communication, honest verification labels; don't call untested things done; the user playtests feel himself.
- AGENTS.md: experiments in `outputs/experiments/<date-time>-<name>/` via `node tools/build-standalone.js <path>`; `npm run build:playtest` writes the main HTML (only after verification); browser checks at 1920×1080.
- New player-visible text must use `tr()` (I18N.md) and get translated.
- Known, pre-existing: in `?debug=1` the built-in self-tests report "Opening bodies must approach…" (exists since commit 042d086, not caused by this work); service-worker 404 in the standalone HTML.
