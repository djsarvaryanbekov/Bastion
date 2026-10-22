# Proposals: Bastion run cards

Written 2026-10-22. These build on `patterns.md` (taxonomy P1.x, structural rules R1–R11) and `notes/*.md` (evidence).

All numbers are provisional starting points for a playtest. Nothing here is tested or balanced.

Overlap flags compare against the user's rejected list (`00-brief.md`). For the rejected cards I know only their names, not their exact effects, so each flag says what I assumed.

**Existing systems I checked so that cards don't duplicate them (`run-upgrades.js`):**
- Ember: Spreading fire (burn spreads on death), Fire trail.
- Cryo: Freeze.
- Missile: Cluster.
- Mine: Chain detonation / Fragments.
- Laser: Split beams.
- Rail: Magazine.
- Cannon: Twin / Fan / Pierce.
- Gravity: Collapse.
- Shield: Reserve.
- Flak: Defensive cloud.

So burn "contagion", fire trails from flames, cluster warheads and mine chains are **already in the game** and are excluded below.

## Proposed structure first (the cards depend on it)

| Tier | Where it appears | Content | Evidence |
|---|---|---|---|
| Common | Any break | Current stat cards (Calibration, Overclock, Plating…) | Every game uses stat filler; keep it, never above common (P1.1) |
| Rare | Any break, weight rises with wave | Family-specific rule tweaks with counters or triggers | StS counters, 20MTD trigger families |
| Duo | **Earned**: two named families edge-adjacent on the grid → **guaranteed** slot in the next offer | Pair rules that make two statuses or verbs collide | Hades duos, 20MTD synergies, BB adjacency recipes, ND recipe guarantee (R2) |
| Doctrine | Breaks after boss waves 5 / 10 / 15 only. 1 of 3, skippable, 1 free reroll; max 3 per run | Run-defining rule changes, usually with a steering cost | VS Arcanas (3/run), StS boss relics, BB round-8 subclass, 20MTD level-20 evolution (R1) |

Supporting rules:
- **R2/R3:** an eligible duo is guaranteed in the next offer. Build shows a thin link line between eligible pairs, and the card shows both family icons.
- **R4:** never offer a card for a missing family.
- **R6:** add a **Skip** button that pays +X Matter.
- **R10:** active rare, duo and Doctrine cards get a HUD chip with a counter or a dormant (greyed) state.

---

## A. Doctrine candidates (milestone rule-changers)

### A1. Castaway Protocol — Doctrine (or Epic)
- **Effect:** when a weapon module detaches (destroyed, or cut off with its branch), it becomes a **drifting derelict** for 8 s. The derelict keeps firing its own attack at 50% fire rate from where it floats, then breaks apart. Max 6 derelicts at once.
- **Pattern:** bad event → payoff + "your weapon from elsewhere" (P1.4, P1.8).
- **Inspired by:**
  - GUNBOAT-8 Lifebuoy: a weapon detaches and floats; the most-cited "not a stat" rune.
  - Hades Lightning Rod: debris becomes turrets.
  - ND Loaded Mines / Death Blossom: your gun fired from another spot.
- **The transformation:** Bastion is the only studied game with *cut-off branches*. One hit on a joint can launch a whole flotilla of derelicts into the swarm, at the spot where the enemies broke through.
- **Why it's fun here:** pillars 1 and 4. The worst moment in a Bastion run, losing an arm, becomes a firework. ND players share exactly this kind of spectacle [P].
- **Build-around:** yes.
  - It rewards long, cheap weapon arms (Cannon/Scatter), Mine Layers (derelicts seed mines in the swarm) and Outrider (B2).
  - It creates real tension against Bulkhead turtling.
- **Readability:** debris already renders with its module art and aim (`spawnTileDebris` stores `moduleType`/`moduleAim`). It keeps the muzzle flashes and fades with a small ring.
- **Hook:** `detachTile` pushes a derelict, and a new `updateDerelicts` uses `fireAttack` from a world origin.
  - New tech: `findTarget` and `fireAttack` currently take a ship tile. A world-origin variant is needed.
