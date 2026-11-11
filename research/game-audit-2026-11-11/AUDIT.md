# Bastion — game audit, 2026-11-11

Build audited: `outputs/Drift_Bastion_Playtest.html` (`2026.10.22-cards-53`, branch `feat/waves-and-cards`).

## How to read this

Evidence labels used below:

- **[seen]** — I saw it in a 1920×1080 screenshot of the build (headless Chromium, fresh storage). Files in `screens/`.
- **[code]** — read from the source.
- **[sim]** — a scripted run through the debug API. The ship did not steer and could not die, so treat numbers as rough.
- **[research]** — from the four notes in `notes/` (web only; each claim there is labelled and linked).
- **[inference]** — my judgement.

Limits:

- Nobody played the game for this audit. Feel, difficulty and fun are not assessed.
- Screenshots are stills. Motion, sound and timing were not reviewed. Audio is skipped on purpose (the sound designer owns it).
- I could not watch Stellar Swarm or GUNBOAT-8 in motion. Their sections rest on store text, patch notes and reviews.
- Review counts were read on 2026-11-11, partly through third-party trackers.

## Verdict

1. The game's one real asset is the grid ship where neighbours combo and parts break off. Nothing released in 2024–2026 has that exact mix **[research]**.
2. A new player does not meet that asset. The first session is one cannon, two shop items and "+12% Matter" cards **[seen][code]**.
3. The picture on screen undersells the game: a small grey ship on an empty navy field, with the enemy mass more visible than the player's own firepower **[seen]**.
4. The permanent progression is slow at the start and very long overall: about 3 Fragments for an early death against a cheapest unlock of 8, and roughly 4,200 Fragments to unlock everything **[code]**.
5. Don't switch genre. Reframe: sell it as a wave-shop roguelite (the Brotato shape it already has) at a short-incremental price and scope.

## Genre

**Recommendation: stay, but reframe as a wave-shop roguelite with a built ship; borrow price and scope from short incrementals ($5–8, finite content, a stated ending).** **[inference from research]**

| Framing | Fit to the grid-ship asset | Fit to a small team and the market | What it would cost |
| --- | --- | --- | --- |
| Wave-shop roguelite (Brotato-like) | Best | Good | Already there: 20 waves of 30–60 s vs Brotato's 20 of 20–90 s. Needs run variety and a clearer break screen. |
| Tower-defence-style "defend the core" | Good | Middling | Replace drift flight and chase AI. A different game. |
| Survivors-like, continuous run | Middling | Worst | Auto-placed modules, the most content, distinctive art. Releases went 65 → 329 year on year. |
| Short active incremental | Worst | Best | 1–5 minute runs, no loss on death, a 60–150 node tree as the whole game. Cut cards, the shop and the 20 waves. |

Why not convert to an incremental, even though the folder is named for one:

- Adjacency becomes a puzzle you solve once.
- Parts breaking off fights the genre's promise that numbers only go up.
- The closest attempt found, Astro Nova ("short incremental roguelike, swarms in space, combining modules", $2.99), has 41 reviews.
- No successful incremental built around laying out a ship on a grid was found.

What to take from incrementals anyway: every run buys something, the tree is visible from the first minute, and the store page states how long the game is.

Market reality **[research]**:

- Nearest commercial proof: TerraTech Legion, "bullet heaven builder", $9.99, about 2,200 reviews at 82–86% positive.
- A solo grid-ship roguelite lands in the 140–320 review tier by default. About 2,000 is a good outcome, not the expected one.
- What separated the hits: a hook phrased as "known genre + the thing you built", the builder shown first on the store page, visible consequences (ships breaking), and an audience before launch.

## Named comparisons

**Stellar Swarm** (Bilbo Studios, free browser game on CrazyGames; not on Steam) **[research]**

- Move-only, auto-fire, pick a starting weapon, branching weapon trees toward "evolutions", crystals for permanent ship upgrades, endless waves, leaderboard.
- 9.4/10 from about 17,000 one-click ratings. That is not comparable to a Steam percentage.
- It has no modular ship, no grid and no in-run shop. Bastion took its swarm system and feel, not its structure.

Played for this audit on 2026-11-11: one run of about three minutes in Chrome, on your account (so with your permanent upgrades). Nothing was bought or claimed. **[played]**

