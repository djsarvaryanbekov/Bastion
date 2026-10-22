# Patterns: run-card design across the studied games

Written 2026-10-22. Inputs: `notes/*.md` and `catalog/*.csv`.
Games: GUNBOAT-8, Slay the Spire (StS), HoloCure, 20 Minutes Till Dawn (20MTD), Vampire Survivors (VS), Brotato, Hades, Nova Drift (ND), Backpack Battles (BB), plus the second batch (see the "Second batch" section at the end).

Labels:
- **[S]** sourced: the link is in that game's notes file.
- **[P]** community opinion: the thread is in the notes file.
- **[I]** my inference.

Numbers are facts from the sources. Nothing here has been playtested in Bastion.

---

## 1. Taxonomy

Each pattern lists examples from several games, the evidence for why players respond, how it fails, and what it means for Bastion.

### 1.1 Flat stat ("+X%")
- **Examples:** Brotato's ~96 stat packages; HoloCure Stat Ups; ND T1 mods (Rapid Fire +15%); VS passives; Bastion's current 20 cards.
- **Evidence:**
  - Every studied game uses this as filler, not identity. In Brotato about 40% of items are stat packages, and the 60–70 rule-changers are the ones players talk about [S].
  - Hades II players call "+X% damage" duos and legendaries dull [P].
  - VS players call Arcanas "a change to the game, not a stat bump" when praising them [P].
- **Failure mode:** an offer that is three stat cards reads as "nothing happened".
- **For Bastion:** keep these as **commons only**. Never put them at the milestone tier. This matches the user's rejection of the current set.

### 1.2 Conditional stat (state-gated bonus)
- **Examples:** ND Aegis (no thrust); Brotato Statue, Barricade, Chameleon (stand still); HoloCure Rock Hard; 20MTD Siege → Stand your Ground; VS Tragic Princess (while moving).
- **Evidence:**
  - Conditions that **fight the core verb** are the most documented trap in the set.
    - Aegis "feels useless" [P].
    - Brotato's stand-still items needed 3+ buffs each [S].
  - These only work when a character or core already lives in that state: Chunky/Soldier in Brotato; Rampage cancels Aegis in ND [S].
  - HoloCure's Rock Hard works only because Quick Dash keeps the buff, creating a "dash, plant, fire" rhythm [P].
- **For Bastion:** "while coasting / while not thrusting" percentages were rejected (Drift Gunnery, Momentum), and the evidence agrees. Reward the **switch** between states or a **visible behaviour**, never a passive bonus for not flying.

### 1.3 On-event trigger (hit, kill, break, timer)
- **Examples:**
  - StS Pen Nib, Nunchaku (every 10th attack, counter persists).
  - 20MTD on-last-ammo family (6+ cards share one trigger).
  - StS Kunai/Shuriken/Fan (one trigger, three payoffs).
  - BB Goobert ("every 5 ★ activations").
  - GUNBOAT-8 Boarding Pike (one-shot kills stack).
- **Evidence:**
  - Shared trigger hooks create archetypes without a set-bonus system. 20MTD's Mini Clip became a deliberate synergy because six cards read "last ammo" [S].
  - Visible counters let players time triggers; StS players hold back so the 10th attack lands on the elite [P].
- **Failure mode:** invisible procs, and "After 5s" vs "Every 5s" wording traps (BB) [P].
- **For Bastion:** pick **one or two native triggers** and hang several cards on them. Candidates: module detached, frozen enemy shatters, Ember flame burst, sweep start, boss phase. Draw the counter on the card chip in the HUD.

### 1.4 Transformation (changes how a thing behaves)
- **Examples:**
  - Hades Daedalus Hammers (Spread Fire, Rocket Bomb).
  - 20MTD level-20 evolutions (1 of 3 per weapon).
  - GUNBOAT-8 Lifebuoy rune: a weapon leaves the ship and floats.
  - ND "your weapon from elsewhere": Loaded Mines, Death Blossom, Interceptor.
  - Blizzard Shot (Hades).
- **Evidence:**
  - Spectacle posts dominate the ND subreddit ("1760 rainbow missiles", the "Octolance") [P].
  - Lifebuoy is GUNBOAT-8's most-cited "rune is not a stat" example [P].
  - Hades players remember hammers that change playstyle and forget stat hammers [P].
- **Failure mode:** the change is too rare to fix a bad offer. Hades II players asked for hammer rerolls [P].
- **For Bastion — caution:** the Matter branch trees (`run-upgrades.js`) **already contain many verb rewrites**: Cannon twin/fan/pierce, Missile cluster, Laser split, Rail magazine, Cryo freeze, Mine chain/fragments, Ember spreading fire and fire trail, Gravity collapse. Cards must not repeat these. Card transformations should act at the **ship or grid level** (where a weapon fires *from*, what *debris* does, how modules *link*), not repeat a branch.