- **Risks:**
  - Losing modules could become desirable. The rebuy cost and the 8 s limit keep loss a net negative.
  - Performance: the 6-derelict cap.
  - Overlap: **"Salvage Drones" / "Sacrificial Plating"**, if those were drones or explosions on loss. The difference the evidence supports is that the lost module *keeps being itself*.
- **Cost:** M.

### A2. Snecko Shipyard — Doctrine
- **Effect:** every break, each module's Build price rolls between 0.5× and 1.6×, shown on the price tag. All card offers show **4** cards instead of 3.
- **Pattern:** a variance tax that redirects drafting (P1.5).
- **Inspired by:** StS Snecko Eye, repeatedly rated the strongest relic. Randomised costs make players *seek expensive cards* [P].
- **The transformation:** the randomness hits Bastion's Matter shop, so each break asks "what's cheap this time?" Cheap rolls on high-tier families pull the build toward them.
- **Why it's fun here:** pillar 5. It turns the break into a market.
- **Build-around:** soft. It pairs with Collector/Matter cards.
- **Readability:** price tags coloured green or red relative to normal.
- **Hook:** the Build price function plus `cards.js` `OFFER_SIZE` read from the mod. Prices roll in `enterIntermission`.
- **Risks:** price escalation per copy must still apply on top. A bad roll on the family you need is the cost (counterplay: buy something else).
- **Cost:** S.

### A3. Lean Hull — Doctrine
- **Effect:**
  - Weapons gain +6% damage and +6% fire rate for each module below 14 (counted live, max +60%).
  - +1 free card reroll per break.
- **Pattern:** reward restraint / give up a pillar (P1.5, P1.12).
- **Inspired by:**
  - VS Silent Old Sanctuary: empty slots give power, plus extra rerolls.
  - HoloCure Solo stamp.
  - ND Hidden Power: a pruned identity.
- **The transformation:** in Bastion, *losing* modules mid-wave raises the bonus. That's a built-in comeback, and only possible because modules detach.
- **Why it's fun here:** pillar 1. Ship shape becomes a strategy (a small, dense bastion), and every Build purchase becomes a yes/no.
- **Build-around:** yes: few high-tier weapons, Reactor-dense cores.
- **Readability:** a chip shows the current bonus ("+24%").
- **Hook:** the damage multiplier in `updateWeapons`; `weaponCooldownRate`; the reroll count.
- **Risks:** it conflicts with buying copies, which is the point. Tune the threshold (14) by playtest.
- **Cost:** S.

### A4. Heavy Frame — Doctrine (offered at wave 15 only)
- **Effect:**
  - All modules +40% HP and weapons +25% damage.
  - From now on Build can only rebuy modules into cells that were occupied when you took this card. No new cells.
- **Pattern:** lock-in for power; timing is the decision (P1.5).
- **Inspired by:** Brotato Knot / Handcuffs / Shackles: bad early, excellent late [S].
- **The transformation:** the "price" is Bastion's ship growth, and it is offered only late so it acts as a finisher.
- **Why it's fun here:** pillar 1. It commits the ship's final shape before the last boss.
- **Build-around:** no; it's a finisher.
- **Readability:** locked cells show a faint frame outline in Build.
- **Hook:** `validPlacement` (a whitelist of cells) and the hull/damage mods.
- **Risks:** it feels bad if taken early, so it is only offered at the wave-15 Doctrine.
- **Cost:** S.

### A5. Combined Arms ⇄ Doctrine of Focus — Doctrine pair (taking one banishes the other)
- **Effects:**
  - **Combined Arms:** each weapon fires 8% faster per *distinct* weapon family edge-adjacent to it (max 4).
  - **Focus:** weapons of your most numerous family deal +35% damage; every other weapon family deals −15%.