| Time | Kills | What happened |
| --- | --- | --- |
| 0:17 | 32 | Combo counter already at ×25. |
| 0:22 | 50 | First level-up: upgrade the laser, or take a new weapon (Orbital Shield, Plasma Field). |
| 1:00 | 969 | About 150 enemies on screen. Level 4. |
| 1:56 | 5,255 | Level 6. Offers include "Bullets pierce all enemies" and a new Lightning Ray. |
| 2:57 | 12,736 | Level 8. New enemy types: fast orange darts, purple elites. |

Why its swarm of hundreds stays readable and feels good, where Bastion's turns into a wall:

- **Enemies are fodder.** They die in one or two hits (damage numbers 8–13). The crowd is there to be mown down. In Bastion's wave 17, shielded Bulwarks soak fire and pile up.
- **Two colours.** Everything of yours is cyan (ship, shots, aura, pickups). Enemies are red outlines. Specials are orange or purple. Bastion's enemies are detailed orange-red sprites that hide each other.
- **Outlines with spacing.** Enemies are rings in loose clusters of 5–15, so overlapping bodies stay countable.
- **The player's power is big on screen.** The Plasma Field aura covers about a quarter of the screen height around a tiny ship.
- **Killing is the reward.** The kill counter is the largest HUD element, with a combo counter, mission toasts mid-run and pickups that fly into the ship with trails.
- **Every level-up changes something you can see.** "3 projectiles in a cone", "Aura grows significantly", "Kills launch kamikaze drones". No "+8%" card appeared in the eight offers I saw. Correction from you: stat cards do appear, but only once all weapons are maxed out — so they are the filler at the end, not the first thing a player meets.
- **Pace.** First choice at 22 seconds. Bastion's first choice comes after wave 1 (about 38 seconds) and is a stat card.

Also seen: a ship selector, six stat bars, 9 of 10 weapons unlocked, daily bonus, missions and awards, local two-player, and a rewarded-ad "get all 3" at each level-up.

- Where Bastion can beat it: it has no structural identity (nothing is built), no arc seen in three minutes, and one generic neon look.

**GUNBOAT-8** (demo only, 47 reviews at 97%; full game unreleased) **[research]**

- The boat has 8 fixed weapon slots that you fill, merge and rune. No hull growth, no part loss, position matters little. Bastion's spatial grid is the clear difference.
- Winning runs averaged about 70 minutes at launch. The developer cut that to a 35–50 minute target using win-rate telemetry.
- Liked: build variety, objective "?" stages, music, co-op, a responsive developer.
- Disliked: an overwhelming shop with unclear wording; objective stages some builds cannot finish.
- Lessons: measure real winning-run time; avoid hard stat caps; make every objective passable by every build; favour readability over extra juice.

**Modular-ship peers** (Galaxy Siege, Captain Forever, Nova Drift, Reassembly, Cosmoteer, TerraTech Legion, Hull Rupture) **[research]**

- Best-received building cadence: untimed placement on a trigger between fights. Bastion's "Build only between waves" already matches it.
- Worst-received: building under fire, and random post-wave shops that decide the run by wave 5–9.
- Drift or inertia movement is the top complaint for Nova Drift and recurs elsewhere. Some players refund within the hour.
- Every builder converges on an optimal blob. Known counters: firing arcs, mass affecting handling, adjacency rules, per-ship grid outlines.
- Galaxy Siege was criticised because placement did not matter and combat played itself. Bastion's combos and steering answer both.
- Late-run placement becomes a chore without a move or mirror tool.
- TerraTech Legion veterans say more permanent unlocks dilute the pool and make builds worse.

## Visual audit