### 1.5 Rule-breaker with a cost ("give up X, become Y")
- **Examples:**
  - StS boss relics: +1 energy, lose a subsystem (10 variants).
  - ND Hidden Power (no weapon), Rapid Reconstruction (no shield), Overseer (can't fire).
  - Brotato Knot/Handcuffs/Shackles (lock-in).
  - VS Game Killer.
  - 20MTD Tomes (Glass: double damage, one hit kills).
- **Evidence:**
  - Snecko Eye is repeatedly rated StS's strongest relic. Its drawback **changes what you draft** [P].
  - Sozu and Cursed Key are liked because their cost can be routed around [P].
  - Hated drawbacks share one trait: they attack core skill or information. Velvet Choker (tempo cap), Runic Dome (hides intents), and old Hovering Kite ("actively works against you") [P].
  - Brotato lock-in items are bad early and excellent late, so timing *is* the decision [S].
- **For Bastion:** drawbacks should **steer the build** (what to buy, where to place) and leave counterplay. Never hide spawn-direction info, cap the number of firing weapons, or punish thrusting. Time-gate deadly costs, the way StS stops offering Ectoplasm after floor 18.

### 1.6 Synergy enabler / recipe (earned entry into the pool)
- **Examples:**
  - Hades duos: 28, one per god pair, gated by owning one boon from each.
  - 20MTD Synergies: 12, enter the pool only after 2–3 prerequisites.
  - ND Super Mods: 26, two named mods → a third.
  - VS evolutions.
  - HoloCure Collabs: a Golden Anvil spawns only when a pair is valid.
  - BB recipes: adjacency fuses after a won round.
- **Evidence:**
  - These are the headline positive in nearly every catalog: VS "evolution system", BB "deep item crafting", Hades duos as "jackpots", HoloCure collab discovery [S/P].
  - The 20MTD dev says synergies add depth **without diluting the pool**, which is why he prefers them over new perks [S].
- **Failure mode, the most repeated complaint in the whole study:** the recipe is met and RNG never offers it.
  - ND: met the recipe and saw nothing in 30 upgrades [P].
  - Hades: wanted duo never appears; prerequisites have to be memorised [P].
  - VS: "why didn't it evolve" threads [P].
  - HoloCure: wiki dependence [P].
- **Fixes devs shipped:**
  - ND 1.0 guarantees Ataraxia once its condition is met [S].
  - HoloCure v0.6 added an in-menu collab list [S].
  - VS added evolution hints on the level-up panels [S].
  - BB draws a blue line between recipe partners that turns yellow when they sit adjacent [S].
- **For Bastion:** with only ~19 picks at 1-of-3, a synergy card must be **guaranteed** in the next offer once earned and **signposted in Build** (highlight the qualifying pair). Bastion's gate can be **adjacency on the grid**, which is a stronger, visible signal than "owns two things". No other studied game except BB gates by position.

### 1.7 Status as currency (status → trigger, status × status)
- **Examples:**
  - VS Out of Bounds / Crystal Cries (frozen enemies explode).
  - 20MTD Frost Fire / Overload (burning + lightning = burst).
  - Hades Winter Harvest (chilled foes at 10% shatter and chill neighbours).
  - Hades Curse of Longing (status A keeps status B alive).
  - Hades Privileged Status (+damage vs 2+ statuses).
  - ND Vulnerability (applied by many families, read by all).
- **Evidence:**
  - Elemental chains "that read on screen" are 20MTD's top shared builds [P].
  - ND's "infinite DPS" engine is a cross-family status loop [P].
- **Failure mode:**
  - %max-HP effects dominate against scaling enemy HP. 20MTD nerfed Frostbite 35→15% and Shatter 25→10% [S].
  - Freeze became near-mandatory [P].
  - Bastion enemies gain +8% HP per wave, so the same risk applies.
- **For Bastion:** burn, chill/freeze, knockback and pull already exist, and Cryo+Rail Shatter is already a status-reading rule. Cards should make statuses **collide** (two statuses → an event) rather than add another %HP effect. Cap any execute effect and exclude bosses.

### 1.8 Bad event → payoff
- **Examples:**
  - ND shield break as trigger: Volatile Shields, Death Blossom.
  - VS Crimson Shroud (damage cap + retaliate).
  - 20MTD Soul Link (lose HP layer → screen nuke).
  - StS Medical Kit / Blue Candle (curses playable).
  - Brotato Blood Donation (self-damage as fuel).
  - Hades Lightning Rod (floor debris becomes turrets).
  - GUNBOAT-8 Lifebuoy.
- **Evidence:**
  - ND players describe losing a shield as a rhythm they want [P].
  - StS "liability becomes resource" relics are cited as build anchors [P].
- **For Bastion:** the native bad event is **a module detaching**. Bastion is the only studied game where losing a piece cuts others off. That makes debris the most Bastion-specific trigger available.
  - **Overlap warning:** "Sacrificial Plating", "Shock Barrier" and "Salvage Drones" were rejected. The evidence-backed difference is that the lost piece **keeps acting as itself** (Lifebuoy, Lightning Rod). A generic explosion or shockwave is not it.

### 1.9 Positional / adjacency
- **Examples:**
  - BB ★/◆ slot patterns: 57% of items reference them.
  - BB Spear (rewards **empty** cells).
  - BB Food (rewards **different** neighbour types).
  - BB Villain Sword (neighbours pay a cost).
  - BB Scale (balance two sides).
  - BB Engineer charges (buffs travel along a path).
  - BB bags (zone rules).
  - StS Gold-Plated Cables (the rightmost orb triggers twice).
  - HoloCure Solo (+% per empty slot).
  - GUNBOAT-8 Crow's Nest (tag-counted neighbours).
- **Evidence:**
  - BB players say the shop-phase tinkering *is* the game. A veteran said slots matter more than the item itself [P].
- **Dev lessons:**
  - Star count, not per-star value, is BB's main balance dial [S].
  - Continuous auras became start-of-battle snapshots for clarity [S].
  - "One neighbour counts once" is the most repeated confusion [P].
  - Empty-space rewards were narrowed except on the Spear line [S].
- **For Bastion:** the grid already has 3×3 auras (Reactor, Bulkhead) and edge pairs (Ember, Cryo). New positional cards should use the **shapes BB shows work** that Bastion lacks: distance from the core, a path or line, a centreline, distinct neighbours.
  - **Overlap warning:** "Edge Battery" and "Twin Link" were rejected. The StS lesson is to make one **crisp rule** ("the farthest module fires twice"), not a graded stat.

### 1.10 Movement / feel
- **Examples:**
  - ND Deadly Wake, Leviathan, Kinetic Boost, Celestial Lance (movement becomes damage).
  - Hades Cold Embrace (a turret beam aimed by your body position).
  - Hades Razor Shoals (damage while the foe moves).
  - HoloCure Stolen Piggy Bank v0.5 (income per distance flown, changed from per second).
  - HoloCure MiKorone (struck enemies drip lava as they walk).
- **Evidence:**
  - ND's highest-voted posts are "the ship is the weapon" builds [P].
  - The HoloCure dev turned a passive item into a movement item on purpose [S].
- **For Bastion:** the evidence favours a **visible new behaviour created by your flight path** (a trail, a sweep, a wake) over a speed-scaled percentage. Bastion's swarms mostly chase directly (`directChase`), so a path-based effect turns kiting loops into damage.

### 1.11 Economy, greed and contracts
- **Examples:**
  - Brotato Bait, Lure, Peacock (next-wave contracts with a forecast).
  - Brotato Piggy Bank (interest).
  - Hades Chaos (curse for N encounters, then a permanent blessing).
  - HoloCure Halu (opt-in difficulty for coins).
  - StS Black Star (elites drop 2 relics).
  - GUNBOAT-8 '!' nodes (double reward, harder fight).
- **Evidence:**
  - Chaos is called among the best value in Hades [P].
  - Bait's cost is also its reward [S].
- **Failure modes:**
  - HoloCure Halu's payout timing let players take the risk only at the end, so it was exploited instead of engaged [P].
  - Brotato had to remove Piggy Bank after wave 20 in Endless [S].
- **For Bastion:** the break is already a natural contract point. Pay out **per wave survived under the contract**, never at run end, and gate contracts to waves 1–20 so Endless stays unchanged.

### 1.12 Offer manipulation (meta-cards)
- **Examples:**
  - Hades Rare Crop / Exclusive Access (rarity climbs).
  - Brotato Goldfish (next reroll one tier higher).
  - 20MTD Specialize (the next pick applies ×3).
  - ND Ataraxia (banked points scale power).
  - ND Winnow/Regression (pool editing).
  - VS Silent Old Sanctuary (empty slots give power, plus extra rerolls).
- **Evidence:**
  - ND players say Ataraxia makes you "really evaluate every mod" [P].
  - Specialize creates memorable spikes, such as Stand your Ground tripled [P].
- **For Bastion:** these are cheap to build (UI and fold logic only) and make the pick screen itself a decision. They should stay at rare tier; they are not identity cards.

### 1.13 Allies / recruitment
- **Examples:**
  - GUNBOAT-8 recruits beaten bosses.
  - ND drones and Wingman.
  - Hades Lightning Rod turrets.
- **For Bastion:** the boss art exists, but **"Trophy Turret" was rejected**. Treat boss recruitment as low priority unless the user re-opens it.

---

## 2. Structural rules (how the whole system works)

Each rule is tied to evidence. Proposals in `proposals.md` assume these.

**R1. Two offer tiers: frequent small picks, rare milestone rule-changers.**

| Game | Frequent picks | Rule-changing picks |
|---|---|---|
| VS | ~100+ level-ups | 3 Arcanas (run start, 11:00, 21:00) |
| StS | many card/relic rewards | 2 boss relic choices (after Acts 1 and 2) |
| 20MTD | 20+ level-ups | 1 weapon evolution at level 20, boss tomes |
| BB | 18 shop rounds | 1 subclass Unique at round 8 |
| Hades | room boons | separate Hammer offer type |

All five keep rule-changers scarce, and that scarcity is what lets them be strong.
- **Bastion now:** ~19 equal picks, so a "unique" card at every break would be either weak or broken.
- **Recommendation:** commons and rares at normal breaks. A **Doctrine** offer (1 of 3, skippable, one free reroll) at the breaks after boss waves 5, 10 and 15: 3 per run, VS's cap.
- **Code:** `enterIntermission` already knows `isBossWave` and passes `guaranteeRare`, so the hook exists.

**R2. Earned cards enter the pool, and once earned they are guaranteed.**
- Evidence: 20MTD's dev rationale; the ND 1.0 Ataraxia guarantee; complaint threads in ND, Hades and VS.
- With 1-of-3 and ~19 picks, an eligible card at weight 1 among ~40 entries is seen only a few times per run [I].
- **Rule:** when a duo or recipe card becomes eligible, it takes one slot of the **next** offer.

**R3. Signpost recipes in the place where you act.**
- Evidence: HoloCure v0.6 collab list; BB's blue/yellow recipe line; VS evolution hints. All were added after opacity complaints.
- **Rule:**
  - Each card shows "Pairs with: <family icon>".
  - In Build, eligible pairs pulse.
  - Locked duos appear as silhouettes in a codex, as BB's recipe book does.

**R4. No dead offers.**
- Evidence: StS floor gates (Ectoplasm <18 and others); Brotato's 1.1.4 removal of 141 character–item pairs; GUNBOAT-8 Raiders on islandless runs; VS "most arcanas are useless".
- **Rule:** a card that names a family requires that family installed (and edge-adjacent, for duos). Drop economy cards in the last 3 waves. `cards.js` already has `requires`; extend it to adjacency predicates.

**R5. Bias toward what the player owns, without locking.**
- Evidence: VS's double check for owned items; Brotato tag weighting (5% per slot); Hades PriorityUpgrades.
- Bastion already doubles the weight of installed families (`INSTALLED_FAMILY_WEIGHT = 2`). Keep it.

**R6. Player control over the offer: reroll, skip with value, and later banish.**
- Evidence:
  - Banish and reroll are the most requested tools in 20MTD, VS and HoloCure [P].
  - VS skip keeps part of the XP [S].
  - ND banks skipped points [S].
- Bastion has a Matter reroll.
- **Add:** skip, refunding a little Matter or banking toward the next rarity (cheap to build). Banish charges can wait for Hangar meta work.

**R7. Drawbacks steer; they never attack the core verb or information.** See 1.5.

**R8. One sentence per card, with numbers and icons.**
- Evidence: Hades duos keep to a single sentence; ND's Viper rework ("wordy, convoluted"); BB memorisation complaints.
- Bastion ships in 16 languages, so short text also cuts translation cost.

**R9. Balance dials to expose as constants.**
- Neighbour count (BB star count).
- Shared caps instead of bans (BB Rope: 50% shared; Engineer cubes: −80% if already boosted).
- Boss caps on %HP effects: Brotato Giant Belt and Greek Fire do 10% to normal enemies, 1% to elites and bosses.
- Duo chance or guarantee: Hades tuned it in both directions.

**R10. Show triggers, counters and spent states.**
- Evidence: StS counter on the icon, trigger flash, greyed when spent (V2.0); Brotato Tardigrade's purple HP bar.
- **Rule:** active cards get a small HUD chip with a counter or spent state, plus reuse of existing VFX on trigger.

**R11. Rarity labels matter less than acquisition channel.**
- HoloCure shows rarity by channel: level-up, anvil, boss box, golden anvil, golden hammer [S].
- A Bastion card's "epic-ness" should come from **where** it is offered (a Doctrine break, an earned duo), not only from a colour.

---

## 3. What this means for the rejected list (honest check)

The rejected ideas failed mostly in two ways:
1. Conditional stats on flight state (Drift Gunnery, Momentum, Afterburner): pattern 1.2, the documented trap.
2. Single cards with no structure around them (Twin Link, Edge Battery, Firing Line, Superconductor, Napalm Warheads).

The evidence does not say adjacency or flight cards are bad. It says they need:
- a **visible new behaviour** (1.4, 1.10);
- a **gate and a guarantee** (R2);
- a place in a **two-tier cadence** (R1).

Overlaps are flagged per proposal in `proposals.md`.

---

## Second batch (2026-10-22): what it adds or confirms

Notes: `notes/cobalt-core.md`, `notes/balatro.md`, `notes/drg-survivor.md`, `notes/luck-be-a-landlord.md`.

**New patterns:**
- **P1.14 Predicate rewrite: change what *counts as* X.**
  - Examples: Balatro Four Fingers, Smeared, Pareidolia, Splash; DRG element conversion (Pan Fried Shells, Refrigerated Gunpowder).
  - These change definitions that many other cards read. LocalThunk called Four Fingers a "huge teachable moment" [S].
  - **For Bastion:** the cheapest unique cards available. Adjacency lives in 4–5 helpers in `game.js` (`countAdjacentType`, `hasCryoNeighbor`, `weaponCooldownRate`, `bulkheadReduction`, Ember ignition). Examples: "Ember ignites diagonally", "Cannons count as Cryo for adjacency".
  - **Risk:** the Balatro Pareidolia × The Plant trap. A "counts as" card makes a counter hit everything.
- **P1.15 Shape change.**
  - Examples: Cobalt Core Tridimensional Cockpit (a part becomes an empty hole, for half max hull); Hunter Wings (wings go empty while Energy is unspent).
  - The cost is what makes it a decision [S/I].
  - **For Bastion:** a tile that holds the grid together but can't be hit (it gets around detachment).
- **P1.16 Timed global adjacency.**
  - Example: LBAL Telescope / Protractor (all symbols count as adjacent for a window).
  - **For Bastion:** every N seconds all modules count as adjacent for a few seconds. It's telegraphed, so it rewards flying into the swarm on the beat.
- **P1.17 Copy a neighbour / a second firing point.**
  - Examples: Balatro Blueprint and Brainstorm (S+ on every tier list [P]); Cobalt Core Ares Cannon V2 ("Double Ares" stories [P]).
  - It doubles every per-shot combo without a "+%".
  - **Failure modes:** a hidden compatibility list (Blueprint's ~28 exceptions); multiplicative stacking.

**Confirmations (now multi-source):**
- **Lost pieces keep acting (P1.8):** GUNBOAT-8 Lifebuoy, Hades Lightning Rod, DRG Krakatoa Protocol / Disposable Tech / Tank Tracks, LBAL removal-as-weapon.
- **Concentrate vs spread forks (P1.9 / A5):** DRG The Favourite vs Sidearm (1.1 made both tags with their own synergies); LBAL Rusty Gear vs Ancient Lizard Blade; Brotato Focus vs Spider; BB Food.
- **Flat-% rares are the most criticised content** in DRG [P]; MK 11's +200% fire rate was cut to +25% [S]. This backs R1 (stat cards stay common).
- **Firing geometry beats numbers in auto-fire games:** DRG's best-loved Unstables (Helix, Omni Barrel, backwards copies) [P]. Changes in *where damage goes* are what players remember. It backs P1.4 and P1.10.
- **Count from run start, not from pick time:** Balatro Supernova / Fortune Teller vs late Spare Trousers [P]. Counters should count the whole run's history so late picks aren't dead (R10).
- **Instant break-glass payoffs become auto-wins:** LBAL had to nerf essences that paid out instantly [S]. One-shot cards need a real condition or delay.
- **Draft-side costs:** Cobalt Core Hi Freq Intercom, StS Busted Crown. Costs that hit the *offer* rather than combat are an accepted boss-pick shape (A6).
- **Avoid:**
  - Permanent or hidden punishment: Balatro The Arm, face-down draws [P].
  - Resets that punish your best play: Balatro Obelisk [P].
  - Six cards sharing one upside: Cobalt Core's "+1 Energy, but" set [I].
  - Unlock-by-usage gates: DRG removed them [S].