- **Pattern:** whole-grid count rule plus an exclusive fork (P1.9, ND forks).
- **Inspired by:**
  - BB Food: bonus per *different* neighbour type.
  - Brotato Spider vs Focus.
  - ND Assault vs Defense Drones: each banishes the other.
- **Why it's fun here:** pillar 2. Every later purchase becomes "does this keep my mix or my monoculture?"
- **Build-around:** yes.
- **Readability:** Build shows a "+16%" tag on each weapon (Combined Arms), or highlights the focused family (Focus).
- **Hook:** `weaponCooldownRate` / `resolveWeaponDefinition`, plus an adjacency scan on grid change.
- **Risks:** overlap with **"Twin Link"**, if that rewarded adjacent copies. Combined Arms rewards the opposite (distinct neighbours).
- **Cost:** S.

### A6. Rerouted Power — Doctrine family (StS "+1 energy, lose a subsystem")
- **Shared reward:** all future offers show 4 cards.
- **Each variant removes one subsystem** (one of them is offered):
  - **Dry Dock:** no 30% break repair.
  - **Lean Ledger:** kills give no Matter; the wave-clear bonus is tripled.
  - **Sealed Schematics:** no more family upgrades this run.
- **Pattern:** same reward, different cost. The cost *is* the decision (P1.5).
- **Inspired by:** StS's 10 energy boss relics. The liked ones have costs you can route around (Sozu, Cursed Key) [P].
- **Deliberately excluded variants:** hiding spawn directions (Runic Dome is hated) and capping firing weapons (Velvet Choker is hated).
- **Cost:** S each.

---

## B. Positional / grid cards (rare and epic)

### B1. Core Conduit — Epic
- **Effect:**
  - Every 4 s the core sends a spark along its row and column in all 4 directions, one cell per 0.2 s, through **connected** modules.
  - Each weapon the spark passes fires immediately (cooldown reset). That shot gets +10% damage per cell the spark has travelled.
  - The spark stops at a gap.
  - A Reactor on the path re-emits a new spark perpendicular to it.
- **Pattern:** a travelling buff along a path (P1.9).
- **Inspired by:** BB Engineer charges, which move along printed paths and scale with distance [S].
- **The transformation:** the "path" is the ship's spine. Gaps left by destroyed modules break the circuit, so the detach pillar matters. It also rewards a cross-shaped ship over a blob.
- **Why it's fun here:** pillars 1 and 2. Layout becomes a circuit you watch fire.
- **Build-around:** yes: long arms, Reactors at joints, Rail/Missile at arm ends.
- **Readability:** the arc VFX runs along the cells, so you can see which guns it triggered.
- **Hook:** a timer in `updateSupportModules`, a grid walk over `ship.tiles`, `tile.cooldown = 0`, and a one-shot multiplier.
- **Risks:**
  - It is strong with long-cooldown weapons (a Rail reset is worth more). Cap it at once per 4 s per weapon.
  - Reactor Link was skipped in New_Visuals. This version is core-based, so it does not depend on Reactor art.
- **Cost:** M.

### B2. Outrider — Rare
- **Effect:** the weapon farthest from the core (in grid steps; all ties count) fires every attack twice. The second shot is at 60% damage, 0.15 s later. It is marked with a chevron.
- **Pattern:** one crisp positional rule (P1.9).
- **Inspired by:** StS Gold-Plated Cables (the rightmost orb triggers twice) and Frozen Core (empty-slot rule).
- **The transformation:** in Bastion the farthest module is also the most exposed and the first to be cut off. Reward and risk sit on the same tile.
- **Why it's fun here:** pillars 1 and 4. It's a reason to build an "arm" and defend it.
- **Build-around:** yes: Rail or Missile at the tip, Bulkhead behind it, Castaway (A1).
- **Readability:** the chevron sits on the tile, and the double muzzle flash is visible.
- **Hook:** recompute on grid change; reuse `pendingBurst` / `burstCount` on that tile.
- **Risks:** overlap with **"Edge Battery"**, if that buffed all edge modules. Outrider is a single tile, which follows the StS lesson.
- **Cost:** S.