| # | Finding | Evidence | Fix | Size |
| --- | --- | --- | --- | --- |
| V1 | The battlefield is an empty flat navy field with a faint grid. No depth, no sense of place, no change across 20 waves. | [seen] `24-wave9-21s.png` | Two or three procedural parallax layers (dust, distant shapes, drifting debris). Shift the palette after each boss so the run has visible chapters. No art pipeline needed. | S–M |
| V2 | In wave 1 the ship is about 80×40 px on a 1920×1080 screen. Most of the frame is empty. | [seen] `02b-fresh-16s.png` | Start closer and pull the camera out as the ship grows (a camera zoom target already exists in code). | S |
| V3 | The ship reads as a sheet of similar light-grey tiles. Weapons and support are hard to tell apart at combat size. There is no front, and no engine or thrust effect at all. | [seen] `24`, `30`; [code] no thruster/exhaust drawing in `game.js` | Category tint on tile frames (weapon / support / hull). Engine glow on rear cells that follows thrust. A thin outline around the whole hull. | M |
| V4 | In late waves the enemy mass is the loudest thing on screen and the ship's own fire is the quietest. With 21 modules and 411 enemies, only a few tracers are visible. | [seen] `30-wave17-26s.png` (stills only — check in motion first) | Brighter tracer cores, muzzle flashes, hit sparks and kill pops, on a brighter value band than enemies. | M |
| V5 | At about 400 enemies the swarm overlaps into one unreadable orange blob. The count is intended (it comes from Stellar Swarm); the presentation is the problem. | [seen] `30-wave17-26s.png`; [played] Stellar Swarm | Keep the count. Make most of the swarm one-hit fodder, keep tanky types rare and distinct, add soft spacing between bodies, and give enemies a simpler, flatter look at distance. See the Stellar Swarm section. | M |
| V6 | The boss (Siege Ring) is a neon vector shape in a game of painted sprites. Pursuer v2 art exists in `New_Visuals` but is not integrated. | [seen] `27-boss-wave10-17s.png`; `New_Visuals/CURRENT_ASSETS.md` | Finish and integrate boss sprites. Bosses are the trailer moments. | M–L |
| V7 | The break screen is a small dim panel on a black screen. Cards are text plus a generic line icon. The ship — the thing the cards modify — is not shown. | [seen] `08-break-cards.png`, `28-doctrine-break.png` | Show the ship beside the cards. On hover, highlight the modules a card affects. Larger cards with rarity colour. | M |
| V8 | Kills give no pickup. Matter is credited directly to a counter. | [code] no pickup or drop entities | Cosmetic Matter shards that fly to the core (still auto-collected) plus a ticking counter. This is the moment-to-moment reward stream the genre relies on. | S |
| V9 | The boss has an off-screen locator, but enemy groups do not. They arrive from outside the view unannounced. | [code] `drawBossLocator` | Edge arrows for incoming groups, in the same style as the boss locator. | S |
| V10 | The results screen shows three numbers and one line. No picture of the ship you built, no cards taken, no cause of death, no progress toward the next unlock. | [seen] `32-results.png` | Run summary: final ship, cards, kills, what killed you, a bar to the next unlock. | S–M |
| V11 | The interface is consistent and tidy (teal on navy), but cold. It reads like a dashboard. | [seen] `01`, `05`, `21`, `22` | Low priority. Fix V1–V8 first; they change what a store screenshot shows. | — |

## Game loop audit

| # | Finding | Evidence | Fix | Size |
| --- | --- | --- | --- | --- |
| L1 | The first session hides the game's identity. A fresh save has Cannon and Armor only. Ember (28 Fragments) and Cryo (32) gate the first combos. A duo card needs two specific licensed modules side by side; the cheapest pair, Ember + Cryo, is 60 Fragments. First card offers are "+12% Matter", "−8% damage". | [seen] `21`, `08`; [code] `progression.js` costs | Give a fresh save one combo pair (for example Cannon + Ember). Guarantee one duo or rule card by wave 3. | S |
| L2 | Permanent progression starts too slowly. Rewards: 1 Fragment per minute, 1 per 500 kills, bosses 8 / 12 / 16 / 20. An early death pays about 3; the cheapest unlock costs 8. | [code] `progression.js` `settleRunReward` | First-time bonuses for reaching each wave. Tune so each of the first three runs buys something. | S |
| L3 | The total is very long. Modules 476 + cores 240 + 49 branch licences 3,472 ≈ 4,200 Fragments, before core ranks. A full win pays roughly 85–100. That is 45 or more wins. | [code] | Cut licence prices or bundle them per family. State the intended total playtime and price to match. | S (numbers) |
| L4 | A win is 13.7 minutes of timed waves plus 4 boss fights, 16 sweeps and 19 breaks — probably 25–35 minutes. Not measured with a human. | [code] `waves.js`; [inference] | Record real winning-run time and time spent in breaks through the existing telemetry before tuning. GUNBOAT-8 had to cut 70 minutes to 35–50. | S |
| L5 | Each break is up to three screens: card, Build layout, upgrade tree. Nineteen times per run. | [seen] `08`, `21`, `22` | One break screen: ship in the middle, cards on one side, shop on the other. | M |
| L6 | Run-to-run variety comes only from cards. The shop is the full catalogue at known prices; there are no events, objectives or route choices. | [code] | Objective waves (three or four types, each passable by any build). After each boss, choose one of two next sectors with a different enemy mix and reward. | M each |
| L7 | The menu offers five entries to a new player: Start run, Endless, Hangar, Training, Test range. | [seen] `01-fresh-menu.png` | Unlock Endless after the first win. Move Test range into the Hangar. | S |
| L8 | Nothing to aim for between runs except Fragments. Cores have unlock-condition fields in code, all set to zero. | [code] `campaign.js` | Milestones that teach systems ("win with 10 modules or fewer", "form three duos") and pay Fragments or cores. | S–M |
| L9 | After a win there is only "continue endless". | [code] | Difficulty tiers after the first win, as Brotato does. | M |

