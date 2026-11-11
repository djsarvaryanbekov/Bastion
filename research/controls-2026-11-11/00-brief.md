# Brief — an active verb for Bastion

Researched 2026-11-11, web only (WebSearch / WebFetch). No game was played or watched for this.

## The game
PC top-down wave roguelite. 20 waves of 30–60 s, shop + card pick between waves, bosses at 5/10/15/20. Target winning run 35–50 min.

## Pillars
1. **Grid ship.** Modules (12 weapon types, shields, reactors, armor) bought mid-run, attached edge-to-edge, 20+ tiles.
2. **Neighbours combo.** Ember next to Cannon ignites shots, Cryo next to Rail shatters, Reactor boosts its 3×3, and so on.
3. **Drift flight.** W/S thrust, A/D turn, or hold LMB to follow the cursor and release to coast. Mouse, WASD and touch share one physics model.
4. **Swarms.** Grouped packs, up to ~400 enemies. Destroyed modules break off.
5. **Everything auto-fires.** Steering is the only skill. One tester called it "AFK-able".

## Constraints
- Firing arcs were considered and dropped.
- Cards "Ram Prow", "Afterburner", "Drift Gunnery" were rejected as invented, not researched.
- The mouse already steers (hold LMB = follow cursor).
- New art is costly; reuse existing VFX (fire, cold, arcs, rings, lines, debris).

## Question
Should Bastion add an active player verb, and which?
- **A.** A dash / boost.
- **B.** Some weapons player-controlled (mouse-aimed or manually fired), the rest automatic.
- **C.** Something else the evidence supports better (cooldown ability, target marking, overdrive, brake, a verb done through movement) — or nothing.

## What the current build does with input (read from `game.js`, label [code])
- Keys in use during a run: W A S D, B (build), P / Esc (pause). **Space, Shift, Q, E, R, F and the right mouse button are free.** The canvas already suppresses the context menu.
- Mouse: LMB held = turn toward the cursor and thrust; thrust scales with cursor distance (dead zone 12 px, full at 120 px). Released = coast.
- Touch: one floating joystick. A second finger is ignored, so it is free for one button. There is no cursor on touch.
- No gamepad code was found.
- Targeting: every weapon tile picks the **nearest** enemy in its own range (`findTarget`).
- Kills credit Matter directly. There are **no pickups**.
- Detached weapon wrecks that drift and keep firing already exist behind one card (Castaway Protocol, `spawnDerelict`).

## Labels used in every file
- **[S]** sourced fact, URL given.
- **[C]** community opinion, URL given. One post is one opinion; recurrence is stated separately.
- **[I]** my inference.
- **[?]** looked for, not found or not reachable.
- **[code]** read from Bastion's source today.

Player posts are paraphrased with the poster's handle and a link; only short phrases are quoted. Nothing in `proposals.md` has been built or tested.

## Evidence limits
- Steam review text is unreachable (the `appreviews` endpoint redirects to the store home page). Sentiment comes from Steam discussion threads, patch notes, wikis, one review site and Vaporlens summaries.
- Steam discussion search returned only the first page of results for each query (10 of 60–416). Counts of "recurring" are from that page plus the total hit count.
- Reddit is blocked. Fandom wikis are blocked. PC Gamer, GamesRadar and Prima Games pages did not load.
- Mindustry (wiki 404, search empty) and TerraTech Legion's aiming model could not be established.
- **GUNBOAT-8's dash could not be found in any source.** See its section in `notes.md`.