### B3. Balanced Keel — Rare *(needs a handling check first)*
- **Effect:** if the total Matter value of modules left and right of the ship's centreline differs by ≤20%, turn rate +25% and both flanks' weapons fire in synchronised volleys (+15% fire rate).
- **Pattern:** a symmetry objective (P1.9).
- **Inspired by:** BB Scale (compares the value of its two sides).
- **The transformation:** only a *ship* can make symmetry felt in handling.
- **Hook:** compute on grid change, plus the handling stats.
- **Risks:** I have not verified whether Bastion's handling already models mass asymmetry. Check `ship-handling.js` before committing.
- **Cost:** M.

---

## C. Duo cards (earned by adjacency, guaranteed in the next offer)

Duos use only pairs **without** an existing neighbour rule. The existing ones are Ember→Cannon/Scatter/Flak and Cryo→Rail/Missile.

If the pair is later broken (moved or destroyed), the duo goes **dormant**: its chip greys out until the pair is adjacent again. This gives placement and module loss meaning, and it's the counterplay. Each duo is one sentence long.

| # | Duo | Pair | Effect | Inspired by | Cost |
|---|---|---|---|---|---|
| C1 | **Thermal Shock** | Ember + Cryo | An enemy that is burning *and* chilled bursts for 40 damage in 70 px; both statuses clear (1 s cooldown per enemy). | 20MTD Frost Fire/Overload (status × status); Hades Privileged Status | S (existing fire + cold VFX) |
| C2 | **Storm Surge** | Pulse + Arc | Enemies knocked back by Pulse are struck by an arc that chains to 2 neighbours. | Hades Sea Storm (knock-away triggers lightning), its standout duo | S |
| C3 | **Cold Lens** | Laser + Cryo | Laser beams leave a 1.5 s frost line; enemies crossing it are chilled. | Hades Cold Embrace / Blizzard Shot; 20MTD Magic Lens (zone on a path) | S |
| C4 | **Lensing** | Rail + Gravity | Rail slugs passing through a gravity field split into 3 slugs at 50%. | 20MTD Magic Lens / Focal Point (a projectile passing through a zone gains power) | S–M |
| C5 | **Static Discharge** | Arc + Laser | Ranged enemies hit by the laser are *Jolted*: their next shot discharges into themselves and enemies within 90 px instead of firing. | Hades Static Discharge (enemy attacks hurt themselves); answers Bastion's bolter/gunner/sniper formations | M (needs an enemy-shot hook) |
| C6 | **Quench** | Repair + Cryo | Repair Array pulses also chill enemies within their radius. | 20MTD Sight Magic ("this source now applies on-hit"); VS Sarabande (support → offence) | S |
| C7 | **Event Horizon** | Gravity + Mine | Mine Layers drop their next mine at the centre of each new gravity field. | ND Vortex-mines, so strong they outclassed all other mines and were nerfed [S] | S. **Overlap: "Singularity Mines" was rejected and is probably this idea. Don't ship unless the user re-opens it.** |

The C1–C6 duos also count as triggers for a later "status" card (P1.3), for example "each duo trigger this wave adds +1% damage" (counter chip).

---

## D. Rare family cards (rules, not stats)

### D1. Return to Sender — Rare (requires Flak)
- **Effect:** each enemy projectile destroyed by a Flak burst flies back at its shooter (or the nearest enemy) as shrapnel, for ×3 its damage.
- **Inspired by:** ND Reflect / Antimatter / Counter Artillery (offense that is defense); Hades Athena Deflect.
- **The transformation:** Flak is Bastion's dedicated interceptor with deliberately low damage. This gives it a kill role against exactly the ranged types it faces, and placing Flak toward the ranged side of the swarm matters.
- **Readability:** shrapnel streaks back along the incoming line.
- **Hook:** where Flak clears projectiles (`findNearestHostileProjectile` → clear), spawn a friendly projectile.
- **Cost:** S.