## Mechanics audit

| # | Finding | Evidence | Fix | Size |
| --- | --- | --- | --- | --- |
| M1 | Blob risk. Reactor (3×3), Bulkhead (3×3) and Shield radius all reward a compact ship. Only some cards (Outrider, Arc Spine, Lean Hull) push other shapes. | [code]; [research] every builder converges | Give each core its own grid outline or blocked cells. | M |
| M2 | Cores are four stat multipliers (for example −15% cooldown, −25% module HP). They do not change how a run plays. | [code] `campaign.js` | Rule-bending cores: an outline, a starting rule, one unique active ability. This also gives the meta something worth unlocking. | M–L |
| M3 | Skill is steering only. Weapons aim and fire themselves. Tester feedback on 10-08 called it "AFK-able". | Codex history; [research] Galaxy Siege criticism | One active verb, tied to the core (M2). Decide which after a playtest. | M |
| M4 | Losing a module is pure loss: no refund, no recovery. Captain Forever Remix players complain about "losing more than you gain". | [code] `moduleSellRefund` returns 0; [research] | Detached chunks drift for a few seconds and can be flown back into for a cheap re-attach. You liked the drifting-chunks idea on 10-14; it was never built. | M |
| M5 | The card pool is 40, with about 19 picks per run. A player sees most of it every run. Early weights are 75% common. | [code] `cards.js` | Grow to 60–80 with a majority that shapes builds. `research/cards-2026-10-21/proposals.md` already holds two to three times the shortlist. | M |
| M6 | Too many systems for the first hour: Build layout, upgrade trees, cards, Doctrines, and four Hangar tabs (Modules, Cores, Calibration, Research). GUNBOAT-8's top complaint is an overwhelming shop. | [seen]; [research] | Fold Calibration into Cores. Make the first branch of each family free, so trees matter in run one; keep licences for specialisations. | S–M |
| M7 | Every licensed module is always in the shop, so the best build is solvable. More licences also dilute the card pool (duos get rarer). | [code]; [research] TerraTech Legion | Before a run, pick 6–8 licensed families as the loadout. | M |
| M8 | Drift handling is the most common refund reason among peers. | [research] | An optional auto-brake assist, on by default for new players. It changes physics for every input the same way. Track first-session quits in telemetry. | S |
| M9 | Placed modules cannot be moved (your decision of 09-08). Peers report late-run placement turning into a chore. | Codex history; [research] | Consider a "swap two modules" action during breaks. | S |
| M10 | Known pricing gap: buying a copy after upgrading may be cheaper than upgrading first. | Codex note 10-16, unverified | Reproduce with `tools/pricing-preview-check.cjs`, then close it. | S |
| M11 | Firing arcs are a proven counter to blobs, but you dropped the idea on 10-16. | [research] | No action. M1 covers the same problem a different way. | — |

Things that are already right **[research]**: Build only between waves; adjacency combos; shape-based handling; cards that never name unlicensed modules; Endless kept separate.

## Priority list

**Do first — cheap, and they change the first ten minutes**

1. L1 — first-run taste of combos and duo cards.
2. L2 + L3 — Fragment rewards and licence prices.
3. V2 + V1 — camera start zoom and background layers.
4. V8 + V4 — Matter shards and louder player fire.
5. L7 + M10 — simpler menu; close the pricing gap.
6. L4 — telemetry for real run and break time.

**Next — the identity work**