### D2. Tenth Round — Rare family card (replaces "{module} Calibration" at rare)
- **Effect:** every 8th shot of each {module} is a heavy round: ×3 damage plus knockback. The counter persists across waves and is shown on the card chip.
- **Inspired by:** StS Pen Nib / Nunchaku. Players time the trigger for elites [P].
- **Why here:** with auto-fire, the counter gives a weapon a visible rhythm. Rails and Cannons ticking up toward a big shot read well.
- **Hook:** a per-tile shot counter in `fireAttack`, plus a multiplier.
- **Cost:** S.

### D3. Burning Wake — Rare
- **Effect:** while thrusting, the ship leaves a fire trail behind its stern that lasts 1.5 s. Enemies crossing it start burning (Ember burn values, or a base 6 dps if no Ember is installed).
- **Inspired by:** ND Deadly Wake / Leviathan (movement becomes damage, among the most-shared builds); Hades Razor Shoals; HoloCure MiKorone.
- **The transformation:** most Bastion swarms chase directly (`directChase`), so flying a loop drags them through the fire. Coasting stops the trail, which rewards switching between thrust and drift without penalising either.
- **Readability:** existing fire-vfx along the flight path.
- **Hook:** `updateMovement` (thrust ≠ 0) pushes trail points; collision against the enemy spatial grid.
- **Risks:**
  - Overlap with **"Afterburner" / "Momentum"** (rejected), if those were speed-scaled stats. This is a visible behaviour, which is the distinction ND's evidence supports.
  - The Ember *Fire trail* branch leaves fire where the flame hits; this one follows the ship's path.
- **Cost:** S–M.

### D4. Last Call — Rare
- **Effect:** when the wave timer stops spawns (the sweep begins), all weapons overcharge for 8 s at +60% fire rate.
- **Inspired by:** StS fight-clock relics (Stone Calendar, Incense Burner); BB Sloth (payoff on a fight timer).
- **The transformation:** it ties directly to Bastion's own "clear the swarm" rule, so the sweep becomes a power moment.
- **Readability:** a HUD countdown plus a muzzle tint.
- **Hook:** `beginSweep`.
- **Cost:** S.

### D5. Weld Flare — Rare (requires Repair)
- **Effect:** each Repair Array pulse also deals its repaired amount ×3 as damage in a 90 px ring around the repaired tile.
- **Inspired by:** VS Sarabande of Healing, an S-tier universal Arcana [P].
- **Why here:** support placement becomes a positional weapon. Put the Array where the swarm hits.
- **Risk:** repair waits 2 s without hull damage, so the effect fires in lulls. It may be weak; check in a playtest before investing.
- **Cost:** S.

### D6. Last Bulkhead — Rare (stacks ×2)
- **Effect:** once per wave, the first module that would be destroyed survives at 1 HP instead. A bracket on its hull bar shows while this is armed.
- **Inspired by:** Brotato Tardigrade (per-wave safety valve with a visible armed state) [S].
- **Why here:** in Bastion one lost joint can cut off a branch, so this prevents a cascade. It's grid-specific value without a stat.
- **Hook:** `applyDamageToTile` / `destroyTile`.
- **Cost:** S.

### D7. Brittle — Epic (requires Cryo)
- **Effect:** chilled enemies below 15% HP shatter instantly, chilling enemies within 80 px. Bosses and Colossus are immune.
- **Inspired by:** Hades Winter Harvest (chilled foes at 10% shatter and chill neighbours); VS Out of Bounds.
- **Risks:**
  - The %HP execute follows the 20MTD warning about scaling HP, so threshold and immunity are the dials.
  - Overlap with **"Superconductor"** if that was a Cryo combo.
- **Cost:** S.

---

## E. Break and offer cards (pillar 5)

### E1. Dark Signal — contract (offered as a 4th, separate button at some breaks; waves 2–16 only)
- **Effect:** accept a shown curse for the next 2 waves: one of +30% enemies, ranged enemies ×1.5, or no kill Matter. If you clear both waves, the following break offers 3 Doctrine-tier cards.
- **Inspired by:** Hades Chaos (curse now, blessing later; "among the best value" [P]); Brotato Bait (forecast contract); GUNBOAT-8 '!' nodes.
- **Payout timing:** you collect only after surviving, so it can't be exploited like HoloCure Halu.
- **Hook:** `startWave` / `completeWave`. Endless is excluded.
- **Risks:** overlap with **"Mercenary Contract"**, if that was a paid contract. This one is a risk-and-delay contract with a shown curse.
- **Cost:** M.

### E2. Amplifier — Rare
- **Effect:** the next card you pick is applied 3 times (respecting max stacks).
- **Inspired by:** 20MTD Specialize, which creates memorable spikes [P].
- **Cost:** S.

### E3. Skip with value — system rule, not a card
- **Effect:** skipping the pick pays 4 + wave Matter.
- **Inspired by:** VS Skip; ND banking points (Ataraxia).
- **Optional card on top, "Ascetic":** each skipped pick permanently adds +4% fire rate, shown as a counter.
- **Cost:** S.

---

## F. Considered and parked (evidence exists, but blocked or weak here)