7. V7 + L5 — one break screen with the ship on it.
8. M1 + M2 + M3 — cores with outlines, rules and an active ability.
9. M4 — recoverable drifting chunks.
10. M5 + M7 — bigger card pool; pre-run loadout.
11. V6 + V5 — boss art; swarm separation.
12. L6 — objective waves and sector choice.
13. V10 + L8 — results screen and milestones.

**Later**

14. L9 difficulty tiers; M8 handling assist; M9 swap tool; M6 Hangar simplification; V3 ship silhouette; V9 edge arrows.
15. Store framing: "wave roguelite where you build the ship", builder shown first. The name still clashes with Supergiant's Bastion.

## Your answers, 2026-11-11

- **Swarm size.** The 400-enemy late waves are deliberate, taken from Stellar Swarm. V5 is rewritten: keep the count, fix how it reads.
- **Playtime target.** Similar to GUNBOAT-8 and other roguelikes. GUNBOAT-8 aims at 35–50 minutes per winning run; Bastion's estimate is 25–35, so run length is in range. Unlocking everything takes about 45 wins, roughly 20–25 hours of winning runs alone. That is long but normal for the genre, so L3 drops in priority. L2 (the first runs buy nothing) stays at the top.
- **Placed modules.** They stay fixed. A module can be removed, not moved. M9 is closed.
- **Loadout limit (M7).** Open. Options and a recommendation are below.
- **Dash, and mouse-controlled weapons (M3).** Researched across 15 games; summary below, full evidence in `research/controls-2026-11-11/`.

### Dash and mouse-controlled weapons — what the research says

Web research only; nothing was built or played. **[research]**

- **A dash alone does not fix passive play.** Death Must Die shipped dash plus auto-attack; its developers later wrote that dashing was the only skill and too limiting.
- **GUNBOAT-8's dash could not be confirmed.** The store page, itch page, forum and patch notes document drift only.
- **Aiming many guns with one cursor is a downgrade.** Brotato players keep auto-aim because manual aim points every weapon the same way. Bastion has 20 or more.
- **Mouse-aimed weapons collide with mouse-follow steering.** The cursor sits ahead of the ship, away from the enemies chasing it, and touch has no cursor. Starsector and Cosmoteer manage it only by flying on keys.
- **Auto-aim's real weakness is priority, not accuracy.** 20 Minutes Till Dawn players keep asking for bosses and elites to be targeted first. That points to marking targets, not aiming.
- **Games with no button give steering a second job:** gems, ore, expiring scrap. Bastion has nothing to fly toward.

Parked-ship test **[sim]**: four runs on a fresh save with no steering, buying cannons (and shields) each break. The ship died in wave 2, 2, 3 and 4. So the current Waves build is not "AFK-able" early on; that comment came from one tester on an older Endless build. An active verb would be for depth, not to stop idling.

Ranked proposals (details in `research/controls-2026-11-11/proposals.md`):