| Idea | Source | Why parked |
|---|---|---|
| Burn contagion on death | ND Corrosion, HoloCure Black Plague, StS Specimen | Already the Ember "Spreading fire" branch |
| Corpse charge | HoloCure I'm Die, ND Rupture | Too close to the existing Volatile Hulls card and the Missile cluster |
| Recruit the beaten boss | GUNBOAT-8 | Probably the rejected **"Trophy Turret"**; L cost |
| Helm Beam (lasers sweep along the ship's heading, ×2.5) | Hades Cold Embrace | Close to the rejected **"Firing Line"**. Strong evidence, so revisit only if the user wants a skill-aim card |
| Frame overlay (placed 2×2 zone) | BB bags | L cost (new Build UI) |
| Stand-still / coast-only stats | Brotato, ND Aegis | The documented trap, and already rejected |
| Halve the HP of everything on screen | VS Infinite Corridor | Strong but generic; no pillar changes it |

---

## G. Second-batch proposals (Cobalt Core, Balatro, DRG: Survivor, Luck be a Landlord)

### G1. Rule rewrites — Rare (one sentence each; requires the named families)
These change what *counts as* a neighbour or a combo, not a number (pattern P1.14).

| Card | Effect | Code helper it changes |
|---|---|---|
| **Wide Ignition** | Ember ignites diagonal neighbours too, so its whole 3×3 counts | Ember ignition neighbour check |
| **Cold Steel** | Cannons count as Cryo for adjacency: a Cannon next to a Rail gives Shatter, and next to a Missile gives cold payloads | `hasCryoNeighbor` |
| **Bulkhead Relay** | Bulkheads also count as a half-strength Reactor for weapons in their 3×3 | `weaponCooldownRate` |
| **Open Shatter** | Shatter (+25% vs chilled/frozen) applies to every weapon's hits, not only Rail next to Cryo | projectile hit (`shatterHit`) |

- **Inspired by:**
  - Balatro Four Fingers / Smeared / Pareidolia. LocalThunk called Four Fingers a "huge teachable moment".
  - DRG element conversion (Refrigerated Gunpowder, Pan Fried Shells).
- **The transformation:** the "definition" being rewritten is Bastion's grid adjacency, so the right answer in Build changes the moment you take the card.
- **Readability:** the Build tooltips that already explain links ("Shatter linked / unlinked") read the card.
- **Risks:**
  - Text must stay one sentence.
  - The Pareidolia trap does not apply yet, because there are no family-countering bosses.
  - Cold Steel vs Ember: a Cannon that counts as Cryo should still be ignited by Ember; say so in the text.
- **Cost:** S each (helper change + tooltip strings + 15 translations).

### G2. Arc Spine — Epic
- **Effect:** an arc links your two weapon modules that are farthest apart and damages every enemy crossing the line (20 dps, scaled by wave). If one end is destroyed, the arc jumps to the next-farthest pair.
- **Pattern:** ship shape as weapon (P1.15/P1.10).
- **Inspired by:**
  - DRG Conduit / Electrical Tether (arcs between constructs and the player).
  - Hades Cold Embrace: the beam is aimed by body position.
- **The transformation:** the line rotates with the hull, so **turning with A/D sweeps it through the swarm**. It's a steering skill check with no aim input, and a wide ship means a long arc.
- **Why it's fun here:** pillars 1 and 3. Building wide becomes a weapon choice, and wide ships are also the ones that lose tips.
- **Readability:** existing arc VFX drawn as a line.
- **Hook:** compute the pair on grid change; a per-frame segment-vs-enemy check through the spatial grid.
- **Risks:**
  - It could become always-on damage; tune dps and add a 1.5 s on / 0.5 s off flicker if needed.
  - Overlap with **"Firing Line"**, if that fired weapons along the heading. Here no weapon changes; the hull becomes the emitter.
- **Cost:** S–M.

### G3. Hollow Strut — Rare (Build item card)
- **Effect:** gives 2 Strut tiles to place in Build. A Strut has no function and **cannot be hit or destroyed**, but it still connects modules for the detach check. Taking the card costs −10% core HP.
- **Pattern:** shape change with a real cost (P1.15).
- **Inspired by:** Cobalt Core Tridimensional Cockpit (a part becomes an empty hole, at half max hull) and Extra Scaffold.
- **The transformation:** in Bastion, a link you can't cut means a branch can't be lost through it. It's a pure placement-puzzle card that only makes sense with Bastion's cut-off rule.
- **Build-around:** yes: long arms (Outrider, Arc Spine, Core Conduit) become safer.
- **Readability:** a thin open frame tile; shots pass through.
- **Hook:**
  - A new `strut` entry in MODULES (no hp, no mass).
  - `applyDamageToTile` and enemy collision skip it.
  - It counts in the `destroyTile` BFS.
- **Risks:** it needs a minimal tile drawing (a line frame, not New_Visuals art). Struts must not count as neighbours for combos.
- **Cost:** M.

### G4. Phase Lattice — Epic
- **Effect:** every 12 s, for 3 s, every module counts as adjacent to every other module. During the window, Ember ignites every Cannon/Scatter/Flak, Reactor and Bulkhead bonuses apply ship-wide, and Cryo links every Rail and Missile. A ring pulse telegraphs the window 1 s ahead.
- **Pattern:** timed global adjacency (P1.16).
- **Inspired by:** LBAL Telescope / Protractor.
- **The transformation:** the beat is visible, so you dive into the swarm just before it fires. It only works because Bastion's combos are spatial.
- **Hook:** a global flag read by the 4–5 adjacency helpers.
- **Risks:**
  - The Reactor bonus ship-wide is multiplicative with Reactor count, so cap it at the 3×3 maximum.
  - LBAL's warning: Clear Sky + Sun produced exponential stacking.
- **Cost:** S–M.

### G5. Flagship — Doctrine (replaces "Focus" in the A5 fork; Combined Arms ⇄ Flagship)
- **Effect:**
  - The weapon with the most occupied neighbours becomes the Flagship (crown mark). It gets +60% damage, plus +10% per occupied neighbour.
  - All other weapons deal −20%.
  - If the Flagship is destroyed, the title passes to the next most-surrounded weapon at the next break, not mid-wave.
- **Inspired by:**
  - DRG The Favourite, a build-defining commitment; DRG 1.1 made it a tag.
  - Brotato Focus.
- **The transformation:** the bonus is spatial. You armour the crown jewel, and enemies breaking through to it is a readable threat.
- **Hook:** compute on grid change and at break; damage multiplier.
- **Cost:** S.

### G6. Hazard Pay — Rare
- **Effect:** clear a wave without the core taking hull damage, and the next break offers 2 picks. A counter chip shows "clean".
- **Inspired by:** LBAL rent-clock items (Comfy Pillow); HoloCure Researcher's Coat (a reward for clean play).
- **Cost:** S.

### G7. Parked from the second batch
- **Copy a neighbour (Balatro Blueprint) / second firing point (Cobalt Core Ares V2):** strong evidence, but a mirrored muzzle overlaps Outrider (B2) and Core Conduit (B1). Keep one; revisit if Outrider is cut.
- **Salvage Maw / Wreckage Ledger (LBAL, Balatro Ceremonial Dagger):** it eats or absorbs lost modules for growth, which is probably close to the rejected **"Harvest" / "Salvage Rights"**.
- **Folding Wings (Cobalt Core Hunter Wings):** outer modules retract while coasting, and that's a coast-state rule (the P1.2 trap).
- **Ballast Matter (DRG Pickled Nitra):** banked Matter gives damage at a handling cost. DRG players hated the movement penalty.

---

## Ranked shortlist (final, all 13 games)

| Rank | Card | Tier | Why | Sources | Cost |
|---|---|---|---|---|---|
| 1 | **Duo system** + Thermal Shock, Storm Surge, Cold Lens, Lensing | Duo | Strongest pattern in the study; adjacency gate + guarantee fixes the #1 complaint | Hades, 20MTD, BB, ND, VS, HoloCure | M + S each |
| 2 | **Castaway Protocol** | Doctrine | Most Bastion-only design; now backed by 3 independent games | GUNBOAT-8, Hades, DRG (+ ND) | M |
| 3 | **Rule rewrites** (Wide Ignition, Cold Steel, Bulkhead Relay, Open Shatter) | Rare | Cheapest unique cards; change the right layout instantly | Balatro, DRG | S each |
| 4 | **Doctrine tier** + Snecko Shipyard, Lean Hull, Combined Arms⇄Flagship | Doctrine | Structural fix (R1); rule cards can be strong because they're scarce | VS, StS, BB, 20MTD, DRG, Brotato | M tier + S each |
| 5 | **Arc Spine** | Epic | Steering becomes the aim skill; ship width becomes a weapon | DRG, Hades | S–M |
| 6 | **Hollow Strut** | Rare | Pure placement puzzle around the cut-off rule | Cobalt Core | M |
| 7 | **Core Conduit** | Epic | Layout as a visible circuit | BB Engineer | M |
| 8 | **Phase Lattice** | Epic | Makes every existing combo pulse; flying on the beat | LBAL | S–M |
| 9 | **Outrider** | Rare | Risk and reward on one tile | StS | S |
| 10 | **Return to Sender** | Rare | Gives Flak a kill role vs ranged formations | ND, Hades | S |

Reserve, in order: Burning Wake, Dark Signal, Tenth Round, Last Call, Last Bulkhead, Static Discharge (C5), Brittle, Heavy Frame, Rerouted Power, Hazard Pay, Weld Flare.

**Suggested first implementation slice** (my recommendation, needs approval):
- The Duo framework with 4 duos.
- The Doctrine tier with 3 Doctrines.
- The 4 rule rewrites.
- Castaway Protocol.

That's about 12 cards. The existing stat cards stay as commons, and the current epics (Volatile Hulls, Glass Cannon, Overtime) move to the reserve for review.