| # | Proposal | What it is | Size |
| --- | --- | --- | --- |
| 1 | Salvage Run | Elites, bosses and each group's last enemy drop a Matter cache that expires in 10 s. A module that breaks off drifts for 8 s; fly into it to re-dock it at 40% HP. No button. Covers M4 and V8 too. | M |
| 2 | Kill Zone | Right click (or Space) marks a circle for 6 s. Every weapon that can reach it fires there, with a bonus per different weapon family hitting it, so you turn the ship to bring a side to bear. | S–M |
| 3 | Manual Trigger | Switch Gravity Well and Pulse Nova to manual and fire them on one key. This is the safe form of "some weapons are yours": you choose when, not where. | S–M |
| 4 | Reactor Surge | An overdrive button that exists only if you built Reactors. | S–M |
| 5 | Core abilities | One verb per core (a dash could be the Striker core's). | M–L |

Not recommended: a dash for every ship (close to the rejected Afterburner), and cursor-aimed weapons.

### Loadout limit — options

| Option | How it works | For | Against |
| --- | --- | --- | --- |
| A. Pre-run loadout | Before the run, pick 6–8 licensed families. Only those are in the shop; copies are unlimited. | A decision before every run; a focused card pool. | No decision at all until a player owns more than 8 licences. A "best 8" can be solved. |
| B. System cap in the run | Every licensed family is in the shop, but one ship can run at most 6 families. Copies are unlimited. Removing every copy frees the slot. | Works from the first run. The choice reacts to the cards and duos you are offered. No new menu. This is the genre norm: Vampire Survivors, Brotato and HoloCure cap weapons at 6, Deep Rock Galactic: Survivor at 4. | Needs a clear "4 / 6 systems" readout. |
| C. Draft | Start with the core's 2–3 families. After each boss, add one of three offered families to the shop. | Different runs; bosses give a real reward. | Luck can deny a combo. Hull Rupture players complain that a random shop decides the run. |

Recommendation **[inference]**: B first. It is the smallest change, and cores can later vary the cap (ties into M2). Try C only if runs still feel the same after B.

## Outcome of the first visual pass, 2026-11-11

Tried in the test build `outputs/experiments/2026-11-11-space-vfx/` and decided by the user:

- **Rejected and removed:** V1 nebula background, V8 Matter shards, V9 edge arrows for enemy groups (the boss locator stays as it was), V3 engine glow on the player ship. Do not propose these again.
- **Rejected:** five alternative art styles from Gemini. The existing style stays; no realism, no isometric or 3D look.
- **Kept in the test build:** V6 boss sprites (Siege Ring v1, Pursuer v2, Storm Ring v4), Bulwark shield folded into HP with no ring, one pink colour for ordinary enemy shots, brighter hit sparks and kill bursts, larger player shot sprites.

## Direction, 2026-11-11 (second reply): improve, don't change

You asked for improvements to the game as it is, with design changes kept as ideas only.

**Improve — no rule or balance change**

1. V1 background depth, with a palette shift after each boss.
2. V8 cosmetic Matter shards that fly into the core (Matter is still credited on the kill).
3. V3 engine glow that shows thrust and which way is forward.
4. V9 edge arrows for off-screen enemy groups.
5. V4 brighter player fire: tracers, muzzle flashes, hit sparks.
6. V7 break screen that shows the ship beside the cards.
7. V10 results screen: final ship, cards taken, kills, what killed you, progress to the next unlock.
8. V6 boss sprites.
9. M10 check and close the copy-after-upgrade pricing gap.
10. L4 telemetry for winning-run time and time spent in breaks.

**Tuning — numbers only, your call**

- L2 early Fragment rewards, so each of the first runs buys something.
- L1 fresh save starts with one combo pair; one duo or rule card guaranteed by wave 3.
- V2 closer starting camera. Not purely visual: spawn distance follows the zoom, so it shifts early difficulty.
- V5 swarm spacing and more one-hit fodder.

**Ideas — design changes, parked**

- Loadout or system cap (M7). Not mandatory. It answers a problem nobody has observed yet (every run converging on the same build). Revisit only if playtests show that.
- Salvage Run, Kill Zone, Manual Trigger, core abilities (M3).
- Rule-bending cores (M1, M2), objective waves and sector choice (L6), difficulty tiers (L9).

### Weapon tiers like GUNBOAT-8 (Turret I, II, III)

Not the best fit **[inference]**.

- GUNBOAT-8 merges duplicates into higher tiers because its boat has 8 fixed slots. Merging is how a full boat keeps growing. Its top tier adds a new property, and a merge refunds 1 scrap.
- Bastion has no slot limit. A second cannon is a second tile, which is the game's identity. Merging three cannons into one would shrink the ship and break neighbour combos.
- Bastion already has tiers in another form: family ranks 1–4 with branches, shared by every copy. Adding merge tiers would make three ways to strengthen one gun (copies, ranks, tiers), on top of an interface that is already heavy (M6).
- What is worth borrowing without changing rules: name the family ranks Mk I–IV, and make the last rank of each branch add a visible new behaviour rather than a bigger number (Twin volley and Piercing shot already do).

## Open questions for you

1. Target price?
2. Loadout: option A, B or C above?
3. Active verb: Salvage Run, Kill Zone, Manual Trigger, or none for now?
4. The next time real people play the build, what is the one thing you most want to find out? For example: "do they understand combos?", "is the first ten minutes fun?", "is it too easy?". The answer decides which fixes go in before that test.

## Sources

- `notes/stellar-swarm.md`, `notes/gunboat-8.md`, `notes/modular-ship-peers.md`, `notes/genre-fit.md` — web research, each claim labelled and linked.
- `research/cards-2026-10-21/` — earlier card research across 13 games.
- `screens/` — eleven screenshots of the audited build.
